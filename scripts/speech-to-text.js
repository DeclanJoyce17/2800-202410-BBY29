const { SpeechClient } = require('@google-cloud/speech');

const client = new SpeechClient();

async function recognize(audioBuffer) {
  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
  };

  const [response] = await client.recognize({
    config,
    audio: Buffer.from(audioBuffer), // Use Buffer.from() to create a Buffer object
  });

  return response.results[0].alternatives[0].transcript;
}

// ...

const transcription = await recognize(audioBuffer);
console.log(`Transcription: ${transcription}`);