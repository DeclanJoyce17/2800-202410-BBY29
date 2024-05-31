
"use strict";

/**All node modules we used and implemented */
require('dotenv').config();
const fs = require("fs");
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { ObjectId, MongoClient, GridFSBucket } = require('mongodb');
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const { spawn } = require('child_process');
const sharp = require('sharp');
const axios = require('axios');
const textToSpeech = require('@google-cloud/text-to-speech');
const uuid = require('uuid');
const util = require('util');
var nodemailer = require('nodemailer');
const crypto = require('crypto');
const Joi = require('joi');
const cloudinary = require('cloudinary').v2;
const app = express();
const expireTime = 12 * 60 * 60 * 1000;


// Load environment variables from .env file
const port = process.env.PORT || 3000;
const speechClient = new SpeechClient();
const mongoUri = process.env.MONGO_URI;
const nodeSessionSecret = process.env.NODE_SESSION_SECRET;


// For upload imgs in community page
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true
});


app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
const storage = multer.memoryStorage()
const upload = multer({ storage: storage });
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


/************ uploading profile images ***********/

/**
* Initialize MongoDB and GridFS
*
* ensuring that the MongoDB connection  and GridFS initialization are completed before proceeding further.
*/
let db, bucket;
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

/**
 * Route to upload images
 */
app.post('/upload', upload.single('image'), async (req, res) => {
	if (!req.file) {
		return res.status(400).send('No file uploaded.');
	}
	try {
		// Get the original filename of the uploaded file
		const filename = req.file.originalname;
		// Save the image to MongoDB using a helper function
		const fileId = await saveImageToMongoDB(req.file.buffer, req.file.mimetype, filename);
		// Send a success message with the file ID
		res.send(`Image uploaded successfully with ID: ${fileId}`);
	} catch (error) {
		console.error('Upload error:', error);
		res.status(500).send(`Failed to upload image: ${error.message}`);
	}
});


