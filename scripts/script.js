const app = document.querySelector('#chat-completion');
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

document.addEventListener('DOMContentLoaded', async () => {
    // Send an HTTP request to the Node.js script
    const response = await fetch('http://localhost:3000/GroqChatCompletion');
    const data = await response.json();
  
    // Update the HTML element with the chat completion response
    app.textContent = data.message;
  });