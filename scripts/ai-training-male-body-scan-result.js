//--------------------------------------------------------------------------------------
// Credit: https://github.com/gjmolter/web-3dmodel-threejs
// This code has been modified for our project

//Import the THREE.js library
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
// To allow for the camera to move around the scene
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
// To allow for importing the .gltf file
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

//Create a Three.JS Scene
const scene = new THREE.Scene();
//create a new camera with positions and angles
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

//Keep track of the mouse position, so we can make the eye move
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

//Keep the 3D object on a global variable so we can access it later
let object;

//OrbitControls allow the camera to move around the scene
let controls;

//Set which object to render
let objToRender = 'male-body';

//Instantiate a loader for the .gltf file
const loader = new GLTFLoader();

//Load the file
loader.load(
  `img/male-body-scan-result.glb`,
  function (gltf) {
    //If the file is loaded, add it to the scene
    object = gltf.scene;
    object.scale.set(100, 100, 100); // Adjust the numbers according to your need (100 is suggested based on a typical issue in which models render at 1% of their size)
    scene.add(object);
  },
  function (xhr) {
    //While it is loading, log the progress
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function (error) {
    //If there is an error, log it
    console.error(error);
  }
);

//Instantiate a new renderer and set its size
const renderer = new THREE.WebGLRenderer({ alpha: true }); //Alpha: true allows for the transparent background
renderer.setSize(window.innerWidth, window.innerHeight);

//Add the renderer to the DOM
document.getElementById("container3D").appendChild(renderer.domElement);

//Set how far the camera will be from the 3D model
camera.position.z = 350;

//Add lights to the scene, so we can actually see the 3D model
const topLight = new THREE.DirectionalLight(0xffffff, 1); // (color, intensity)
topLight.position.set(1000, 1000, 1000) //top-left-ish
topLight.castShadow = true;
const rightLight = new THREE.DirectionalLight(0x888888, 2);
rightLight.position.set(-1000, 1000, -1000);
rightLight.castShadow = true;
scene.add(topLight, rightLight);

const ambientLight = new THREE.AmbientLight(0x333333, 50);
scene.add(ambientLight);

//This adds controls to the camera, so we can rotate / zoom it with the mouse
controls = new OrbitControls(camera, renderer.domElement);

//Render the scene
function animate() {
  requestAnimationFrame(animate);
  //Here we could add some code to update the scene, adding some automatic movement

  //   Make the eye move
  if (object && objToRender === "male-body") {
    //I've played with the constants here until it looked good 
    object.rotation.y = -3 + mouseX / window.innerWidth * 3;
    object.rotation.x = -1.2 + mouseY * 2.5 / window.innerHeight;
  }
  renderer.render(scene, camera);
}

//Add a listener to the window, so we can resize the window and the camera
window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

//add mouse position listener, so we can make the eye move
document.onmousemove = (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

//Start the 3D rendering
animate();

const continueButton = document.getElementById('continue-ctn');
continueButton.addEventListener('click', () => {
  window.location.href = '/ai-training-recommendation';
});

// Display the metrics section
const metricsContainer = document.getElementById("scan-metrics");
const height = document.getElementById("height");
const weight = document.getElementById("weight");
const bmi = document.getElementById("bmi");
const musMass = document.getElementById("muscle-mass");

// Set initial opacity and display properties for each child div
height.style.transition = "opacity 0.5s ease";
height.style.opacity = 0;
height.style.display = "block";

weight.style.transition = "opacity 0.5s ease";
weight.style.opacity = 0;
weight.style.display = "block";

bmi.style.transition = "opacity 0.5s ease";
bmi.style.opacity = 0;
bmi.style.display = "block";

musMass.style.transition = "opacity 0.5s ease";
musMass.style.opacity = 0;
musMass.style.display = "block";

const metrics = [height, weight, bmi, musMass];

function fadeIn(element) {
  element.style.opacity = 1;
}

setTimeout(() => {
  metricsContainer.style.display = "block";
  fadeIn(metricsContainer);
  let delay = 0;
  metrics.forEach((metric, index) => {
    setTimeout(() => {
      fadeIn(metric);
    }, delay + (index + 1) * 500);
  });
}, 500);