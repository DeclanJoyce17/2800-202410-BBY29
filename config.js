"use strict";
require('dotenv').config();
const fs = require("fs");

const express = require('express');
const app = express();

const port = process.env.PORT || 3000;
app.use("/scripts", express.static("./scripts"));


const Groq = require("groq-sdk");
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

app.get('/', (req, res) => {
    let doc = fs.readFileSync("./html/new.html", "utf8");
    res.send(doc);
})

app.get('/GroqChatCompletion', async (req, res) => {
    try {
      const chatCompletion = await getGroqChatCompletion();
      res.json({
        message: chatCompletion.choices[0]?.message?.content,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  
  
// async function main() {
//     // console.log(groq);
//     const chatCompletion = await getGroqChatCompletion();
//     // console.log(chatCompletion)
//     // Print the completion returned by the LLM.
//     process.stdout.write(chatCompletion.choices[0]?.message?.content || "");
// }
async function getGroqChatCompletion() {
    return groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: "Tell a legend that is not well known"
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