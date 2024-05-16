"use strict";
// Load environment variables from .env file
require('dotenv').config();
const fs = require("fs");
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { MongoClient, GridFSBucket } = require('mongodb');
const path = require('path');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const multer = require('multer');
const {SpeechClient} = require('@google-cloud/speech');
const {spawn} = require('child_process');
const sharp = require('sharp');
const axios = require('axios');

require("./utils.js");

const app = express();
const expireTime = 60 * 60 * 1000;
app.set('view engine', 'ejs')


// Load environment variables from .env file
require('dotenv').config();

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;
const nodeSessionSecret = process.env.NODE_SESSION_SECRET;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // Middleware to parse form data
// first, store files in memory as Buffer objects by using multer
const storage = multer.memoryStorage()
// telling multer to use the previously defined memory storage for storing the files.
const upload = multer({ storage: storage });
//to use EJS to render our ejs files as HTML
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/************ uploading images ****************/

let db, bucket;
// Initialize MongoDB and GridFS
// ensuring that the MongoDB connection 
// and GridFS initialization are completed before proceeding further.
async function initMongoDB() {
	const client = new MongoClient(mongoUri);
	try {
		await client.connect();
		db = client.db('BBY29');
		bucket = new GridFSBucket(db, { bucketName: 'profileImg' });
		console.log('Connected to MongoDB and GridFS initialized!');
	} catch (err) {
		console.error("Connection error:", err);
		process.exit(1);
	}
}
initMongoDB();

// Save image to MongoDB using GridFS
async function saveImageToMongoDB(fileBuffer, contentType, filename) {
	try {
		const uploadStream = bucket.openUploadStream(filename, { metadata: { contentType } });
		uploadStream.write(fileBuffer);
		uploadStream.end();
		return new Promise((resolve, reject) => {
			uploadStream.on('finish', () => resolve(uploadStream.id));
			uploadStream.on('error', (error) => {
				console.error('Failed to save image:', error);
				reject(error);
			});
		});
	} catch (error) {
		console.error('Failed to save image:', error);
		throw error;
	}
}

// Express route to get an image by filename
app.get('/images/:filename', async (req, res) => {
	try {
		// Assuming 'userId' is the key where the user ID is stored in the session
		const userId = req.session.userId;
		const downloadStream = bucket.openDownloadStreamByName(req.params.filename);

		// Set the proper content type before sending the stream
		downloadStream.on('file', (file) => {
			res.type(file.contentType);
		});
		// Pipe the image data to the response
		downloadStream.pipe(res);
	} catch (error) {
		console.error('Failed to retrieve image:', error);
		res.status(404).send('Image not found');
	}
});

// Route to upload images
app.post('/upload', upload.single('image'), async (req, res) => {
	if (!req.file) {
		return res.status(400).send('No file uploaded.');
	}
	try {
		const filename = req.file.originalname;
		const fileId = await saveImageToMongoDB(req.file.buffer, req.file.mimetype, filename);
		res.send(`Image uploaded successfully with ID: ${fileId}`);
	} catch (error) {
		console.error('Upload error:', error);
		res.status(500).send(`Failed to upload image: ${error.message}`);
	}
});

/*********** connecting mongo ***************/


const taskBank = ["Do 20 pushups", "Do 40 situps", "Do 60 squats", "Do 20 crunches", "Do 10 burpees",
	"Plank for 1.5 minute", "Do 60 jumping jacks", "Run 1 kilometers", "Hold a L sit for 15 seconds", "Hold wallsit for 1 minute",
	"30 seconds of non-stop mountain climbers", "30 tricep dips"];

//if ur wondering why everything is inside this async connect-mongo call, blame davin, but at the same time it works?

