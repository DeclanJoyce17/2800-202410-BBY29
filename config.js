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
const multer = require('multer')

require("./utils.js");

const app = express();
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

async function connectToMongo() {
  const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    console.log('Connected to MongoDB!');
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
        await usersCollection.insertOne({ username, email, password: hashedPassword });
        req.session.user = { username, email }; // Store user in session
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

    //main page - check the user, display the remained tasks, display the user name in the current session;
    app.get('/main', async (req, res) => {

      if (!req.session.user || !req.session.user.username) {
          res.redirect('/login');  // Redirect to login if no user session
          return;
      }
  
      let doc = fs.readFileSync('./html/main.html', 'utf8'); // Ensure this path is correct
  
      try {
          const usersCollection = db.collection('users');
          const user = await usersCollection.findOne({ username: req.session.user.username });
  
          if (!user || !user.fitTasks) {
              console.error('User not found or no tasks available');
              doc = doc.replace('<!-- TASKS_PLACEHOLDER -->', '<p>No tasks on your list</p>');
              res.status(404).send(doc);
              return;
          }
  
        // Generate tasks HTML
        let tasksHtml = user.fitTasks.map(task => `<li>${task}</li>`).join('');
        
        // written in comment form, because those will be in HTML
        doc = doc.replace('<!-- TASKS_PLACEHOLDER -->', tasksHtml);
        doc = doc.replace('<!-- USERNAME_PLACEHOLDER -->', `${req.session.user.username}`);
  
          res.send(doc);
      } catch (err) {
          console.error("Error fetching user or tasks:", err);
          res.status(500).send('Failed to fetch user data');
      }
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
