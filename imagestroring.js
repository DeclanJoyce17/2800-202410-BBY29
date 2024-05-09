This is dev."use strict";
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

// Load utility functions from utils.js
require("./utils.js");

// initialize Express app
const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;
const nodeSessionSecret = process.env.NODE_SESSION_SECRET;

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // Middleware to parse form data

// first, store files in memory as Buffer objects by using multer
const storage = multer.memoryStorage()
// telling multer to use the previously defined memory storage for storing the files.
const upload = multer({ storage: storage });


/*********** connecting mongo ***************/
/************ uploading images link with the user ID ****************/

async function connectToMongo() {
  const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  // MongoDB and GridFS Initialization
  try {
    await client.connect();
    db = client.db('BBY29');
    bucket = new GridFSBucket(db, { bucketName: 'profileImg' });
    console.log('Connected to MongoDB and GridFS initialized!');
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
    console.log('Connected to MongoDB!');
    // Configure session middleware
    app.use(session({
      secret: nodeSessionSecret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: mongoUri,
        dbName: 'BBY29',
        collection: 'sessions',
        stringify: false,
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

    // Logging session data for debugging
    app.use((req, res, next) => {
      console.log(`Session data: ${JSON.stringify(req.session)}`);
      next();
    });

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

    app.get('/main', (req, res) => {
      let doc = fs.readFileSync('./html/main.html', 'utf8');
      res.send(doc);
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

    // Route to upload images
    app.post('/upload', upload.single('image'), async (req, res) => {
      if (!req.file) {
        return res.status(400).send('No file uploaded.');
      }
      if (!req.session || !req.session.user) {
        return res.status(401).send('Unauthorized access.');
      }

      const userId = req.session.user._id;
      const filename = req.file.originalname;
      const contentType = req.file.mimetype;
      const fileBuffer = req.file.buffer;

      try {
        const metadata = { contentType, userId };
        const fileId = await saveImageToMongoDB(fileBuffer, metadata, filename);
        console.log("File uploaded successfully with ID:", fileId);
        res.redirect('/main');
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).send(`Failed to upload image: ${error.message}`);
      }
    });

    app.get('/user-images', async (req, res) => {
      if (!req.session || !req.session.user) {
        return res.status(401).send('Unauthorized access');
      }

      const userId = req.session.user._id;  // Assuming user's ID is stored in session
      try {
        const imagesCursor = bucket.find({ "metadata.userId": userId });
        const images = await imagesCursor.toArray();
        res.render('userImages', { images });  // Passing images to a template
      } catch (error) {
        console.error('Failed to retrieve images:', error);
        res.status(500).send('Failed to retrieve images due to an internal error');
      }
    });

    async function saveImageToMongoDB(fileBuffer, metadata, filename) {
      const uploadStream = bucket.openUploadStream(filename, { metadata });
      uploadStream.write(fileBuffer);
      uploadStream.end();

      return new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });

  } catch (error) {
    console.error('Failed to retrieve image:', error);
    res.status(404).send('Image not found');
  }
};

// Route to serve images from GridFS
app.get('/images/:filename', async (req, res) => {
  const filename = req.params.filename;
  try {
    const downloadStream = bucket.openDownloadStreamByName(filename);
    res.setHeader('Content-Type', 'image/jpeg');  // Set the content type based on the image type, you might need to store this information or detect it
    downloadStream.pipe(res);  // Stream the image from GridFS directly to the response
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(404).send('Image not found');
  }
});

// module.exports = {
//     main,
//     getGroqChatCompletion
// };

// Route for handling 404 Not Found
app.get('*', (req, res) => {
  res.status(404).send('Page not found - 404');
});

app.listen(port, () => {
  console.log(`Node application listening on port ${port}`);
  initMongoDB().catch(err => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
});
connectToMongo().catch(console.error);


/*---------------------------------------------------------------------------

Eventually want to add "user id" when user upload the image into Mongo DB */