async function connectToMongo() {
	const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });


	try {
		await client.connect();
		console.log('Connected to MongoDB!');

		const db = client.db('BBY29');

		// Configure session middleware
		app.use(session({
			secret: nodeSessionSecret,
			resave: false,
			saveUninitialized: false,
			store: MongoStore.create({
				mongoUrl: mongoUri,
				dbName: 'BBY29',
				crypto: {
					secret: nodeSessionSecret,
					algorithm: 'aes-256-cbc',
					hash: {
						algorithm: 'sha256',
						iterations: 1000,
					},
				},
			}),
			cookie: {
				maxAge: 1 * 60 * 60 * 1000 // Session expiration (1 hour)
			}
		}));



		app.use("/scripts", express.static("./scripts"));
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


		//Valid Session Function
		function isValidSession(req) {
			if (req.session.authenticated) {
				return true;
			}
			return false;
		}

		//Session Validation Middleware
		function sessionValidation(req, res, next) {
			if (isValidSession(req)) {
				next();
			}
			else {
				res.redirect('/login');
			}
		}

		//Index Page
		app.get('/', (req, res) => {
			if (req.session.authenticated) {
				res.redirect('/main');
			}
			else {
				res.render('index');
			}
		});

		//Sign up page
		app.get('/signup', (req, res) => {
			if (req.session.authenticated) {
				res.redirect('/main');
			}
			else {
				res.render('signup');
			}
		});

		//FitTasks Page
		app.get('/fitTasks', sessionValidation, async (req, res) => {
			var point = req.session.points;
			const usersCollection = db.collection('users');
			const result = await usersCollection.find({ email: req.session.email }).project({ email: 1, username: 1, password: 1, points: 1, _id: 1, fitTasks: 1 }).toArray();
			res.render('fitTasks', { points: point, task1: result[0].fitTasks[0], task2: result[0].fitTasks[1], task3: result[0].fitTasks[2] });
		});
		//Signup POST
		app.post('/signup', async (req, res) => {


			const usersCollection = db.collection('users');
			var username = req.body.username;
			var email = req.body.email;
			var password = req.body.password;

			if (username.length == 0 || username == null) {
				res.send(`Name is required. <br> <a href='/signup'>Try Again</a>`);
				return;
			}
			else if (email.length == 0 || email == null) {
				res.send(`Email is required. <br> <a href='/signup'>Try Again</a>`);
				return;
			}
			else if (password.length == 0 || password == null) {
				res.send(`Password is required. <br> <a href='/signup'>Try Again</a>`);
				return;
			}

			const d = new Date();
			var time = d.getTime();
			const schema = Joi.object(
				{
					username: Joi.string().alphanum().max(20).required(),
					email: Joi.string().max(35).required(),
					password: Joi.string().max(20).required()
				});

			const validationResult = schema.validate({ username, email, password });
			if (validationResult.error != null) {
				console.log(validationResult.error);
				res.redirect("/signup");
				return;
			}

			var hashedPassword = await bcrypt.hash(password, saltRounds);
			try {
				await usersCollection.insertOne({ username: username, email: email, password: hashedPassword, timeCreated: time, points: 0, user_rank: 'Bronze' });
				console.log("Inserted user");
				req.session.authenticated = true;
				req.session.username = username;
				req.session.points = 0;
				req.session.rank = 'Bronze';
				req.session.cookie.maxAge = expireTime;
				res.redirect('/main');
			} catch (err) {
				console.error("Error registering user:", err);
				res.status(500).send('Failed to register user');
			}
		});

		//Login Page
		app.get('/login', (req, res) => {
			if (req.session.authenticated) {
				res.redirect('/main');
			}
			else {
				res.render('login');
			}
		});

		//Login POST
		app.post('/login', async (req, res) => {
			const usersCollection = db.collection('users');
			var email = req.body.email;
			var password = req.body.password;

			const schema = Joi.string().max(35).required();
			const validationResult = schema.validate(email);
			if (validationResult.error != null) {
				res.send(`Invalid email or password combination. 1<br> <a href='/login'>Try Again</a>`);
				return;
				return;
			}

			const result = await usersCollection.find({ email: email }).project({ email: 1, username: 1, password: 1, points: 1, _id: 1 }).toArray();

			console.log(result);
			if (result.length != 1) {
				res.send(`Invalid email or password combination. 2<br> <a href='/login'>Try Again</a>`);
				return;
			}
			if (await bcrypt.compare(password, result[0].password)) {
				console.log("correct password");
				req.session.authenticated = true;
				req.session.username = result[0].username;
				req.session.points = result[0].points;
				req.session.rank = result[0].user_rank;
				req.session.email = email;
				req.session.cookie.maxAge = expireTime;

				res.redirect('/main');
				return;
			}
			else {
				res.send(`Invalid email or password combination. 3<br> <a href='/login'>Try Again</a>`);
				return;
			}
		});

		//Log Out Page
		app.get('/logout', (req, res) => {
			//destroy session
			req.session.destroy(err => {
				if (err) {
					console.error('Error destroying session:', err);
				}
				res.redirect('/');
			});
		});

		app.get('/map', (req, res) => {
			// Resolve the path to map.html using path module
			const mapFilePath = path.join(__dirname, 'html', 'map.html');

			// Send map.html as the response
			res.sendFile(mapFilePath);
		});

		app.get('/aichat-home', (req, res) => {
			// Resolve the path to map.html using path module
			const mapFilePath = path.join(__dirname, 'html', 'aichat-home.html');

			// Send map.html as the response
			res.sendFile(mapFilePath);
		});

		app.get('/aichat-config', (req, res) => {
			// Resolve the path to map.html using path module
			const mapFilePath = path.join(__dirname, 'html', 'aichat-config.html');

			// Send map.html as the response
			res.sendFile(mapFilePath);
		});

		app.get('/aichat-loading', (req, res) => {
			// Resolve the path to map.html using path module
			const mapFilePath = path.join(__dirname, 'html', 'aichat-loading.html');

			// Send map.html as the response
			res.sendFile(mapFilePath);
		});

		app.get('/aichat-log', (req, res) => {
			// Resolve the path to map.html using path module
			const mapFilePath = path.join(__dirname, 'html', 'aichat-log.html');

			// Send map.html as the response
			res.sendFile(mapFilePath);
		});

		//main page - check the user, display the remained tasks, display the user name in the current session;
		app.get('/main', async (req, res) => {

			if (!req.session.authenticated) {
				console.log("nope");
				res.redirect('/login');  // Redirect to login if no user session
				return;
			}


			var currentPoints = req.session.points;
			console.log(currentPoints);
			if (currentPoints < 50 && currentPoints >= 0) {
				req.session.rank = 'Bronze';
				console.log('bronze');
			}
			else if (currentPoints > 49 && currentPoints < 100) {
				req.session.rank = 'Silver';
				console.log('silver');
			}
			else if (currentPoints > 99 && currentPoints < 150) {
				req.session.rank = 'Gold';
				console.log('gold');
			}
			else if (currentPoints > 149 && currentPoints < 200) {
				req.session.rank = 'Platinum';
				console.log('platinum');
			}
			else if (currentPoints > 199 && currentPoints < 250) {
				req.session.rank = 'Diamond';
				console.log('diamond');
			}
			else {
				req.session.rank = 'Limit Reached';
			}
			const filter = { username: req.session.username };

			const updateDoc = {
				$set: {
					user_rank: req.session.rank
				},
			};

			const usersCollection = db.collection('users');
			const result = await usersCollection.updateOne(filter, updateDoc);

			let doc = fs.readFileSync('./html/main.html', 'utf8'); // Ensure this path is correct

			try {
				const user = await usersCollection.findOne({ username: req.session.username });

				if (!user || !user.fitTasks) {
					console.error('User not found or no tasks available');
					doc = doc.replace('<!-- TASKS_PLACEHOLDER -->', '<li class="task-item">No tasks on your list</li>');
					res.status(404).send(doc);
					return;
				}

				// Generate tasks HTML
				let tasksHtml = user.fitTasks.map(task => `<li class="task-item">${task}</li>`).join('');

				// written in comment form, because those will be in HTML
				doc = doc.replace('<!-- TASKS_PLACEHOLDER -->', tasksHtml);
				doc = doc.replace('<!-- USERNAME_PLACEHOLDER -->', `${req.session.username}`);

				res.send(doc);
			} catch (err) {
				console.error("Error fetching user or tasks:", err);
				res.status(500).send('Failed to fetch user data');
			}
		});

		//Adding points POST
		app.post('/addPoint', sessionValidation, async (req, res) => {

			var currentPoints = req.session.points;
			const filter = { username: req.session.username };
			/* Set the upsert option to insert a document if no documents match
			the filter */

			// Specify the update to set a value for the plot field
			const updateDoc = {
				$set: {
					points: currentPoints + 5
				},
			};
			// Update the first document that matches the filter
			const usersCollection = db.collection('users');
			const result = await usersCollection.updateOne(filter, updateDoc);
			req.session.points = currentPoints + 5;
			console.log(result);
			res.redirect('/main');
		});

		app.post('/rerollFit1', sessionValidation, async (req, res) => {
			const usersCollection = db.collection('users');
			var result = await usersCollection.find({ email: req.session.email }).project({ email: 1, username: 1, password: 1, points: 1, _id: 1, fitTasks: 1 }).toArray();
			var temp = '';
			while (true) {
				temp = Math.floor(Math.random() * taskBank.length);
				if (taskBank[temp] != result[0].fitTasks[0] && taskBank[temp] != result[0].fitTasks[1] && taskBank[temp] != result[0].fitTasks[2]) {
					break;
				}
			}

			const updateDoc = {
				$set: {
					fitTasks: [taskBank[temp], result[0].fitTasks[1], result[0].fitTasks[2]]
				},
			};

			result = await usersCollection.updateOne(result[0], updateDoc);
			console.log(result);
			res.redirect('/fitTasks');
		});

		app.post('/rerollFit2', sessionValidation, async (req, res) => {
			const usersCollection = db.collection('users');
			var result = await usersCollection.find({ email: req.session.email }).project({ email: 1, username: 1, password: 1, points: 1, _id: 1, fitTasks: 1 }).toArray();
			var temp = '';
			while (true) {
				temp = Math.floor(Math.random() * taskBank.length);
				if (taskBank[temp] != result[0].fitTasks[0] && taskBank[temp] != result[0].fitTasks[1] && taskBank[temp] != result[0].fitTasks[2]) {
					break;
				}
			}

			const updateDoc = {
				$set: {
					fitTasks: [result[0].fitTasks[0], taskBank[temp], result[0].fitTasks[2]]
				},
			};

			result = await usersCollection.updateOne(result[0], updateDoc);
			console.log(result);
			res.redirect('/fitTasks');
		});

		app.post('/rerollFit3', sessionValidation, async (req, res) => {
			const usersCollection = db.collection('users');
			var result = await usersCollection.find({ email: req.session.email }).project({ email: 1, username: 1, password: 1, points: 1, _id: 1, fitTasks: 1 }).toArray();
			var temp = '';
			while (true) {
				temp = Math.floor(Math.random() * taskBank.length);
				if (taskBank[temp] != result[0].fitTasks[0] && taskBank[temp] != result[0].fitTasks[1] && taskBank[temp] != result[0].fitTasks[2]) {
					break;
				}
			}

			const updateDoc = {
				$set: {
					fitTasks: [result[0].fitTasks[0], result[0].fitTasks[1], taskBank[temp]]
				},
			};

			result = await usersCollection.updateOne(result[0], updateDoc);
			console.log(result);
			res.redirect('/fitTasks');
		});

		//Adding points to Fitness Page
		app.post('/addPointFit', sessionValidation, async (req, res) => {

			var currentPoints = req.session.points;
			const filter = { username: req.session.username };

			const updateDoc = {
				$set: {
					points: currentPoints + 5
				},
			};

			const usersCollection = db.collection('users');
			const result = await usersCollection.updateOne(filter, updateDoc);
			req.session.points = currentPoints + 5;
			console.log(result);
			res.redirect('/fitTasks');
		});

		app.post('/GroqChatCompletion', async (req, res) => {

			const userInput = req.body.question;
			try {
				const chatCompletion = await getGroqChatCompletion(userInput);
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

		// ----------------------------------------------------------
		// This code is partially provided in the Google Speech to Text API, 
		// which is modified with the help of GroqCloud AI API to connect 
		// client side to handle audio streaming from the client side.

		app.post('/transcribe', async (req, res) => { // This is the end point for posting to the Google Speech API
			const audioStream = req.pipe(require('stream')); // Create a transcription request by piping the incoming request stream 
			// to a stream created by the 'stream' package
		  
			  // Create the Speech-to-Text API request
			  // Google Client libraries
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
		  
			// Send the request to the Speech-to-Text API, store the response, and process the transcription
			const [response] = await speechClient.recognize(request);
			const transcription = response.results
			  .map(result => result.alternatives[0].transcript)
			  .join('\n');
		  
			res.json({transcription});
		  });
		  
		  app.post('/audio', (req, res) => { // This is the end point for receiving audio and initiating transcription
			const audioStream = req.pipe(fs.createWriteStream('audio.wav')); // Create a writable stream for the audio file named 'audio.wav' to save the incoming request data
		  
			// Add event listener for when the 'finish' event is triggered on the stream. 
			// Once the entire request stream is processed, initiate transcription by calling the 'getTranscription' function
			audioStream.on('finish', () => { 
			  console.log('Received audio data, initiating transcription.');
			  getTranscription();
			});
		  
			res.json({status: 'received'});
		  });
		  
		  // Initiates a transcription request using the Google Cloud Speech-to-Text API
		  function getTranscription() {
			const audioStream = fs.createReadStream('audio.wav'); // Create a readable stream for the previously saved 'audio.wav' file
		  
			// Google Speech API configuration settings
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
		  
			// Google Client libraries code with modification for the client side display
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

		  app.get('/scan', (req, res) => {
			var doc = fs.readFileSync('./html/scan.html', 'utf-8');
			res.send(doc);
		  });

		// Route for handling 404 Not Found
		app.get('*', (req, res) => {
			res.status(404).send('Page not found - 404');
		});

		app.listen(port, () => {
			console.log("Node appplication listening on port " + port);
		});

	} catch (err) {
		console.error("Connection error:", err);
		process.exit(1); // Exit with error if connection fails
	}

}
connectToMongo().catch(console.error);
