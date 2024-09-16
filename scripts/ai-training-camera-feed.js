const captureButton = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("camera-feed");

let captureStream;

async function getCameraStream() {
	try {
		captureStream = await navigator.mediaDevices.getUserMedia({
			video: { facingMode: "environment" },
		});
		video.srcObject = captureStream;
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
const selectedVideo = sessionStorage.getItem("selectedVideo");
document.getElementById("camera").addEventListener("click", () => {
	console.log("clicked");
	if (selectedVideo) {
		// Redirect to the appropriate scanning page
		if (selectedVideo === "female") {
			window.location.href = "/ai-training-female-body-scan";
		} else if (selectedVideo === "male") {
			window.location.href = "/ai-training-male-body-scan";
		}
	}
});

// Style the text animation
const instructionDiv = document.getElementById("instruction");
const instructions = Array.from(document.getElementsByClassName("text"));

function fadeOut(element, index) {
	element.style.opacity = 1;
	element.style.transition = "opacity 1s ease";
	setTimeout(() => {
		element.style.opacity = 0;
	}, 3000);
}

function displayInstructions() {
	instructions.forEach((instruction, index) => {
		setTimeout(() => {
			fadeOut(instruction, index);
			if (index === instruction.length - 1) {
				setTimeout(() => {
					instructionDiv.style.display = "none";
				}, 6000);
			}
		}, 3000 * (index + 1));
	});

	setInterval(() => {
		displayInstructions();
	}, 15000);
}

displayInstructions();

// Skip scanning and redirect to the recommendation
const skipBtn = document.getElementById("skip");
skipBtn.addEventListener("click", () => {
	window.location.href = "/ai-training-recommendation";
});

const backBtn = document.getElementById("go-back");
backBtn.addEventListener("click", () => {
	window.location.href = "ai-training-scan-request";
});

const backdBtn = document.getElementById("go-back-con");
bacdkBtn.addEventListener("click", () => {
	window.location.href = "ai-training-scan-request";
});
