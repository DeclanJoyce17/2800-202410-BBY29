//-----------------------------------------------------------------
// This is code is built with some help from the Groq Cloud API
// This code takes an audio stream from the user's microphone and send it to backend
// which handles Google Speech to Text processing

const recognition = new webkitSpeechRecognition(); // Initiates a webkitSpeechRecognition object
recognition.continuous = true;
recognition.interimResults = true;

// Set maximum transcription length
const MAX_TRANSCRIPT_LENGTH = 30000;

// The end point in backend that process the audio and initiates transcribing
const SERVER_URL = '/audio';

// Set the recognition language
recognition.lang = 'en-US';

// Tracks the state of the speech recognition.
let isSpeechRecognitionActive = false;

// Creates a new `AudioContext` or `webkitAudioContext` object, depending on the browser.
// Used for processing audio in JavaScript.
const context = new (window.AudioContext || window.webkitAudioContext)();

// This code is a function that is assigned to the `onresult` property of a speech recognition object. 
// When a speech recognition result is available, this function is called. It first initializes an empty string `text`. 
// It then iterates over the `results` array and concatenates the transcript of each result to the `text` string. 
// After that, it gets the `chat-question` element and sets its value to the first `MAX_TRANSCRIPT_LENGTH` characters of the `text` string.
recognition.onresult = (event) => {
    let text = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        text += result[0].transcript;
    }

    const chatQuestion = document.getElementById('chat-question');
    chatQuestion.value = text.substring(0, MAX_TRANSCRIPT_LENGTH);
};

function handleSpeechButtonClick() {
    if (!isSpeechRecognitionActive) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    if (context.state === 'suspended') { // Check the state of the content object 
        context.resume().then(() => { 
            recognition.start();

            // Styles the microphone icon
            document.getElementById('microphone').style.scale = '1.3';
            document.getElementById('microphone').style.opacity = '1';
            document.getElementById('chat-question').disabled = true;

            isSpeechRecognitionActive = true;
        });
    } else {
        recognition.start();
        document.getElementById('microphone').style.scale = '1.5';
        document.getElementById('chat-question').disabled = true;
        isSpeechRecognitionActive = true;
    }
}

function stopRecording() {
    recognition.stop();
    document.getElementById('microphone').style.scale = "1";
    document.getElementById('microphone').style.opacity = '0.6';
    document.getElementById('chat-question').disabled = false;
    isSpeechRecognitionActive = false;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('microphone').addEventListener('click', handleSpeechButtonClick);
});