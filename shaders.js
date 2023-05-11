const glsl = (x) => x[0];

export const vertex = glsl`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

export const fragment = glsl`
  precision highp float;

  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;

  varying vec2 vUv;

  float fOpUnionRound(float a, float b, float r) {
    vec2 u = max(vec2(r - a,r - b), vec2(0));
    return max(r, min (a, b)) - length(u);
  }

  float sdPlane(vec3 p) {
    return p.y;
  }
  
  float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, 0.0)) - 0.1;
  }

  vec2 map(vec3 pos) {
    float deformation = 0.0007 * distance(pos, vec3(0.0, vec2(u_mouse.x, 0.0)));
    float normalizedHeight = (u_mouse.y + 1.0) / 2.0;
    float maxBoxHeight = 0.004;
    float s = 0.25 + deformation;
    vec2 res = vec2(fOpUnionRound(
      sdPlane(pos),
      min(min(min(min(min(min(min(
        sdBox( pos-vec3(-1.0, -0.1 + normalizedHeight * maxBoxHeight * 0.45 * sin(u_time+0.), 0.0), vec3(s)),
        sdBox( pos-vec3(-0.5, -0.1 + normalizedHeight * maxBoxHeight * 0.45 * sin(u_time+1.),-0.866025), vec3(s))),
        sdBox( pos-vec3(-0.5, -0.1 + normalizedHeight * maxBoxHeight * 0.45 * sin(u_time+3.),-0.866025), vec3(s))),
        sdBox( pos-vec3(-0.5, -0.1 + normalizedHeight * maxBoxHeight * 0.45 * sin(u_time+4.),-0.866025), vec3(s) )),
        sdBox( pos-vec3( 0.5, -0.1 + normalizedHeight * maxBoxHeight * 0.45 * sin(u_time+5.),-0.866025), vec3(s) )),
        sdBox( pos-vec3( 1.0, -0.1 + normalizedHeight * maxBoxHeight * 0.45 * sin(u_time+6.), 0.0), vec3(s) )),
        sdBox( pos-vec3( 0.5, -0.1 + normalizedHeight * maxBoxHeight * 0.45 * sin(u_time+7.), 0.866025), vec3(s) )),
        sdBox( pos-vec3(-0.5, -0.1 + normalizedHeight * maxBoxHeight * 0.45 * sin(u_time+8.), 0.866025), vec3(s) )
      ),
      0.2
    ), 155.0);
    return res;
  }

  vec2 castRay(vec3 ro, vec3 rd) {
    float tmin = 1.0;
    float tmax = 20.0;

    // bounding volume
    float tp1 = (0.0-ro.y)/rd.y;
    if( tp1>0.0 ) tmax = min( tmax, tp1 );
    float tp2 = (1.6-ro.y)/rd.y;
    if( tp2>0.0 ) {
      if( ro.y>1.6 ) tmin = max( tmin, tp2 );
      else           tmax = min( tmax, tp2 );
    }

    float t = tmin;
    float m = -1.0;
    for(int i=0; i<64; i++) {
      float precis = 0.0005*t;
      vec2 res = map( ro+rd*t );
      if( res.x<precis || t>tmax ) break;
      t += res.x;
      m = res.y;
    }

    if( t>tmax ) m=-1.0;
    return vec2( t, m );
  }

  float softshadow(vec3 ro, vec3 rd, float mint, float tmax) {
    float res = 1.0;
    float t = mint;
    for(int i=0; i<16; i++) {
      float h = map( ro + rd*t ).x;
      res = min( res, 8.0*h/t );
      t += clamp( h, 0.02, 0.10 );
      if( h<0.001 || t>tmax ) break;
    }
    return clamp( res, 0.0, 1.0 );
  }

  vec3 calcNormal(vec3 pos ) {
    vec2 e = vec2(1.0,-1.0)*0.5773*0.0005;
    return normalize( e.xyy*map( pos + e.xyy ).x + e.yyx*map( pos + e.yyx ).x + e.yxy*map( pos + e.yxy ).x + e.xxx*map( pos + e.xxx ).x );
  }

  float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for(int i=0; i<5; i++) {
      float hr = 0.01 + 0.12*float(i)/4.0;
      vec3 aopos =  nor * hr + pos;
      float dd = map( aopos ).x;
      occ += -(dd-hr)*sca;
      sca *= 0.95;
    }
    return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );
  }

  vec3 palette(float t) {
    return vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(2.,1.,0.)*t+vec3(0.5,0.2,0.25)) );
  }

  vec3 render(vec3 ro, vec3 rd ) { 
    vec3 col = vec3(0.7, 0.9, 1.0) + rd.y*0.8;
    vec2 res = castRay(ro,rd);
    float t = res.x;
    float m = res.y;
    if( m>-0.5 ) {
      vec3 pos = ro + t*rd;
      vec3 nor = calcNormal( pos );
      vec3 ref = reflect( rd, nor );

      // material
      col = palette(fract(0.05*u_time));

      // lighting
      float occ = calcAO( pos, nor );
      vec3  lig = normalize( vec3(-0.4, 0.7, -0.6) );
      float amb = clamp( 0.5+0.5*nor.y, 0.0, 1.0 );
      float dif = clamp( dot( nor, lig ), 0.0, 1.0 );
      float bac = clamp( dot( nor, normalize(vec3(-lig.x,0.0,-lig.z))), 0.0, 1.0 )*clamp( 1.0-pos.y,0.0,1.0);
      float dom = smoothstep( -0.1, 0.1, ref.y );
      float fre = pow( clamp(1.0+dot(nor,rd),0.0,1.0), 2.0 );
      float spe = pow(clamp( dot( ref, lig ), 0.0, 1.0 ),16.0);

      vec3 lin = vec3(0.0);
      lin += 1.30*dif*vec3(1.00,0.80,0.55);
      lin += 0.40*amb*vec3(0.40,0.60,1.00)*occ;
      lin += 0.50*bac*vec3(0.25,0.25,0.25)*occ;
      lin += 0.25*fre*vec3(1.00,1.00,1.00)*occ;
      col = col*lin;

      col = mix( col, vec3(0.8,0.9,1.0), 1.0-exp( -0.0002*t*t*t ) );
    }

    return vec3( clamp(col,0.0,1.0) );
  }

  float zoomFactor(float t) {
    float freq = 0.9; // frequência do zoom
    float amp = 0.2; // amplitude do zoom
    return 0.7 + amp * sin(t * freq);
} 

  mat3 setCamera(vec3 ro, vec3 ta, float cr, float scale) {
    vec3 cw = normalize(ta-ro);
    vec3 cp = vec3(sin(cr), cos(cr),0.0);
    vec3 cu = normalize( cross(cw,cp) );
    vec3 cv = normalize( cross(cu,cw) );
    mat3 cam = mat3( cu, cv, cw );
    cam[2] *= scale; // aplica a escala ao vetor cw
    return cam;
}

  void main(void) {
    vec3 tot = vec3(0.0);

      vec2 p = vUv - 0.5;

      // camera
      vec3 ro = vec3( -0.5+4.0*cos(0.3*u_time), 4.0, 2.5+4.0*sin(0.3*u_time) );
      vec3 ta = vec3( -0.5, -0.4, 0.5 );
      // camera-to-world transformation

      float scale = zoomFactor(u_time);
      mat3 ca = setCamera(ro, ta, 0.0, scale);
      // ray direction
      vec3 rd = ca * normalize( vec3(p.xy,2.0) );

      // render
      vec3 col = render( ro, rd );

      // gamma
      col = pow( col, vec3(0.4545) );

      tot += col;

      gl_FragColor = vec4(tot, 1.0);
  }
`;
