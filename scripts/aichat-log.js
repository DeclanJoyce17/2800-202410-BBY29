
// Gets user input and send it to the API for processing

const app = document.querySelector('#chat-completion');
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

const chatLog = document.getElementById('chat-log-here');
const chatLogTemplate = document.getElementById('chat-log-template');

document.addEventListener('DOMContentLoaded', async () => {
    const warning = document.getElementById('warning');
    const form = document.getElementById('chat-input-form');
    const questionInput = document.getElementById('chat-question');
    const responseDiv = document.getElementById('ai-response-test');
    const userInputDisplay = document.getElementById('user-input-test');
    

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the form from submitting normally

        // Hide the warning when the users start a chat
        warning.style.display = 'none';

        const userInput = questionInput.value.trim(); // Get the user's input from the form

        // Send the user's input to the server
        const response = await fetch('http://localhost:2800/GroqChatCompletion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                question: userInput,
            }),
        });

        // Extract the response data
        const responseData = await response.json();
        const aiResponse = responseData.message;

        // Update the HTML content with the response
        if (userInput.trim()) {
            const userAvatarClassName = 'user-avatar-class';
            appendChatMessage(true, userInput, '/img/fitup2.png', null, null, 'chat-avatar', userAvatarClassName);
            appendChatMessage(false, aiResponse, '/img/ai-chat-bot.gif', 'response-message');
        }

        // Display the chat content
        document.querySelector('.user-message').style.display = 'block';
        document.querySelector('.ai-response').style.display = 'block';
        questionInput.value = "";
        textToSpeech(aiResponse);
    });
});

function appendChatMessage(isUserMessage, text, avatarUrl) {
    const chatTemplate = chatLogTemplate.content.cloneNode(true);

    if (isUserMessage) {
        chatTemplate.querySelector('.chat-text').innerHTML = text;
        chatTemplate.querySelector('.chat-text').setAttribute('class', 'user-chat-text');
        chatTemplate.querySelector('.chat-message').setAttribute('class', 'user-message');
        chatTemplate.querySelector('.avatar').src = avatarUrl;
        chatTemplate.querySelector('.avatar').setAttribute('class', 'user-avatar');
    } else {
        chatTemplate.querySelector('.chat-text').innerHTML = text;
        chatTemplate.querySelector('.chat-text').setAttribute('class', 'ai-response-text');
        chatTemplate.querySelector('.chat-message').setAttribute('class', 'ai-response');
        chatTemplate.querySelector('.avatar').src = avatarUrl;
        chatTemplate.querySelector('.avatar').setAttribute('class', 'ai-avatar');
    }

    chatLog.appendChild(chatTemplate);
}
// Convert text response to speech by sending the text content to backend which handles 
//Google Text to Speech API requests

async function textToSpeech(text) {
    const textInput = text.trim(); 
    // console.log(textInput);
    if (!textInput) {
        console.log('Error: Text content is empty');
        return;
    }
    // send a POST request to the server with the text content
    const response = await fetch('/text-to-speech', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textInput })
    });

    console.log("Response", response);

    if (response.ok) {
        // Once the server responds with the audio data, create and append the audio element
        const fileName = await response.text();
        const audioElement = document.createElement('audio');
        audioElement.controls = true;
        audioElement.autoplay = true;

        audioElement.src = '/img/text-to-speech-audios/' + fileName;

        const audioContainer = document.getElementById('audio-container');
        audioContainer.innerHTML = '';
        audioContainer.appendChild(audioElement);

    } else {
        console.log('Error: ', response.statusText);
    }
}
