const express = require('express');
const app = express();

const { groqConfig } = require('config');

app.get('/api/groq', async (req, res) => {
    // Handles Groq API requests
    const response = await groqConfig.chat.completion.create({
        messages: [
            {
                role: "user",
                content: "An web app for fitness and healthy diet"
            }
        ],
        model: 'mixtral-8x7b-32768'
    });

    res.json(response);
});