const express = require('express');
const {SpeechClient} = require('@google-cloud/speech');
const {spawn} = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const speechClient = new SpeechClient();

app.get('/', (req, res) => {
  let doc = fs.readFileSync("./html/audio-streaming.html", "utf8");

  // send the text stream
  res.send(doc);
})

app.post('/transcribe', async (req, res) => {
  const audioStream = req.pipe(require('stream'));

  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
    audio: {
      content: audioStream,
    },
  };

  const [response] = await speechClient.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');

  res.json({transcription});
});

app.post('/audio', (req, res) => {
  const audioStream = req.pipe(fs.createWriteStream('audio.wav'));

  audioStream.on('finish', () => {
    console.log('Received audio data, initiating transcription.');
    getTranscription();
  });

  res.json({status: 'received'});
});

function getTranscription() {
  const audioStream = fs.createReadStream('audio.wav');

  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
    audio: {
      content: audioStream,
    },
  };

  speechClient.recognize(request)
    .then(data => {
      const transcription = data[0].results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      console.log(`Transcription: ${transcription}`);
    })
    .catch(err => {
      console.error('Error occurred:', err);
    });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});