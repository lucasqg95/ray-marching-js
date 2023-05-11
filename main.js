import "./styles.css";
import * as THREE from "three";
import { vertex, fragment } from "./shaders";

let camera, scene, renderer, clock;
let uniforms;

function init() {
  const container = document.getElementById("main");

  clock = new THREE.Clock();
  camera = new THREE.Camera();
  camera.position.z = 1;

  scene = new THREE.Scene();

  const geometry = new THREE.PlaneBufferGeometry(2, 2);

  uniforms = {
    u_time: { type: "f", value: 1.0 },
    u_resolution: { type: "v2", value: new THREE.Vector2() },
    u_mouse: { type: "v2", value: new THREE.Vector2() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  console.log(renderer.domElement.width);
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.resolution.value.x = renderer.domElement.width;
  uniforms.resolution.value.y = renderer.domElement.height;
}

function render() {
  uniforms.u_time.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}

function animate() {
  render();
  requestAnimationFrame(animate);
}

init();
animate();

document.onmousemove = function (e) {
  uniforms.u_mouse.value.x = e.pageX;
  uniforms.u_mouse.value.y = e.pageY;
};
