
"use strict";
const fs = require("fs");

require("./utils.js");

const { MongoClient } = require('mongodb');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const app = express();
const expireTime = 60 * 60 * 1000;
app.set('view engine', 'ejs')

// Load environment variables from .env file
require('dotenv').config();

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;
const nodeSessionSecret = process.env.NODE_SESSION_SECRET;

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
				let doc = fs.readFileSync('./html/signup.html', 'utf8');
				res.send(doc);
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

			await usersCollection.insertOne({ username: username, email: email, password: hashedPassword, timeCreated: time, points: 0, user_rank: 'Bronze' });
			console.log("Inserted user");
			req.session.authenticated = true;
			req.session.username = username;
			req.session.points = 0;
			req.session.rank = 'Bronze';
			req.session.cookie.maxAge = expireTime;
			res.redirect('/main');
		});

		//Login Page
		app.get('/login', (req, res) => {
			if (req.session.authenticated) {
				res.redirect('/main');
			}
			else {
				let doc = fs.readFileSync('./html/login.html', 'utf8');
				res.send(doc);
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

		//Main Page

		app.get('/main', sessionValidation, async (req, res) => {
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
			console.log(result);
			res.render('main', { points: currentPoints, rank: req.session.rank });
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
			while(true) {
				temp = Math.floor(Math.random() * taskBank.length);
				if (taskBank[temp] != result[0].fitTasks[0] && taskBank[temp] != result[0].fitTasks[1] && taskBank[temp] != result[0].fitTasks[2])  {
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
			while(true) {
				temp = Math.floor(Math.random() * taskBank.length);
				if ( taskBank[temp] != result[0].fitTasks[0] && taskBank[temp] != result[0].fitTasks[1] && taskBank[temp] != result[0].fitTasks[2])  {
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
			while(true) {
				temp = Math.floor(Math.random() * taskBank.length);
				if ( taskBank[temp] != result[0].fitTasks[0] && taskBank[temp] != result[0].fitTasks[1] && taskBank[temp] != result[0].fitTasks[2])  {
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

		/*
		app.get('/post', (req, res) => {
		  let doc = fs.readFileSync('./html/post.html', 'utf8');
		  res.send(doc);
		});
		*/


		//Groq Chat bot POST (not working rn)
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

		// module.exports = {
		//     main,
		//     getGroqChatCompletion
		// };

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
