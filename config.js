
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

    function isValidSession(req) {
      if (req.session.authenticated) {
        return true;
      }
      return false;
    }

    function sessionValidation(req, res, next) {
      if (isValidSession(req)) {
        next();
      }
      else {
        res.redirect('/login');
      }
    }

    app.get('/', (req, res) => {
      if (req.session.authenticated) {
        res.redirect('/main');
      }
      else {
        let doc = fs.readFileSync("./html/index.html", "utf8");
        res.send(doc);
      }
    });

    app.get('/signup', (req, res) => {
      if (req.session.authenticated) {
        res.redirect('/main');
      }
      else {
        let doc = fs.readFileSync('./html/signup.html', 'utf8');
        res.send(doc);
      }
    });

    app.get('/fitTasks', sessionValidation, async (req, res) => {

      var point = req.session.points;
      const usersCollection = db.collection('users');
      const result = await usersCollection.find({ email: req.session.email }).project({ email: 1, username: 1, password: 1, points: 1, _id: 1, fitTasks: 1 }).toArray();
      res.render('fitTasks', { points: point, task1: result[0].fitTasks[0], task2: result[0].fitTasks[1], task3: result[0].fitTasks[2] });


    });

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

      await usersCollection.insertOne({ username: username, email: email, password: hashedPassword, time: time, points: 0 });
      console.log("Inserted user");
      req.session.authenticated = true;
      req.session.username = username;
      req.session.points = 0;
      req.session.cookie.maxAge = expireTime;
      res.redirect('/main');
    });

    app.get('/login', (req, res) => {
      if (req.session.authenticated) {
        res.redirect('/main');
      }
      else {
        let doc = fs.readFileSync('./html/login.html', 'utf8');
        res.send(doc);
      }
    });

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

    app.get('/logout', (req, res) => {
      //destroy session
      req.session.destroy(err => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        res.redirect('/');
      });
    });

    app.get('/main', sessionValidation, (req, res) => {
      var point = req.session.points;
      res.render('main', { points: point });
    });

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

    app.post('/addPointFit', sessionValidation, async (req, res) => {

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
      res.redirect('/fitTasks');
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