/*********** connecting mongo ***************/
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


		//Parsing the static folders
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


		//Admin Checking Function
		function isAdmin(req) {
			if (req.session.user_type == 'admin') {
				return true;
			}
			return false;
		}


		//Admin Validation Middleware
		function adminValidation(req, res, next) {
			console.log(req);
			if (isAdmin(req)) {
				next();
			}
			else {
				res.status('403');
				res.render('403');
			}
		}


		//Used Chatgpt to help figure out the password
		const transporter = nodemailer.createTransport({
			service: 'gmail', // e.g., 'gmail', 'yahoo', etc.
			auth: {
				user: process.env.APP_EMAIL,
				pass: process.env.APP_PASSWORD
			},
			defaults: {
				from: 'FitUp <' + process.env.APP_EMAIL + '>',
			},
		});


		/**
		 * Main page
		 * 
		 * If logged in redirect to main, otherwise redirect to index.
		 */
		app.get('/', (req, res) => {
			if (req.session.authenticated) {
				res.redirect('/main');
			}
			else {
				res.render('index');
			}
		});


		/**
		 * Signup page
		 * 
		 * If logged in redirect to main, otherwise redirect to signup.
		 */
		app.get('/signup', (req, res) => {
			if (req.session.authenticated) {
				res.redirect('/main');
			}
			else {
				res.render('signup');
			}
		});


		/**
		 * Shop page
		 * 
		 * Renders shop page with shop data from the database.
		 */
		app.get('/shop', sessionValidation, async (req, res) => {
			const usersCollection = db.collection('shopItems');
			const result = await usersCollection.find().project({}).toArray();
			const userCollection = db.collection('users');
			const results = await userCollection.find({ email: req.session.email }).project({ currentPoints: 1 }).toArray();
			console.log(results[0].currentPoints);
			req.session.currentPoints = results[0].currentPoints;
			res.render('shop', { items: result, currentPoints: results[0].currentPoints });
		});


		/**
		 * Buying items from shop post
		 */
		app.post('/buy/:name', sessionValidation, async (req, res) => {
			var itemName = req.params.name;
			var points = req.session.currentPoints;

			const shopItemCollection = db.collection('shopItems');
			const shopItems = await shopItemCollection.find({ name: itemName }).project({ price: 1 }).toArray();

			const userCollection = db.collection('users');
			const rerollAmount = await userCollection.find({ email: req.session.email }).project({ rerolls: 1 }).toArray();

			if (points < shopItems[0].price) {
				console.log("Not Enough Points.");
				return false;
			}
			const filter = { email: req.session.email };
			if (itemName == '1 Hour Boost') {
				var currentTime = new Date().getTime();
				var hourTime = currentTime + (1 * 60 * 60 * 1000);
				req.session.hourTime = hourTime;
				console.log(currentTime);
				console.log(hourTime);
				const updateDoc = {
					$set: {
						pointBoost: hourTime

					},
				};


				await userCollection.updateOne(filter, updateDoc);

			}
			if (itemName == 'Task Reroll') {
				var rerolls = rerollAmount[0].rerolls;
				const updateDoc = {
					$set: {
						rerolls: rerolls + 1

					},
				};


				await userCollection.updateOne(filter, updateDoc);
				req.session.rerolls = rerolls;
			}

			var newprice = points - shopItems[0].price;
			console.log(newprice);
			const updateDoc = {
				$set: {
					currentPoints: newprice

				},
			};

			await userCollection.updateOne(filter, updateDoc);
			req.session.currentPoints = newprice;
			console.log("You bought a " + itemName);
			res.redirect('/shop');
			return true;

		});


		/**
		 * FitTasks page
		 * 
		 * Displays tasks from database
		 * Display time left on boost
		 * Displays points
		 */
		app.get('/fitTasks', sessionValidation, async (req, res) => {
			var currentTime = new Date().getTime();
			var point = req.session.points;
			const usersCollection = db.collection('users');

			var timeRemaining = (req.session.hourTime - currentTime) / 60000;
			const result = await usersCollection.find({ email: req.session.email }).project({ email: 1, username: 1, password: 1, points: 1, _id: 1, fitTasks: 1, pointBoost: 1, rerolls: 1, date: 1 }).toArray();
			req.session.hourTime = result[0].pointBoost;

			// checks to see if the date of the tasks are old, and if so rerolls all fit and diet tasks
			if (result[0].date != new Date().getDate()) {

				var taskBankFit = await db.collection('fitnessTasks').find({}).project({ task: 1 }).toArray();
				var userFitTasks = new Array(3);


				for (var i = 0; i < 3; i++) {
					while (true) {
						var temp = Math.floor(Math.random() * taskBankFit.length);
						if (taskBankFit[temp].task != userFitTasks[0] && taskBankFit[temp].task != userFitTasks[1] && taskBankFit[temp].task != userFitTasks[2]) {
							userFitTasks[i] = taskBankFit[temp].task;
							break;
						}
					}
				}

				var taskBankDiet = await db.collection('dietTasks').find({}).project({ task: 1 }).toArray();
				var userDietTasks = new Array(3);

				for (var i = 0; i < 3; i++) {
					while (true) {
						var temp = Math.floor(Math.random() * taskBankDiet.length);
						if (taskBankDiet[temp].task != userDietTasks[0] && taskBankDiet[temp].task != userDietTasks[1] && taskBankDiet[temp].task != userDietTasks[2]) {
							userDietTasks[i] = taskBankDiet[temp].task;
							break;
						}
					}
				}

				const updateDoc = {
					$set: {
						fitTasks: userFitTasks,
						dietTasks: userDietTasks,
						date: new Date().getDate()
					}
				}

				await usersCollection.updateOne(result[0], updateDoc);
				res.redirect('/fitTasks');
			} else {
				res.render('fitTasks', { points: point, boostActive: (timeRemaining).toFixed(2), task1: result[0].fitTasks[0], task2: result[0].fitTasks[1], task3: result[0].fitTasks[2], rerolls: result[0].rerolls, noRerolls: false });
			}

		});


		/**
		 * dietTask page
		 * 
		 * Displays tasks from database
		 * Display time left on boost
		 * Displays points
		 */
		app.get('/dietTasks', sessionValidation, async (req, res) => {
			var point = req.session.points;
			var currentTime = new Date().getTime();
			const usersCollection = db.collection('users');

			var timeRemaining = (req.session.hourTime - currentTime) / 60000;
			const result = await usersCollection.find({ email: req.session.email }).project({ email: 1, username: 1, password: 1, points: 1, _id: 1, dietTasks: 1, rerolls: 1, pointBoost: 1, date: 1 }).toArray();
			req.session.hourTime = result[0].pointBoost;

			// checks to see if the date of the tasks are old, and if so rerolls all fit and diet tasks
			if (result[0].date != new Date().getDate()) {

				var taskBankFit = await db.collection('fitnessTasks').find({}).project({ task: 1 }).toArray();
				var userFitTasks = new Array(3);


				for (var i = 0; i < 3; i++) {
					while (true) {
						var temp = Math.floor(Math.random() * taskBankFit.length);
						if (taskBankFit[temp].task != userFitTasks[0] && taskBankFit[temp].task != userFitTasks[1] && taskBankFit[temp].task != userFitTasks[2]) {
							userFitTasks[i] = taskBankFit[temp].task;
							break;
						}
					}
				}

				var taskBankDiet = await db.collection('dietTasks').find({}).project({ task: 1 }).toArray();
				var userDietTasks = new Array(3);

				for (var i = 0; i < 3; i++) {
					while (true) {
						var temp = Math.floor(Math.random() * taskBankDiet.length);
						if (taskBankDiet[temp].task != userDietTasks[0] && taskBankDiet[temp].task != userDietTasks[1] && taskBankDiet[temp].task != userDietTasks[2]) {
							userDietTasks[i] = taskBankDiet[temp].task;
							break;
						}
					}
				}

				const updateDoc = {
					$set: {
						fitTasks: userFitTasks,
						dietTasks: userDietTasks,
						date: new Date().getDate()
					}
				}

				await usersCollection.updateOne(result[0], updateDoc);
				res.redirect('/dietTasks');
			} else {
				res.render('dietTasks', { points: point, boostActive: (timeRemaining).toFixed(2), task1: result[0].dietTasks[0], task2: result[0].dietTasks[1], task3: result[0].dietTasks[2], rerolls: result[0].rerolls, noRerolls: false });
			}

		});


		/**
		 * Signup page
		 */
		app.post('/signup', async (req, res) => {
			const usersCollection = db.collection('users');
			const { username, email, password } = req.body;


			// Validate input
			let errorMessage = '';

			if (!username) {
				errorMessage += 'Name is required.\n';
			}
			if (!email) {
				errorMessage += 'Email is required.\n';
			}
			if (!password) {
				errorMessage += 'Password is required.\n';
			}

			if (errorMessage) {
				res.render('signup', { errorMessage: errorMessage.trim(), username, email });
				return;
			}

			// Continue with your signup logic if no errors

			// Validate input format with Joi
			const schema = Joi.object({
				username: Joi.string().alphanum().max(20).required(),
				email: Joi.string().email().max(35).required(),
				password: Joi.string().max(20).required()
			});

			const { error } = schema.validate({ username, email, password });
			if (error) {
				res.render('signup', { errorMessage: `Validation error: ${error.details[0].message}`, username, email });
				return;
			}

			try {
				// Check if username or email already exists
				const existingUser = await usersCollection.findOne({
					$or: [{ username: username }, { email: email }]
				});

				if (existingUser) {
					let errorMessage = '';
					if (existingUser.username === username && existingUser.email === email) {
						errorMessage = 'Username and Email already exist.';
					} else if (existingUser.username === username) {
						errorMessage = 'Username already exists.';
					} else if (existingUser.email === email) {
						errorMessage = 'Email already exists.';
					}
					res.render('signup', { errorMessage, username, email });
					return;
				}

				// Hash the password
				const hashedPassword = await bcrypt.hash(password, saltRounds);

				var temp;

				var taskBankFit = await db.collection('fitnessTasks').find({}).project({ task: 1 }).toArray();
				var userFitTasks = new Array(3);


				for (var i = 0; i < 3; i++) {
					while (true) {
						temp = Math.floor(Math.random() * taskBankFit.length);
						if (taskBankFit[temp].task != userFitTasks[0] && taskBankFit[temp].task != userFitTasks[1] && taskBankFit[temp].task != userFitTasks[2]) {
							userFitTasks[i] = taskBankFit[temp].task;
							break;
						}
					}
				}

				var taskBankDiet = await db.collection('dietTasks').find({}).project({ task: 1 }).toArray();
				var userDietTasks = new Array(3);

				for (var i = 0; i < 3; i++) {
					while (true) {
						temp = Math.floor(Math.random() * taskBankDiet.length);
						if (taskBankDiet[temp].task != userDietTasks[0] && taskBankDiet[temp].task != userDietTasks[1] && taskBankDiet[temp].task != userDietTasks[2]) {
							userDietTasks[i] = taskBankDiet[temp].task;
							break;
						}
					}
				}

				// Insert the new user into the database
				const result = await usersCollection.insertOne({
					username,
					email,
					password: hashedPassword,
					timeCreated: new Date().getTime(),
					points: 0,
					user_rank: 'Bronze',
					fitTasks: userFitTasks,
					dietTasks: userDietTasks,
					date: new Date().getDate(),
					rerolls: 3,
					currentPoints: 0,
					pointBoost: 0,
					user_type: 'user'
				});

				console.log("Inserted user");

				// Set session variables
				req.session.authenticated = true;
				req.session.userId = result.insertedId;
				req.session.username = username;
				req.session.points = 0;
				req.session.currentPoints = 0;
				req.session.rank = 'Bronze';
				req.session.cookie.maxAge = expireTime;
				req.session.email = email;
				req.session.user_type = 'user';

				res.redirect('/main');
			} catch (err) {
				console.error("Error registering user:", err);
				res.render('signup', { errorMessage: 'Failed to register user.', username, email });
			}
		});


		/**
		 * Admin page
		 * 
		 * Shows all users and you can update roles,remove roles, or delete users.
		 */
		app.get('/admin', sessionValidation, adminValidation, async (req, res) => {
			console.log(req.session.user_type);
			if (req.session.user_type != 'admin') {
				res.render('403');
			}
			const userCollection = db.collection('users');
			const result = await userCollection.find({}).project({ username: 1, user_type: 1 }).toArray();
			req.session.user_type = result[0].user_type;
			console.log(result[0].user_type)
			res.render('admin', { users: result })
		});


		//Demote admin to users.
		app.post('/demoteAdmin/:username2', async (req, res) => {
			const userCollection = db.collection('users');
			var username2 = req.params.username2;
			const filter = { username: username2 };

			const updateDoc = {
				$set: {
					user_type: 'user'
				},
			};


			const result = await userCollection.updateOne(filter, updateDoc);
			if (username2 == req.session.username) {
				req.session.user_type = 'user';
			}
			res.redirect('/admin');
		});


		//Delete users from database as admin.
		app.post('/deleteUser/:username', async (req, res) => {
			var username = req.params.username;
			const userCollection = db.collection('users');
			const doc = {
				username: username
			};
			const deleteResult = await userCollection.deleteOne(doc);
			res.redirect('/admin');
		});


		//promote users to admin.
		app.post('/promoteUser/:username2', async (req, res) => {
			const userCollection = db.collection('users');
			var username2 = req.params.username2;
			const filter = { username: username2 };

			const updateDoc = {
				$set: {
					user_type: 'admin'
				},
			};


			const result = await userCollection.updateOne(filter, updateDoc);

			res.redirect('/admin');
		});


		/**
		 * Login page
		 * 
		 * redirects to main if logged in.
		 */
		app.get('/login', (req, res) => {
			if (req.session.authenticated) {
				res.redirect('/main');
			}
			else {
				res.render('login', { input: 0 });
			}
		});


		/**
		 * Login post
		 * 
		 * saves user variables from database into a session variable.
		 */
		app.post('/login', async (req, res) => {

			const usersCollection = db.collection('users');
			var email = req.body.email;
			var password = req.body.password;

			const schema = Joi.string().max(35).required();
			const validationResult = schema.validate(email);
			if (validationResult.error != null) {
				res.render('login', { input: 1 });
				return;
			}

			const result = await usersCollection.find({ email: email }).project({ email: 1, username: 1, password: 1, points: 1, currentPoints: 1, user_type: 1, rerolls: 1, _id: 1 }).toArray();

			console.log(result);
			if (result.length != 1) {
				res.render('login', { input: 1 });
				return;
			}
			if (await bcrypt.compare(password, result[0].password)) {
				console.log("correct password");
				req.session.authenticated = true;
				req.session.userId = result[0]._id;
				req.session.username = result[0].username;
				req.session.points = result[0].points;
				req.session.rank = result[0].user_rank;
				req.session.currentPoints = result[0].currentPoints;
				req.session.rerolls = result[0].rerolls;
				req.session.email = email;
				req.session.cookie.maxAge = expireTime;
				req.session.hourTime = result[0].pointBoost;
				req.session.user_type = result[0].user_type;
				console.log(req.session.user_type);
				res.redirect('/main');

				return;
			}
			else {
				res.render('login', { input: 1 });
				return;
			}
		});


		/**
		 * Logout page
		 */
		app.get('/logout', (req, res) => {
			//destroy session
			req.session.destroy(err => {
				if (err) {
					console.error('Error destroying session:', err);
				}
				res.redirect('/');
			});
		});


		/**
		 * Reset email page
		 */
		app.get('/reset-email', (req, res) => {
			res.render('reset-email', { errorMessage: null, successMessage: null });
		});


		/**
		 * Reset email allows for you to change your email.
		 */
		app.post('/reset-email', async (req, res) => {
			const { email } = req.body;

			// Ai created this email formatting checker
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

			if (!emailRegex.test(email)) {
				return res.render('reset-email', { errorMessage: 'Invalid email format.', successMessage: null });
			}

			// Creates a token
			const sessionToken = crypto.randomBytes(32).toString('hex');

			try {
				// Check if email exists in the database
				const user = await db.collection('users').findOne({ email });

				if (!user) {
					return res.render('reset-email', { errorMessage: 'Email does not exist.', successMessage: null });
				}

				const userName = user.username;

				// Create session token with help of AI
				await db.collection('passwordResetTokens').insertOne({ email, token: sessionToken, createdAt: new Date() });

				const resetUrl = `http://localhost:2800/reset-password?token=${sessionToken}`;

				const imgPath1 = path.join(__dirname, 'img', 'Logo.png');
				const imgPath2 = path.join(__dirname, 'img', 'fitup.png');

				// Function to escape special characters in HTML made with AI
				function escapeHtml(text) {
					return text
						.replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;")
						.replace(/"/g, "&quot;")
						.replace(/'/g, "&#039;");
				}

				const escapedUserName = escapeHtml(userName);
				const escapedResetUrl = escapeHtml(resetUrl);

				// AI created the html in the email
				const mailOptions = {
					from: 'FitUp <' + process.env.APP_EMAIL + '>',
					to: email,
					subject: 'Password Reset',
					html: `
        <div style="text-align: center;">
            <img src="cid:headerLogo" alt="FitUp Logo" width="250" height="250" style="display: block; margin: 0 auto;">
            <p>Hello ${escapedUserName},</p>
            <p>You have requested to reset your password. Please click the link below to reset:</p>
            <a href="${escapedResetUrl}">${escapedResetUrl}</a>
            <p>This link will expire in 30 minutes.</p>
            <img src="cid:footerLogo" alt="FitUp Footer Logo" width="150" height="150" style="display: block; margin: 20px auto 0;">
        </div>
    `,
					attachments: [
						{
							filename: 'Logo.png',
							path: imgPath1,
							cid: 'headerLogo' // Content-ID for the header logo image
						},
						{
							filename: 'fitup.png',
							path: imgPath2,
							cid: 'footerLogo' // Content-ID for the footer logo image
						}
					]
				};

				await transporter.sendMail(mailOptions);
				return res.render('reset-email', { errorMessage: null, successMessage: 'Password reset email sent successfully.' });
			} catch (error) {
				console.error('Error sending password reset email:', error);
				res.status(500).send('Failed to send password reset email.');
			}
		});


		/**
		 * Reset password page.
		 */
		app.get('/reset-password', async (req, res) => {
			const { token } = req.query;

			try {
				const resetToken = await db.collection('passwordResetTokens').findOne({ token });

				if (!resetToken) {
					return res.status(400).send('Invalid or expired token.');
				}

				// Display the password reset form
				res.render('reset-password', { token, errorMessage: null, successMessage: null });
			} catch (error) {
				console.error('Error fetching reset token:', error);
				res.status(500).send('Error resetting password.');
			}
		});


		/**
		 * Reset password allows you to change your password.
		 */
		app.post('/reset-password', async (req, res) => {
			const { token, newPassword, confirmNewPassword } = req.body;

			// Define Joi schema for password validation
			const schema = Joi.object({
				newPassword: Joi.string().min(8).max(20).required(),
				confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required()
			});

			try {
				// Validate the incoming data
				const validationResult = schema.validate({ newPassword, confirmNewPassword });

				if (validationResult.error) {
					// Handle validation error
					return res.render('reset-password', { token, errorMessage: 'Passwords do not match.', successMessage: null });
				}

				// Verify that the session token exists in MongoDB
				const resetToken = await db.collection('passwordResetTokens').findOne({ token });

				if (!resetToken) {
					return res.status(400).send('Invalid or expired token.');
				}

				// Hash the new password
				const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

				// Update the user's password in MongoDB
				await db.collection('users').updateOne({ email: resetToken.email }, { $set: { password: hashedPassword } });

				// Delete the reset token from MongoDB
				await db.collection('passwordResetTokens').deleteOne({ token });

				return res.render('reset-password', { token: null, errorMessage: null, successMessage: 'Password reset successful.' });
			} catch (error) {
				console.error('Error resetting password:', error);
				res.status(500).send('Error resetting password.');
			}
		});


		/**
		 * Rank progress
		 * 
		 * page shows current rank progess taking information from database.
		 */
		app.get('/rankProgress', sessionValidation, async (req, res) => {

			const usersCollection = db.collection('users');
			const result = await usersCollection.find({ email: req.session.email }).project({ points: 1, rerolls: 1, user_rank: 1, _id: 1 }).toArray();
			var currentPoints = result[0].points;
			var newRanking;
			if (currentPoints < 50 && currentPoints >= 0) {
				newRanking = 50 - currentPoints;
			}
			else if (currentPoints > 49 && currentPoints < 100) {
				newRanking = 100 - currentPoints;
				console.log('Silver');
			}
			else if (currentPoints > 99 && currentPoints < 150) {
				newRanking = 150 - currentPoints;
				console.log('Gold');
			}
			else if (currentPoints > 149 && currentPoints < 200) {
				newRanking = 200 - currentPoints;
				console.log('Platinum');
			}
			else if (currentPoints > 199 && currentPoints < 250) {
				newRanking = 250 - currentPoints;
				console.log('Diamond');
			}

			else if (currentPoints > 249 && currentPoints < 400) {
				newRanking = 400 - currentPoints;
				console.log('master');

			}
			else if (currentPoints > 400 && currentPoints < 700) {
				newRanking = 700 - currentPoints;
				console.log('grandmaster');
			}
			else if (currentPoints > 700 && currentPoints < 1000) {
				newRanking = 1000 - currentPoints;
				console.log('champion');

			}
			else {
				newRanking = 0;
				req.session.rank = 'god';
			}
			res.render('rankProgress', { points: result[0].points, rank: result[0].user_rank, nextRank: newRanking });
		});


		// Route to handle password reset form submission
		app.post('/reset-password', async (req, res) => {
			const { token, newPassword, confirmNewPassword } = req.body;

			// Define Joi schema for password validation
			const schema = Joi.object({
				newPassword: Joi.string().min(8).max(20).required(),
				confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required()
			});

			try {
				// Validate the incoming data
				const validationResult = schema.validate({ newPassword, confirmNewPassword });

				if (validationResult.error) {
					// Handle validation error
					return res.status(400).send('Invalid password or password confirmation.');
				}

				// Verify that the session token exists in MongoDB
				const resetToken = await db.collection('passwordResetTokens').findOne({ token });

				if (!resetToken) {
					return res.status(400).send('Invalid or expired token.');
				}

				// Hash the new password
				const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

				// Update the user's password in MongoDB
				await db.collection('users').updateOne({ email: resetToken.email }, { $set: { password: hashedPassword } });

				// Delete the reset token from MongoDB
				await db.collection('passwordResetTokens').deleteOne({ token });

				res.send('Password reset successful. <br><a href="/login">Back to login</a>');
			} catch (error) {
				console.error('Error resetting password:', error);
				res.status(500).send('Error resetting password.');
			}
		});


		/**
		 * Map page 
		 * 
		 * shows map and allows you to see your location and nearby gyms.
		 */
		app.get('/map', (req, res) => {
			// Resolve the path to map.html using path module
			const mapFilePath = path.join(__dirname, 'html', 'map.html');

			// Send map.html as the response
			res.sendFile(mapFilePath);
		});


		/**
		 * Aichat home page
		 * 
		 * shows the AI chat
		 */
		app.get('/aichat-home', (req, res) => {
			const mapFilePath = path.join(__dirname, 'html', 'aichat-home.html');

			res.sendFile(mapFilePath);
		});


		/**
		 * loading page for AI
		 */
		app.get('/aichat-loading', (req, res) => {
			const mapFilePath = path.join(__dirname, 'html', 'aichat-loading.html');

			res.sendFile(mapFilePath);
		});


		/**
		 * AI chat log
		 * 
		 * This is where teh AI actually is
		 */
		app.get('/aichat-log', (req, res) => {
			const mapFilePath = path.join(__dirname, 'html', 'aichat-log.html');

			res.sendFile(mapFilePath);
		});


		/**
		 * Main page
		 * 
		 * Updated all database values and updates session values
		 * Renders main page with all EJS variables needed.
		 */
		app.get('/main', async (req, res) => {

			if (!req.session.authenticated) {
				console.log("nope");
				res.redirect('/login');
				return;
			}
			// greeting depends on the time user logged in
			const currentHour = new Date().getHours();
			let greeting;
			if (currentHour < 12) {
				greeting = 'Good Morning';
			} else if (currentHour < 18) {
				greeting = 'Good Afternoon';
			} else {
				greeting = 'Good Evening';
			}

			// ranking
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
			else if (currentPoints > 249 && currentPoints < 400) {
				req.session.rank = 'Master';

			}
			else if (currentPoints > 400 && currentPoints < 700) {
				req.session.rank = 'Grandmaster';
			}
			else if (currentPoints > 700 && currentPoints < 1000) {
				req.session.rank = 'Champion';

			}
			else {
				req.session.rank = 'God';
			}
			const filter = { username: req.session.username };

			const updateDoc = {
				$set: {
					user_rank: req.session.rank
				},
			};

			const usersCollection = db.collection('users');
			const result = await usersCollection.updateOne(filter, updateDoc);

			async function getAndSortUsersFromDB(limit = 5) {
				try {
					// Only return the data we need (excluding the password field)  // Sort by points in descending order
					const users = await usersCollection.find({}, { projection: { password: 0 } })
						.sort({ points: -1 })
						.limit(limit).toArray();
					return users;
				} catch (error) {
					console.error("Error retrieving users from the database:", error);
					return [];
				}
			}

			/************ To use the ejs template ***********/

			const username = req.session.username

			const points = req.session.points
			const rank = req.session.rank
			const users = await getAndSortUsersFromDB();
			let fitTasks = [];
			let dietTasks = [];


			// Get tasks
			try {
				const current_user = await usersCollection.findOne({ username: req.session.username });

				fitTasks = current_user.fitTasks.map(task => task);

				dietTasks = current_user.dietTasks.map(task => task);

			} catch (err) {
				console.error("Error fetching user or tasks:", err);
				res.status(500).send('Failed to fetch user data');
			}

			var results = await usersCollection.find({ email: req.session.email }).project({ fitTasks: 1, user_rank: 1, rerolls: 1, points: 1 }).toArray();

			req.session.points = results[0].points;
			res.render('main', {
				username,
				rank,
				points,
				users,
				fitTasks,
				dietTasks,
				greeting,
				userID: req.session.userId,
			});
		});


		/**
		 * Reroll fit post
		 * 
		 * Rerolls current task from databse if you have enough rerolls.
		 */
		app.post('/rerollFit', sessionValidation, async (req, res) => {

			var number = req.body.number;
			var currentTime = new Date().getTime();

			const usersCollection = db.collection('users');
			var result = await usersCollection.find({ email: req.session.email }).project({ fitTasks: 1, user_rank: 1, rerolls: 1, rerolls: 1, date: 1, pointBoost: 1, user_rank: 1 }).toArray();
			req.session.hourTime = result[0].pointBoost;
			if (currentTime >= req.session.hourTime) {
				req.session.hourTime = 0;
			}
			var temp = '';
			var tempTasks;
			if (result[0].rerolls < 1) {
				var point = req.session.points;
				res.render('fitTasks', { points: point, boostActive: ((req.session.hourTime - currentTime) / 60000).toFixed(2), task1: result[0].fitTasks[0], task2: result[0].fitTasks[1], task3: result[0].fitTasks[2], rerolls: result[0].rerolls, noRerolls: true });
				return;
			}
			req.session.user_rank = result[0].user_rank;
			req.session.rerolls = result[0].rerolls;
			var randomVal = Math.random() * 10;
			var odds;

			if (req.session.user_rank == "Bronze") {
				odds = 1;
			} else if (req.session.user_rank == "Silver") {
				odds = 2;
			} else if (req.session.user_rank == "Gold") {
				odds = 5;
			} else if (req.session.user_rank == "Platinum") {
				odds = 8;
			} else if (req.session.user_rank == "Diamond") {
				odds = 10;
			}

			if (randomVal > odds) {
				tempTasks = db.collection('fitnessTasks');
			} else {
				tempTasks = db.collection('fitnessTasksHard');
			}

			var taskBankFit = await tempTasks.find({}).project({ task: 1 }).toArray();
			while (true) {
				temp = Math.floor(Math.random() * taskBankFit.length);
				if (taskBankFit[temp].task != result[0].fitTasks[0] && taskBankFit[temp].task != result[0].fitTasks[1] && taskBankFit[temp].task != result[0].fitTasks[2]) {
					break;
				}
			}

			var updateDoc;

			if (number == 1) {
				updateDoc = {
					$set: {
						fitTasks: [taskBankFit[temp].task, result[0].fitTasks[1], result[0].fitTasks[2]],
						rerolls: req.session.rerolls - 1
					},
				};
			} else if (number == 2) {
				updateDoc = {
					$set: {
						fitTasks: [result[0].fitTasks[0], taskBankFit[temp].task, result[0].fitTasks[2]],
						rerolls: req.session.rerolls - 1
					},
				};
			} else if (number == 3) {
				updateDoc = {
					$set: {
						fitTasks: [result[0].fitTasks[0], result[0].fitTasks[1], taskBankFit[temp].task],
						rerolls: req.session.rerolls - 1
					},
				};
			}

			result = await usersCollection.updateOne(result[0], updateDoc);

			res.redirect('fitTasks');
		});


		/**
		 * reroll diet task
		 * 
		 * Rerolls a diet task from the database given you have rerolls.
		 */
		app.post('/rerollDiet', sessionValidation, async (req, res) => {
			var currentTime = new Date().getTime();
			var number = req.body.number;

			const usersCollection = db.collection('users');
			var result = await usersCollection.find({ email: req.session.email }).project({ email: 1, username: 1, password: 1, points: 1, _id: 1, dietTasks: 1, pointBoost: 1, rerolls: 1, date: 1, user_rank: 1 }).toArray();
			req.session.hourTime = result[0].pointBoost;
			if (currentTime >= req.session.hourTime) {
				req.session.hourTime = 0;
			}
			var temp = '';
			var tempTasks;
			if (result[0].rerolls < 1) {
				var point = req.session.points;
				res.render('dietTasks', { points: point, boostActive: ((req.session.hourTime - currentTime) / 60000).toFixed(2), task1: result[0].dietTasks[0], task2: result[0].dietTasks[1], task3: result[0].dietTasks[2], rerolls: result[0].rerolls, noRerolls: true });
				return;
			}
			req.session.user_rank = result[0].user_rank;
			req.session.rerolls = result[0].rerolls;
			var randomVal = Math.random() * 10;
			var odds;

			if (req.session.user_rank == "Bronze") {
				odds = 1;
			} else if (req.session.user_rank == "Silver") {
				odds = 2;
			} else if (req.session.user_rank == "Gold") {
				odds = 5;
			} else if (req.session.user_rank == "Platinum") {
				odds = 8;
			} else if (req.session.user_rank == "Diamond") {
				odds = 10;
			}

			if (randomVal > odds) {
				tempTasks = db.collection('dietTasks');
			} else {
				tempTasks = db.collection('dietTasksHard');
			}

			var taskBankFit = await tempTasks.find({}).project({ task: 1 }).toArray();
			while (true) {
				temp = Math.floor(Math.random() * taskBankFit.length);
				if (taskBankFit[temp].task != result[0].dietTasks[0] && taskBankFit[temp].task != result[0].dietTasks[1] && taskBankFit[temp].task != result[0].dietTasks[2]) {
					break;
				}
			}

			var updateDoc;

			if (number == 1) {
				updateDoc = {
					$set: {
						dietTasks: [taskBankFit[temp].task, result[0].dietTasks[1], result[0].dietTasks[2]],
						rerolls: req.session.rerolls - 1
					},
				};
			} else if (number == 2) {
				updateDoc = {
					$set: {
						dietTasks: [result[0].dietTasks[0], taskBankFit[temp].task, result[0].dietTasks[2]],
						rerolls: req.session.rerolls - 1
					},
				};
			} else if (number == 3) {
				updateDoc = {
					$set: {
						dietTasks: [result[0].dietTasks[0], result[0].dietTasks[1], taskBankFit[temp].task],
						rerolls: req.session.rerolls - 1
					},
				};
			}

			console.log(updateDoc);

			result = await usersCollection.updateOne(result[0], updateDoc);

			console.log(result);

			res.redirect('/dietTasks');
		});


		/**
		 * Adding points
		 * 
		 * When clicking done on a task add points to user and update database
		 * Check to see if user has a boost on or not
		 * Changes task after clicking done.
		 */
		app.post('/addPointFit', sessionValidation, async (req, res) => {
			var currentTime = new Date().getTime();
			const tasks1 = db.collection('fitnessTasks');
			const tasks2 = db.collection('fitnessTasksHard');
			const usersCollection = db.collection('users');
			var result = await usersCollection.find({ email: req.session.email }).project({ fitTasks: 1, user_rank: 1, rerolls: 1, rerolls: 1, date: 1, pointBoost: 1, user_rank: 1 }).toArray();
			var point = req.session.points;

			var currentPoint = req.session.currentPoints;
			var lookingTask = req.body.task;
			var addingPoints;
			var updateDoc;
			var hourTime = req.session.hourTime;
			var result1 = await tasks1.find({ task: lookingTask }).project({ points: 1 }).toArray();
			var result2 = await tasks2.find({ task: lookingTask }).project({ points: 1 }).toArray();
			console.log(currentTime);
			console.log(hourTime);
			if (result1.length > 0) {
				addingPoints = result1[0].points;
			} else if (result2.length > 0) {
				addingPoints = result2[0].points;
			}
			if (currentTime < hourTime) {
				console.log("yuh" + addingPoints * 2);
				addingPoints *= 2;
			}
			if (currentTime > hourTime) {
				console.log("nah");
				req.session.hourTime = 0;
				updateDoc = {
					$set: {
						pointBoost: 0
					},
				};
				await usersCollection.updateOne({ email: req.session.email }, updateDoc);
			}
			updateDoc = {
				$set: {
					points: point + addingPoints,
					currentPoints: currentPoint + addingPoints

				},
			};

			await usersCollection.updateOne({ email: req.session.email }, updateDoc);
			req.session.points = point + addingPoints;
			req.session.currentPoints = currentPoint + addingPoints;
			var number = 1;
			console.log(lookingTask);
			console.log(number);
			if (result[0].fitTasks[1] == lookingTask) {
				number = 2;
			}
			if (result[0].fitTasks[2] == lookingTask) {
				number = 3;
			}
			if (result[0].fitTasks[3] == lookingTask) {
				number = 0;
			}
			var temp = '';
			var tempTasks;

			req.session.user_rank = result[0].user_rank;
			req.session.rerolls = result[0].rerolls;
			var randomVal = Math.random() * 10;
			var odds;

			if (req.session.user_rank == "Bronze") {
				odds = 1;
			} else if (req.session.user_rank == "Silver") {
				odds = 2;
			} else if (req.session.user_rank == "Gold") {
				odds = 5;
			} else if (req.session.user_rank == "Platinum") {
				odds = 8;
			} else if (req.session.user_rank == "Diamond") {
				odds = 10;
			}

			if (randomVal > odds) {
				tempTasks = db.collection('fitnessTasks');
			} else {
				tempTasks = db.collection('fitnessTasksHard');
			}

			var taskBankFit = await tempTasks.find({}).project({ task: 1 }).toArray();
			while (true) {
				temp = Math.floor(Math.random() * taskBankFit.length);
				if (taskBankFit[temp].task != result[0].fitTasks[0] && taskBankFit[temp].task != result[0].fitTasks[1] && taskBankFit[temp].task != result[0].fitTasks[2]) {
					break;
				}
			}

			if (number == 1) {
				updateDoc = {
					$set: {
						fitTasks: [taskBankFit[temp].task, result[0].fitTasks[1], result[0].fitTasks[2]],

					},
				};
			} else if (number == 2) {
				updateDoc = {
					$set: {
						fitTasks: [result[0].fitTasks[0], taskBankFit[temp].task, result[0].fitTasks[2]],

					},
				};
			} else if (number == 3) {
				updateDoc = {
					$set: {
						fitTasks: [result[0].fitTasks[0], result[0].fitTasks[1], taskBankFit[temp].task],

					},
				};
			}



			result = await usersCollection.updateOne(result[0], updateDoc);

			res.redirect('/fitTasks');
		});


		/**
		 * Adding points
		 * 
		 * When clicking done on a task add points to user and update database
		 * Check to see if user has a boost on or not
		 * Changes task after clicking done.
		 */
		app.post('/addPointDiet', sessionValidation, async (req, res) => {
			var currentTime = new Date().getTime();
			const tasks1 = db.collection('dietTasks');
			const tasks2 = db.collection('dietTasksHard');
			const usersCollection = db.collection('users');
			var result = await usersCollection.find({ email: req.session.email }).project({ dietTasks: 1, user_rank: 1, rerolls: 1, rerolls: 1, date: 1, pointBoost: 1, user_rank: 1 }).toArray();
			var point = req.session.points;

			var currentPoint = req.session.currentPoints;
			var lookingTask = req.body.task;
			var addingPoints;
			var updateDoc;
			var hourTime = req.session.hourTime;
			var result1 = await tasks1.find({ task: lookingTask }).project({ points: 1 }).toArray();
			var result2 = await tasks2.find({ task: lookingTask }).project({ points: 1 }).toArray();
			console.log(currentTime);
			console.log(hourTime);
			if (result1.length > 0) {
				addingPoints = result1[0].points;
			} else if (result2.length > 0) {
				addingPoints = result2[0].points;
			}
			if (currentTime < hourTime) {
				console.log("yuh" + addingPoints * 2);
				addingPoints *= 2;
			}
			if (currentTime > hourTime) {
				console.log("nah");
				req.session.hourTime = 0;
				const updateDoc = {
					$set: {
						pointBoost: 0
					},
				};
				await usersCollection.updateOne({ email: req.session.email }, updateDoc);
			}
			updateDoc = {
				$set: {
					points: point + addingPoints,
					currentPoints: currentPoint + addingPoints

				},
			};

			await usersCollection.updateOne({ email: req.session.email }, updateDoc);
			req.session.points = point + addingPoints;
			req.session.currentPoints = currentPoint + addingPoints;
			var number = 1;
			console.log(lookingTask);
			console.log(number);
			if (result[0].dietTasks[1] == lookingTask) {
				number = 2;
			}
			if (result[0].dietTasks[2] == lookingTask) {
				number = 3;
			}
			if (result[0].dietTasks[3] == lookingTask) {
				number = 0;
			}
			var temp = '';
			var tempTasks;

			req.session.user_rank = result[0].user_rank;
			req.session.rerolls = result[0].rerolls;
			var randomVal = Math.random() * 10;
			var odds;

			if (req.session.user_rank == "Bronze") {
				odds = 1;
			} else if (req.session.user_rank == "Silver") {
				odds = 2;
			} else if (req.session.user_rank == "Gold") {
				odds = 5;
			} else if (req.session.user_rank == "Platinum") {
				odds = 8;
			} else if (req.session.user_rank == "Diamond") {
				odds = 10;
			}

			if (randomVal > odds) {
				tempTasks = db.collection('dietTasks');
			} else {
				tempTasks = db.collection('dietTasksHard');
			}

			var taskBankDiet = await tempTasks.find({}).project({ task: 1 }).toArray();
			while (true) {
				temp = Math.floor(Math.random() * taskBankDiet.length);
				if (taskBankDiet[temp].task != result[0].dietTasks[0] && taskBankDiet[temp].task != result[0].dietTasks[1] && taskBankDiet[temp].task != result[0].dietTasks[2]) {
					break;
				}
			}

			if (number == 1) {
				updateDoc = {
					$set: {
						dietTasks: [taskBankDiet[temp].task, result[0].dietTasks[1], result[0].dietTasks[2]],

					},
				};
			} else if (number == 2) {
				updateDoc = {
					$set: {
						dietTasks: [result[0].dietTasks[0], taskBankDiet[temp].task, result[0].dietTasks[2]],

					},
				};
			} else if (number == 3) {
				updateDoc = {
					$set: {
						dietTasks: [result[0].dietTasks[0], result[0].dietTasks[1], taskBankDiet[temp].task],

					},
				};
			}



			result = await usersCollection.updateOne(result[0], updateDoc);

			res.redirect('/dietTasks');
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

		/**
		 * AI chat completion.
		 * 
		 * @param {*} userInput 
		 * @returns AI chat messages
		 */
		async function getGroqChatCompletion(userInput) {
			return groq.chat.completions.create({
				messages: [
					// Set an optional system message. This sets the behavior of the
					// assistant and can be used to provide specific instructions for
					// how it should behave throughout the conversation.
					{
						role: "system",
						content: "you are a helpful assistant. Your answer should be concise. Please remove all "
							+ "asterisk (*) from your response. Please make appropriate sentences and paragraphs to ensure readibility for humans."
					},
					// Set a user message for the assistant to respond to.
					{
						role: "user",
						content: userInput
					}
				],
				model: "mixtral-8x7b-32768",

				// Set the rate of accuracy and precision for the answers
				temperature: 0.3,

				// The maximum number of tokens to generate.
				max_tokens: 500,

				// Controls diversity via nucleus sampling: 0.5 means half of all
				// likelihood-weighted options are considered.
				top_p: 1,

			});
		}

		/****************** profile Image *************************/

		// Express route to get a profile image by user id
		app.get('/images/:userId', async (req, res) => {
			try {
				console.log("Session User ID: " + req.params.userId)
				const userId = req.params.userId;
				// Find the file in the MongoDB GridFS bucket by metadata userId
				const files = await bucket.find({ "metadata.userId": userId }).toArray();
				console.log("Files: " + files)
				if (files.length === 0) {
					// If no images found, serve the default image
					const defaultImagePath = './img/default-avatar.jpg';
					res.sendFile(defaultImagePath, { root: __dirname });
				} else {

					// There is only one profile picture
					const file = files[0];

					// Open a download stream by the file ID
					const downloadStream = bucket.openDownloadStream(file._id);

					// Set the proper content type before sending the stream
					downloadStream.on('file', (file) => {
						res.type(file.metadata.contentType);
					});

					// Pipe the image data to the response
					downloadStream.pipe(res);

				}

			} catch (error) {
				console.error('Failed to retrieve image:', error);
				res.status(500).send('Failed to retrieve image due to an internal error.');
			}
		});

		// Define the route for the '/profile' endpoint, applying the sessionValidation middleware
		app.get('/profile', sessionValidation, async (req, res) => {
			const userCollection = db.collection('users');
			// Find the user document matching the email stored in the session, projecting only the username and user_type fields
			const result = await userCollection.find({ email: req.session.email }).project({ username: 1, user_type: 1 }).toArray();
			req.session.user_type = result[0].user_type;
			// Retrieve the upload success flag and error message from the session
			const uploadSuccess = req.session.uploadSuccess;
			const uploadError = req.session.uploadError;
			// Reset the flag immediately
			req.session.uploadSuccess = false;
			// Reset the error message immediately
			req.session.uploadError = null;
			res.render('profile', {
				userID: req.session.userId,
				type: req.session.user_type,
				username: req.session.username,
				email: req.session.email,
				uploadSuccess: uploadSuccess,
				uploadError: uploadError,
				change: false
			});
		});

		// Route to upload profile images
		app.post('/profile-upload', upload.single('image'), async (req, res) => {
			if (!req.file) {
				return res.status(400).send('No file uploaded.');
			}

			const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
			if (!allowedMimeTypes.includes(req.file.mimetype)) {
				req.session.uploadError = 'Invalid file type. Only JPG, PNG, and GIF files are allowed.';
				return res.redirect('/profile');
			}

			try {
				console.log("session user id: " + req.session.userId);
				const userId = req.session.userId;
				const filename = req.file.originalname;
				await saveProfileImageToMongoDB(req.file.buffer, req.file.mimetype, filename, userId);
				// Reset the flag after rendering
				req.session.uploadSuccess = true;
				res.redirect('/profile');
			} catch (error) {
				console.error('Upload error:', error);
				res.status(500).send(`Failed to upload image: ${error.message}`);
			}
		});

		/****************** community posts *************************/

		// Define the route to render the postImgtest.ejs file
		app.get('/community', async (req, res) => {
			if (!req.session.userId) {
				return res.status(401).send('Unauthorized');
			}

			const userId = req.session.userId;
			// Get the page number from query parameter or default to 1
			const page = parseInt(req.query.page) || 1;
			const limit = parseInt(req.query.limit) || 5;
			// Get the tag filter from query parameter
			const tag = req.query.tag || 'all';

			let filter = {};

			if (tag !== 'all') {
				console.log(tag);
				filter.tags = tag;
				console.log(filter);
			}

			try {
				const postsCollection = db.collection('posts');

				const posts = await postsCollection.find(filter)
					.sort({ createdAt: -1 })
					// Skip the posts of previous pages
					.skip((page - 1) * limit)
					// Limit the number of posts to display
					.limit(limit)
					.toArray();

				// Preprocess image URLs
				const imageUrls = posts.map(post => post.imageUrls.map(url => cloudinary.url(url, { width: 1080, height: 1080, crop: 'fill' })));

				const postSuccess = req.session.postSuccess;

				// Reset the flag
				req.session.postSuccess = false;

				if (req.query.json) {
					res.json({ posts, imageUrls });
				} else {
					res.render('community', { posts, imageUrls, userId, tag, postSuccess });
				}
			} catch (error) {
				console.error('Error retrieving posts:', error);
				res.status(500).send('Failed to retrieve posts.');
			}
		});

		// Define the route for the '/communityPost' endpoint
		app.get('/communityPost', async (req, res) => {
			if (!req.session.userId) {
				return res.status(401).send('Unauthorized');
			}

			// Retrieve the error message from the session
			const errorMessage = req.session.errorMessage;
			// Reset the error message
			req.session.errorMessage = null;
			res.render('communityPost', { errorMessage });
		});

		// Route to get posts by tag
		app.get('/posts/:tag', async (req, res) => {
			const tag = req.params.tag;
			try {
				const postsCollection = db.collection('posts');
				const posts = await postsCollection.find({ tags: tag }).toArray();
				res.render('community', { posts });
			} catch (error) {
				console.error('Error retrieving posts by tag:', error);
				res.status(500).send('Failed to retrieve posts.');
			}
		});

		// Updated POST route to handle post creation - max 4 images can be uploaded
		app.post('/communityPost/post', upload.array('images', 4), async (req, res) => {
			console.log('POST /communityPost/post');

			if (!req.session.userId) {
				return res.status(401).send('Unauthorized');
			}

			const { text, tags, latitude, longitude } = req.body;

			// Validate input: check if text or images are provided
			if (!text && (!req.files || req.files.length === 0)) {
				req.session.errorMessage = 'Please provide either text or images.';
				return res.redirect('/communityPost');
			}

			// Validate tags
			if (!tags || tags === 'Select') {
				req.session.errorMessage = 'Please select a valid tag (Fitness or Diet).';
				return res.redirect('/communityPost');
			}

			// Validate the number of images
			if (req.files.length > 4) {
				req.session.errorMessage = 'You can only upload a maximum of 4 images.';
				return res.redirect('/communityPost');
			}

			// Validate file types
			const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
			for (let file of req.files) {
				if (!allowedMimeTypes.includes(file.mimetype)) {
					req.session.errorMessage = 'Invalid file type. Only JPG, PNG, and GIF files are allowed.';
					return res.redirect('/communityPost');
				}
			}

			const postId = new ObjectId();
			const createdAt = new Date();
			const userId = req.session.userId;
			const formattedTags = tags ? [tags.trim()] : [];

			// Retrieve the user details
			try {
				const usersCollection = db.collection('users');
				const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

				// Handle image uploads if any
				let imageUrls = [];
				if (req.files && req.files.length > 0) {
					imageUrls = await uploadImagesToCloudinary(req.files);
				}

				const username = user.username;

				// Find the profile image in GridFS or display default image
				const files = await bucket.find({ 'metadata.userId': userId }).toArray();
				let profileImage = '/default-avatar.jpg';
				if (files.length > 0) {
					profileImage = `/images/${userId}`;
				}

				// Save post data to MongoDB
				const postsCollection = db.collection('posts');
				await postsCollection.insertOne({
					_id: postId,
					text: text || "",
					createdAt,
					imageUrls,
					tags: formattedTags,
					userId,
					username,
					profileImage,
					location: latitude && longitude ? { latitude, longitude } : null
				});

				// Set a session flag indicating post success and redirect to the community page
				req.session.postSuccess = true;
				res.redirect('/community');
			} catch (error) {
				console.error('Post creation error:', error);
				res.status(500).send(`Failed to create post: ${error.message}`);
			}
		});

		// Route to handle delete post request
		app.post('/community/delete/:id', async (req, res) => {
			if (!req.session.userId) {
				return res.status(401).send('Unauthorized');
			}

			// Extract the postId from the request parameters
			const postId = req.params.id;
			const userId = req.session.userId;

			try {
				// Get the 'posts' collection from the database
				const postsCollection = db.collection('posts');
				// Find the post document by postId
				const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

				if (!post) {
					return res.status(404).send('Post not found.');
				}

				if (post.userId.toString() !== userId) {
					return res.status(403).send('You do not have permission to delete this post.');
				}

				// Delete images from Cloudinary
				await Promise.all(post.imageUrls.map(async (url) => {
					const publicId = url.split('/').pop().split('.')[0];
					await cloudinary.uploader.destroy(publicId);
				}));

				// Delete post from MongoDB
				await postsCollection.deleteOne({ _id: new ObjectId(postId) });

				res.redirect('/community');
			} catch (error) {
				console.error('Error deleting post:', error);
				res.status(500).send(`Failed to delete post: ${error.message}`);
			}
		});



		/****************** Changing User Info *************************/

		//ChangeEmail Page
		app.get('/changeEmail', sessionValidation, async (req, res) => {
			res.render('changeEmail', { issue: false, issue2: false });
		});

		app.post('/changeEmail', sessionValidation, async (req, res) => {
			const filter = { username: req.session.username };
			const email = req.body.email;
			const usersCollection = db.collection('users');

			const schema = Joi.object(
				{
					email: Joi.string().email().max(40).required()
				}
			);

			const { error } = schema.validate({ email });
			if (!(error)) {

				const existingUser = await usersCollection.findOne({ email: email });


				if (existingUser) {

					if (!(existingUser.username == req.session.username)) {
						res.render('changeEmail', { issue: false, issue2: true });
						return;
					}
				}

				const updateDoc = {
					$set: {
						email: email
					}
				};


				await usersCollection.updateOne(filter, updateDoc);
				req.session.email = email;
				const uploadSuccess = req.session.uploadSuccess;
				req.session.uploadSuccess = false; // Reset the flag immediately
				res.render('profile', { userID: req.session.userId, type: req.session.user_type, username: req.session.username, email: req.session.email, uploadSuccess: uploadSuccess, change: true, uploadError: false });
			} else {
				res.render('changeEmail', { issue: true, issue2: false });
			}

		});

		//ChangePassword Page
		app.get('/changePassword', sessionValidation, async (req, res) => {
			res.render('changePassword', { issue: false });
		});

		app.post('/changePassword', sessionValidation, async (req, res) => {
			const filter = { username: req.session.username };
			const password = req.body.password;

			const schema = Joi.object(
				{
					password: Joi.string().min(8).max(20).required()
				}
			);
			const { error } = schema.validate({ password });
			if (!error) {



				const updateDoc = {
					$set: {
						password: await bcrypt.hash(password, saltRounds)
					}
				};

				const usersCollection = db.collection('users');
				await usersCollection.updateOne(filter, updateDoc);
				const uploadSuccess = req.session.uploadSuccess;
				req.session.uploadSuccess = false; // Reset the flag immediately
				res.render('profile', { userID: req.session.userId, type: req.session.user_type, username: req.session.username, email: req.session.email, uploadSuccess: uploadSuccess, change: true, uploadError: false });
			} else {
				res.render('changePassword', { issue: true });
			}

		});

		app.get('/changeUsername', sessionValidation, async (req, res) => {
			res.render('changeUsername', { issue: false, issue2: false });
		});

		app.post('/changeUsername', sessionValidation, async (req, res) => {
			const filter = { email: req.session.email };
			const username = req.body.username;
			const usersCollection = db.collection('users');

			const schema = Joi.object(
				{
					username: Joi.string().alphanum().min(8).max(20).required()
				}
			);

			const { error } = schema.validate({ username });
			console.log(error);
			if (!(error)) {

				const existingUser = await usersCollection.findOne({ username: username });

				if (existingUser) {
					if (existingUser.email != req.session.email) {
						res.render('changeUsername', { issue: false, issue2: true });
						return;
					}
				}

				const updateDoc = {
					$set: {
						username: username
					}
				};


				await usersCollection.updateOne(filter, updateDoc);
				req.session.username = username;
				const uploadSuccess = req.session.uploadSuccess;
				req.session.uploadSuccess = false; // Reset the flag immediately
				res.render('profile', { userID: req.session.userId, type: req.session.user_type, username: req.session.username, email: req.session.email, uploadSuccess: uploadSuccess, change: true, uploadError: false });
			} else {
				res.render('changeUsername', { issue: true, issue2: false });
			}

		});


		// Route to upload profile images
		app.post('/profile-upload', upload.single('image'), async (req, res) => {
			if (!req.file) {
				return res.status(400).send('No file uploaded.');
			}
			try {
				// Retrieve the user ID from the session
				const userId = req.session.userId;
				// Retrieve the user ID from the session
				const filename = req.file.originalname;
				// Save the profile image to MongoDB using a helper function
				await saveProfileImageToMongoDB(req.file.buffer, req.file.mimetype, filename, userId);
				// Set a session flag indicating upload success message
				req.session.uploadSuccess = true;
				res.redirect('/profile');
			} catch (error) {
				console.error('Upload error:', error);
				res.status(500).send(`Failed to upload image: ${error.message}`);
			}
		});

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

			res.json({ transcription });
		});

		app.post('/audio', (req, res) => { // This is the end point for receiving audio and initiating transcription
			const audioStream = req.pipe(fs.createWriteStream('audio.wav')); // Create a writable stream for the audio file named 'audio.wav' to save the incoming request data

			// Add event listener for when the 'finish' event is triggered on the stream. 
			// Once the entire request stream is processed, initiate transcription by calling the 'getTranscription' function
			audioStream.on('finish', () => {
				console.log('Received audio data, initiating transcription.');
				getTranscription();
			});

			res.json({ status: 'received' });
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

		app.get('/ai-training-home', (req, res) => {
			var doc = fs.readFileSync('./html/ai-training-home.html', 'utf-8');
			res.send(doc);
		});

		app.get('/ai-training-questions', (req, res) => {
			var doc = fs.readFileSync('./html/ai-training-questions.html', 'utf-8');
			res.send(doc);
		});

		app.get('/ai-training-scan-request', (req, res) => {
			var doc = fs.readFileSync('./html/ai-training-scan-request.html', 'utf-8');
			res.send(doc);
		});

		app.get('/ai-training-camera-feed', (req, res) => {
			var doc = fs.readFileSync('./html/ai-training-camera-feed.html', 'utf-8');
			res.send(doc);
		});

		app.get('/ai-training-female-body-scan', (req, res) => {
			var doc = fs.readFileSync('./html/ai-training-female-body-scan.html', 'utf-8');
			res.send(doc);
		});

		app.get('/ai-training-female-body-scan-result', (req, res) => {
			var doc = fs.readFileSync('./html/ai-training-female-body-scan-result.html', 'utf-8');
			res.send(doc);
		});

		app.get('/ai-training-male-body-scan', (req, res) => {
			var doc = fs.readFileSync('./html/ai-training-male-body-scan.html', 'utf-8');
			res.send(doc);
		});

		app.get('/ai-training-male-body-scan-result', (req, res) => {
			var doc = fs.readFileSync('./html/ai-training-male-body-scan-result.html', 'utf-8');
			res.send(doc);
		});

		app.get('/ai-training-recommendation', (req, res) => {
			var doc = fs.readFileSync('./html/ai-training-recommendation.html', 'utf-8');
			res.send(doc);
		});

		app.get('/map', (req, res) => {
			var doc = fs.readFileSync('./html/map.html', 'utf-8');
			res.send(doc);
		});


		//-------------------------------------------------------------------------------
		// Text to Speech
		// This code is provided by the Google Text to Speech client libraries with modification
		// our project
		//------------------------------------------------------------------------------


		app.post("/text-to-speech", async (req, res) => {
			const text = req.body.text;

			const client = new textToSpeech.TextToSpeechClient({
				key: process.env.GOOGLE_API_KEY
			});

			try {
				// Construct the request
				const request = {
					input: { text: text },
					// Select the language and SSML voice gender (optional)
					voice: { languageCode: 'en-GB', ssmlGender: "FEMALE" }, // Use appropriate language code and gender
					// Select the type of audio encoding
					audioConfig: { audioEncoding: 'MP3' }, // Fix typo in audioConfig
				};

				// Perform text-to-speech request
				const [response] = await client.synthesizeSpeech(request);
				// Write the binary audio content to a local file
				const writeFile = util.promisify(fs.writeFile);

				// Generate a unique filename for the audio file
				const fileName = uuid.v4() + '.mp3';
				const filePath = path.join(__dirname, 'img/text-to-speech-audios', fileName);
				await writeFile(filePath, response.audioContent, 'binary');
				console.log('Audio content written to file: output.mp3');
				res.send(fileName);
			} catch (error) {
				console.error("Error synthesizing speech ", error);
				res.status(500).send('Error synthesizing speech');
			}
		});

		app.get('/map', (req, res) => {
			var doc = fs.readFileSync('./html/map.html', 'utf-8');
			res.send(doc);
		});

		app.get('/body-motion-capture', (req, res) => {
			var doc = fs.readFileSync('./html/body-motion-capture.html', 'utf-8');
			res.send(doc);
		});

		// Route for handling 404 Not Found
		app.get('*', (req, res) => {
			res.render('404');
		});

		app.listen(port, () => {
			console.log("Node appplication listening on port " + port);
		});


	} catch (err) {
		console.error("Connection error:", err);
		res.render('404');
		process.exit(1); // Exit with error if connection fails
	}
}
connectToMongo().catch(console.error);


/************************ helper functions that handles profile images ***************************/

/*
* This function specifically saves profile images
*
* ensures only one exists per user
*/
async function saveProfileImageToMongoDB(fileBuffer, contentType, filename, userId) {
	try {
		return await saveImageToMongoDB(fileBuffer, contentType, filename, userId, 320, 320, true);
	} catch (error) {
		console.error('Failed to save profile image:', error);
		throw error;
	}
}

/**
* Save image to MongoDB using GridFS
* Check if a file already exists for the given userId - if it exists, replace the existing one
*
* Generated by ChatGPT 3.5
* @author https://chat.openai.com/
*/
async function saveImageToMongoDB(fileBuffer, contentType, filename, userId, width, height, allowOneImageOnly) {
	try {
		// Resize the image buffer to the specified width and height
		const resizedBuffer = await resizeImage(fileBuffer, width, height);

		// Create metadata for the image including content type and user ID
		const metadata = {
			contentType: contentType,
			userId: userId
		};

		// If only one image is allowed per user, check for existing images
		if (allowOneImageOnly) {
			// Find existing files for the user
			const existingFiles = await bucket.find({ "metadata.userId": userId }).toArray();
			// If an existing file is found, delete it
			if (existingFiles.length > 0) {
				await bucket.delete(existingFiles[0]._id);
			}
		}

		// Open an upload stream to GridFS with the specified filename and metadata
		const uploadStream = bucket.openUploadStream(filename, { metadata: metadata });
		// Write the resized image buffer to the upload stream
		uploadStream.write(resizedBuffer);
		// End the upload stream
		uploadStream.end();

		// Return a promise that resolves with the upload stream ID on successful finish
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

// resize images
async function resizeImage(fileBuffer, width, height) {
	try {
		// Use the 'sharp' library to resize the image buffer to the specified width and height
		const resizedBuffer = await sharp(fileBuffer)
			.resize(width, height)
			.toBuffer();

		// Return the resized image buffer
		return resizedBuffer;
	} catch (error) {
		console.error('Error resizing image:', error);
		throw error;
	}
}

/************************ helper functions that handles post images *****************************/

/** Function to upload images to Cloudinary
* 
* Generated by ChatGPT 3.5
* @author https://chat.openai.com/
*/
async function uploadImagesToCloudinary(files) {
	// Use Promise.all to handle multiple file uploads concurrently
	return Promise.all(files.map(file => {
		// Return a new promise for each file upload
		return new Promise((resolve, reject) => {
			resizeImage(file.buffer, 1080, 1080)
				.then(resizedBuffer => {
					// Upload the resized image to Cloudinary using the upload_stream method
					cloudinary.uploader.upload_stream({
						resource_type: 'image'
					}, (error, result) => {
						if (error) {
							reject(error);
						} else {
							// Resolve the promise with the secure URL of the uploaded image
							resolve(result.secure_url);
						}
						// End the upload stream with the resized image buffer
					}).end(resizedBuffer);
				})
				.catch(error => reject(error));
		});
	}));
}
