//==================================================================================================
// Part of this code is built with help from Chat GPT 3.5 and Groq Cloud API - drawing functions
// Credit: https://editor.p5js.org/codingtrain/sketches/T7UDm7dBP

let detector;
let poses;
let video;
let canvas;

// This is provided by MoveNet API to initialize the pretrained model for pose prediction
async function init() {
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  };
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);

}


video = document.getElementById("camera-feed");

async function getCameraStream() {
  try {
    captureStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = captureStream;
    document.getElementById("camera-feed").srcObject = captureStream;
  } catch (error) {
    console.error("Error: Could not access the camera.", error);
  }
}

async function videoReady() {
  console.log("video ready");
  await getPoses();
}

async function setup() {

  canvas = createCanvas(640, 480);
  video = createCapture(VIDEO, videoReady);
  video.size(256, 144);
  video.hide();
  await init();
}

function draw() {
  if (poses) {
    drawPoses(poses);
  }
}

function videoReady() {
  console.log("video ready");
  getPoses();
}

async function getPoses() {
  await init();
  poses = await detector.estimatePoses(video.elt);
  console.log(poses);
  setTimeout(getPoses, 0);
}

function drawPoses(poses) {
  // Draw video feed

  image(video, 0, 0, width, height);

  // Draw poses
  for (let i = 0; i < poses.length; i++) {
    let keypoints = poses[i].keypoints;

    // Draw keypoints if defined
    if (keypoints) {
      // Draw keypoints
      for (let j = 0; j < keypoints.length; j++) {
        let keypoint = keypoints[j];
        if (keypoint.score > 0.35) { // Only draw if accuracy point is above 0.35
          fill(255, 255, 255);
          // stroke();
          ellipse(keypoint.x, keypoint.y, 10, 10); // Access x and y properties directly
        }
      }
    }
    // Draw lines connecting the face
    drawFaceLines(keypoints);

    // Draw lines connecting the body
    drawBodyLines(keypoints);
  }
}

function drawFaceLines(keypoints) {
  let leftEar = keypoints.find(keypoint => keypoint.name === 'left_ear');
  let leftEye = keypoints.find(keypoint => keypoint.name === 'left_eye');
  let nose = keypoints.find(keypoint => keypoint.name === 'nose');
  let rightEye = keypoints.find(keypoint => keypoint.name === 'right_eye');
  let rightEar = keypoints.find(keypoint => keypoint.name === 'right_ear');

  if (leftEar && leftEye && nose && rightEye && rightEar) {
    stroke(255, 255, 255); // Red color for the face lines
    strokeWeight(2);
    line(leftEar.x, leftEar.y, leftEye.x, leftEye.y);
    line(leftEye.x, leftEye.y, nose.x, nose.y);
    line(nose.x, nose.y, rightEye.x, rightEye.y);
    line(rightEye.x, rightEye.y, rightEar.x, rightEar.y);
  }
}

function drawBodyLines(keypoints) {
  // Get all keypoints with scores greater than 0.35
  let highScoreKeypoints = keypoints.filter(keypoint => keypoint.score > 0.35);

  // Define the connections between keypoints
  const connections = [
    ['left_ear', 'left_eye'],
    ['left_eye', 'nose'],
    ['nose', 'right_eye'],
    ['right_eye', 'right_ear'],
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'],
    ['right_shoulder', 'right_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['right_hip', 'left_hip'],
    ['left_hip', 'left_knee'],
    ['right_hip', 'right_knee'],
    ['left_knee', 'left_ankle'],
    ['right_knee', 'right_ankle']
  ];

  stroke(0, 255, 0); // Green color for the lines
  strokeWeight(2); // Set the width of the lines

  // Draw lines between connected keypoints
  for (let connection of connections) {
    let [keypoint1, keypoint2] = connection;
    let kp1 = highScoreKeypoints.find(kp => kp.name === keypoint1);
    let kp2 = highScoreKeypoints.find(kp => kp.name === keypoint2);
    if (kp1 && kp2) {
      line(kp1.x, kp1.y, kp2.x, kp2.y);
    }
  }
}

// Display the instruction for todo tasks on main page
document.addEventListener('DOMContentLoaded', () => {

  document.body.appendChild(document.getElementById('footer'));
  // Function to handle appending the instructionDiv

  const handleMainAvailable = () => {
    const main = document.querySelector('main');
    const instructionDiv = document.querySelector('#instruction');
    const todoInst = JSON.parse(localStorage.getItem('responseData'));
    const mediaDisplay = document.querySelector('#media-display');

    if (main && instructionDiv && todoInst) {
      console.log('main', main);
      console.log('ins', instructionDiv);
      console.log('todo task', todoInst);

      document.getElementById('instruction-text').innerHTML = todoInst.replace(/\n/g, '<br>');
      main.appendChild(mediaDisplay);
      main.appendChild(instructionDiv);
      mediaDisplay.classList.remove('hidden');
      
      // Disconnect the observer once the main element is found and handled
      observer.disconnect();
    }
  };

  // This code is written by chatGPT to achieve the desired result above
  // Create an observer to watch for changes in the DOM
  const observer = new MutationObserver(() => {
    if (document.querySelector('main')) {
      handleMainAvailable();
    }
  });

  // Start observing the document body for added nodes
  observer.observe(document.body, { childList: true, subtree: true });

  const backBtn = document.getElementById('go-back');
backBtn.addEventListener('click', () => {
  console.log('click');
  window.history.back();
})
});

