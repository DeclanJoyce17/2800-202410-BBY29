function ajaxGET(url, callback) {

    const xhr = new XMLHttpRequest();

    xhr.onload = function () {
        let value = this.responseText;
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            value = this.responseText;
            callback(this.responseText);

        } else {
            console.log(this.status);
        }
    }
    xhr.open("GET", url); // localhost:8000/galleries?format=html
    xhr.send();

}


const form = document.getElementById("form");

// form.addEventListener('submit', async(e) => {
//     e.preventDefault();
//     const message = document.getElementById('question').value;
    
//     const xhr = new XMLHttpRequest();

//     xhr.open('POST',  'https://api.open.com/openai/v1/chat/completions ', true);
//     xhr.setRequestHeader("Content-Type", 'application/json');
//     xhr.onload = async function() {
//         if (xhr.status == 200) {
//             const response = await xhr.responseText;
//             document.getElementById('response').innerHTML = JSON.stringify(JSON.parse(response, null, 2));
//         } else {
//             document.getElementById('response').innerHTML = 'Sorry, unable to respond right now.';
//         }
//     }
//     xhr.send();
// });

// async function getGrogChatCompletion() {
//     return groq.chat.completions.create({
//         messages: [
//             {
//                 role: "user",
//                 content: "Tell a legend that is not well known"
//             }
//         ],
//         model: "mixtral-8x7b-32768"
//     });
// }

// Create an event listener for button clicks
form.addEventListener('submit', async () => {
    // Send an HTTP request to the Node.js script
    const response = await fetch('http://localhost:3000/GroqChatCompletion');
    const data = await response.json();
  
    // Update the HTML element with the chat completion response
    app.textContent = data.message;
  });