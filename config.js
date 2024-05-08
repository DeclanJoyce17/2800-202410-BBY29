
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

const app = express();

app.set('view engine', 'ejs')

// Load environment variables from .env file
require('dotenv').config();

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;
const nodeSessionSecret = process.env.NODE_SESSION_SECRET;

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

    app.get('/', (req, res) => {
      let doc = fs.readFileSync("./html/index.html", "utf8");
      res.send(doc);
    });

    app.get('/signup', (req, res) => {
      let doc = fs.readFileSync('./html/signup.html', 'utf8');
      res.send(doc);
    });

    app.post('/signup', async (req, res) => {
      const { username, email, password } = req.body;

      // Validate input using Joi
      const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
      });

      try {
        await schema.validateAsync({ username, email, password });
      } catch (error) {
        return res.status(401).send('All fields must be filled. <br><a href="/signup">Try again</a>');
      }

      // Hash the password using bcrypt
      const hashedPassword = await bcrypt.hash(password, 10); // Use salt rounds of 10

      const usersCollection = db.collection('users'); // Use the 'users' collection in BBY29 database
      try {
        await usersCollection.insertOne({ username, email, password: hashedPassword, points: 0});
        req.session.user = { username, email }; // Store user in session
        req.session.points = 0;
        res.redirect('/main'); // Redirect to members area
      } catch (err) {
        console.error("Error registering user:", err);
        res.status(500).send('Failed to register user');
      }
    });

    app.get('/login', (req, res) => {
      let doc = fs.readFileSync('./html/login.html', 'utf8');
      res.send(doc);
    });

    app.post('/login', async (req, res) => {
      const { email, password } = req.body;

      // Validate input using Joi
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
      });

      try {
        await schema.validateAsync({ email, password });
      } catch (error) {
        return res.status(401).send('Invalid email/password. <br><a href="/login">Try again</a>');
      }

      const usersCollection = db.collection('users'); // Use the 'users' collection in BBY29 database
      const user = await usersCollection.findOne({ email });

      if (!user) {
        console.log('User not found');
        return res.status(401).send('Invalid email/password. <br><a href="/login">Try again</a>');
      }

      // Compare hashed password with provided password using bcrypt
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        console.log('Incorrect password');
        return res.status(401).send('Invalid email/password. <br><a href="/login">Try again</a>');
      }

      // If login is successful, store user in session and redirect
      req.session.user = { username: user.username };
      return res.redirect('/main');
    });

    app.get('/logout', (req, res) => {
            //destroy session
            req.session.destroy(err => {
                if (err) {
                    console.error('Error destroying session:', err);
                }
                res.redirect('/');
            });
        });

    app.get('/main', (req, res) => {
      var point = req.session.points;
      res.render('main', {points: point});
    });

    app.post('/addPoint',async (req,res) => {
      
      var currentPoints = req.session.points;
      const filter = { username: req.session.username };
      /* Set the upsert option to insert a document if no documents match
      the filter */
      
      // Specify the update to set a value for the plot field
      const updateDoc = {
        $set: {
          points: currentPoints+5
        },
      };
      // Update the first document that matches the filter
      const usersCollection = db.collection('users');
      const result = await usersCollection.updateOne(filter, updateDoc);
      req.session.points = currentPoints+5;
      console.log(req.session.points);
      res.redirect('/main');
  });

    app.get('/post', (req, res) => {
      let doc = fs.readFileSync('./html/post.html', 'utf8');
      res.send(doc);
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
