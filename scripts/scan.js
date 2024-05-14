//-------------------------------------------------------------------------------------------
// Part of this code block is provided by the Avaturn SDK Libraries

import { AvaturnSDK } from "https://cdn.jsdelivr.net/npm/@avaturn/sdk/dist/index.js";

const avaturnContainer = document.getElementById("avaturn-sdk-container");
const captureButton = document.getElementById("capture-button");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("camera-feed");

let captureStream;

async function loadAvaturn() {
    const url = `https://demo.avaturn.dev`;
    const sdk = new AvaturnSDK();

    await sdk.init(avaturnContainer, { url, iframeClassName: "avaturn-iframe" });

    sdk.on("export", (data) => {
        alert(
            "[callback] Avatar exported. See logs to explore the returned data."
        );
        console.log(data);
    });
}

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
    
    const dataURL = canvas.toDataURL("image/png");
    sendToAvaturnApi(dataURL);
});

async function sendToAvaturnApi(image) {
    try {
        const response = await fetch('https://demo.avaturn.dev/api/avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image })
        });

        if (!response.ok) {
            throw new Error(`Error! Status: ${response.status}`);
        }

        const data = await response.json();
        sdk.import(data);
    } catch (error) {
        console.error("Error:", error);
    }
}

getCameraStream();

const sdk = {
    import: (data) => {
        // Implement the import method if required.
        console.log("Avatar imported:", data);
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAvaturn);
} else {
    loadAvaturn();
}

window.loadAvaturn = loadAvaturn;
