//---------------------------------------------------
// This code is provided by the Groq API library with
// modification for our own project
//---------------------------------------------------

"use strict";
require('dotenv').config();
const fs = require("fs");

const express = require('express');
const app = express();

const port = process.env.PORT || 3000;
app.use("/scripts", express.static("./scripts"));
app.use(express.urlencoded({ extended: true })); // Middleware to parse form data


const Groq = require("groq-sdk");
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

app.get('/', (req, res) => {
    let doc = fs.readFileSync("./html/new.html", "utf8");
    res.send(doc);
})

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

app.listen(port, () => {
    console.log("Node appplication listening on port " + port);
});