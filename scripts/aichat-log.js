
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

// document.addEventListener('DOMContentLoaded', async () => {
//     // Send an HTTP request to the Node.js script
//     const response = await fetch('http://localhost:3000/GroqChatCompletion');
//     const data = await response.json();
  
//     // Update the HTML element with the chat completion response
//     app.textContent = data.message;
//   });

document.addEventListener('DOMContentLoaded', async () => {
    const warning = document.getElementById('warning');
    const form = document.getElementById('chat-input-form');
    const questionInput = document.getElementById('chat-question');
    const responseDiv = document.getElementById('ai-response-test');
    const userInputDisplay = document.getElementById('user-input-test');

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the form from submitting normally

        warning.style.display = 'none';
        document.getElementById('user-input-test').style.display = 'block';
        document.getElementById('ai-response-test').style.display = 'block';
        const userInput = questionInput.value.trim(); // Get the user's input from the form

        // Send the user's input to the server
        const response = await fetch('http://localhost:3000/GroqChatCompletion', {
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
    });
});
