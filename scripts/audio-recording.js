// Get the WebSocket connection
async function getWebSocketConnection() {
  try {
    const response = await fetch('/socket');
    const data = await response.text();
    const io = JSON.parse(data);
    return io;
  } catch (error) {
    console.error('Error getting WebSocket connection:', error);
  }
}

// Start recording
async function startRecording() {
  try {
    // Get the WebSocket connection
    const io = await getWebSocketConnection();

    // Start the Web Audio API
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        // Create a MediaStreamTrack for the audio stream
        const audioTrack = stream.getAudioTracks()[0];

        // Start recording and send the audio stream to the server
        const recorder = new WebSocketRecorder(io, audioTrack, 16000);

        recorder.start();

        // Output the transcription results
        io.on('transcription', (transcription) => {
          console.log(`Transcription: ${transcription}`);
        });
      })
      .catch((error) => {
        console.error('Error recording audio:', error);
      });
  } catch (error) {
    console.error('Error getting WebSocket connection:', error);
  }
}

// Event listener to start recording when the button is clicked
document.getElementById('microphone').addEventListener('click', startRecording);

// Create a function to display the WebSocket connection
function displayWebSocketConnection(ws) {
  console.log(`WebSocket connection established: ${ws}`);
}

// Create a WebSocketRecorder class to send the audio stream to the server
class WebSocketRecorder {
  constructor(socket, audioTrack, sampleRateHertz) {
    this.socket = socket;
    this.audioTrack = audioTrack;
    this.sampleRateHertz = sampleRateHertz;
    this.mediaStream = new MediaStream();
  }

  start() {
    this.audioTrack.start();
  }
}

// Create a function to display the transcription result
function displayTranscription(transcription) {
  console.log(`Transcription: ${transcription}`);
}