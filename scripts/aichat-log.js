
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

        // Display the chat content
        document.getElementById('user-input-test').style.display = 'block';
        document.getElementById('ai-response-test').style.display = 'block';
        const userInput = questionInput.value.trim(); // Get the user's input from the form

        // Send the user's input to the server
        const response = await fetch('https://two800-202410-bby29-63o6.onrender.com/GroqChatCompletion', {
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

        // Update the HTML content with the response
        userInputDisplay.textContent = questionInput.value;
        questionInput.value = "";
        responseDiv.textContent = responseData.message;

        textToSpeech(responseDiv);
    });
});

// Convert text response to speech by sending the text content to backend which handles 
//Google Text to Speech API requests

async function textToSpeech(text) {

    const textInput = text.innerText.trim(); 
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
