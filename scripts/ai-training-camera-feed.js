const captureButton = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("camera-feed");

let captureStream;

async function getCameraStream() {
    try {
        captureStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = captureStream;
        document.getElementById("camera-feed").srcObject = captureStream;
        captureButton.disabled = false;
    } catch (error) {
        console.error("Error: Could not access the camera.", error);
    }
}

captureButton.addEventListener("click", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
});

getCameraStream();

// Check the selected video state on page load
const selectedVideo = sessionStorage.getItem('selectedVideo');
document.getElementById('camera').addEventListener('click', () => {
  console.log('clicked');
if (selectedVideo) {
  // Redirect to the appropriate scanning page
  if (selectedVideo === 'female') {
    window.location.href = "/ai-training-female-body-scan";
  } else if (selectedVideo === 'male') {
    window.location.href = "/ai-training-male-body-scan";
  }
}
});