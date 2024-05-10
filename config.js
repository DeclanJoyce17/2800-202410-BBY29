
"use strict";
require('dotenv').config();
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const express = require('express');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 3000;

const wss = new WebSocket.Server({ server: server });

app.use("/scripts", express.static("./scripts"));
app.use('/html', express.static('./html'));
app.use('/img', express.static('./img'));
app.use('/styles', express.static('./styles'));
app.use('/text', express.static('./text'));

app.use(express.urlencoded({ extended: true })); // Middleware to parse form data

//---------------------------------------------------
// This code is provided by the Groq API library with
// modification for our own project
//---------------------------------------------------
const Groq = require("groq-sdk");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.get('/', (req, res) => {
  let doc = fs.readFileSync("./html/index.html", "utf8");
  res.send(doc);
});

app.get('/login', (req, res) => {
  let doc = fs.readFileSync('./html/login.html', 'utf8');
  res.send(doc);
});

app.get('/main', (req, res) => {
  let doc = fs.readFileSync('./html/main.html', 'utf8');
  res.send(doc);
});

app.get('/aichat-config', (req, res) => {
  let doc = fs.readFileSync("./html/aichat-config.html", "utf8");
  res.send(doc);
});

app.get('/profile', (req, res) => {
  let doc = fs.readFileSync('./html/profile.html', 'utf8');
  res.send(doc);
});

app.get('/map', (req, res) => {
  let doc = fs.readFileSync('./html/map.html', 'utf8');
  res.send(doc);
});

app.get('/aichat-home', (req, res) => {
  let doc = fs.readFileSync('./html/aichat-home.html', 'utf8');
  res.send(doc);
});

app.get('/aichat-loading', (req, res) => {
  let doc = fs.readFileSync('./html/aichat-loading.html', 'utf8');
  res.send(doc);
});

app.get('/aichat-log', (req, res) => {
  let doc = fs.readFileSync('./html/aichat-log.html', 'utf8');
  res.send(doc);
});



app.post('/GroqChatCompletion', async (req, res) => {

  const userInput = req.body.question;
  try {
    const chatCompletion = await getGroqChatCompletion(userInput);
    res.header('Access-Control-Allow-Origin', '*');
    res.json({
      message: chatCompletion.choices[0]?.message?.content,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


async function getGroqChatCompletion(userInput) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: userInput
      }
    ],
    model: "mixtral-8x7b-32768"
  });
}

// Define a function to process the audio stream
function processAudioStream(audioData) {
  // Create a recognize stream
  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
    interimResults: false,
  };

  // Create a recognize stream
  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error)
    .on('data', data =>
      // Output the transcription results
      process.stdout.write(
        data.results[0] && data.results[0].alternatives[0]
          ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
          : '\n\nReached transcription time limit, press Ctrl+C\n'
      )
    );

  // Pipe the audio stream to the recognize stream
  audioData.pipe(recognizeStream);
}

// Handle WebSocket connection
io.on('connection', (socket) => {
  // Listen for audio stream data from the client
  socket.on('audioData', (audioData) => {
    processAudioStream(audioData);
  });
});

app.get('/socket', (req, res) => {
  res.send(JSON.stringify({ io: io }));
});

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Handle incoming messages from the client
  ws.on('message', (message) => {
    console.log(`Received message => ${message}`);
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

app.listen(port, () => {
  console.log("Node appplication listening on port " + port);
});

