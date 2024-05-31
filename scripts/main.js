document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const uploadSuccess = urlParams.get('upload');

    if (uploadSuccess === 'success') {
      const successMessageDiv = document.getElementById('success-message');
      successMessageDiv.style.display = 'block';

      // Optionally, refresh the page after a short delay
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 3000); // Refresh after 3 seconds
    }
  });

  // Hide the background image and display the dropdown for AI chat configuration
  const initBtn = document.querySelector('.index-btn');
  const aiChatConfig = document.querySelector('.d-inline-flex');
  initBtn.addEventListener('click', () => {
    initBtn.style.display = 'none';
    document.getElementById('ai-chat-bg').style.display = 'none';
    aiChatConfig.style.transition = '2s';
  });

  const startAIChatBtn = document.getElementById('start-chat-container');
  startAIChatBtn.addEventListener('click', () => {
    window.location.href = '/aichat-loading';
  })

  const startTrainingPlanBtn = document.getElementById('start-training-plan');
  startTrainingPlanBtn.addEventListener('click', () => {
    window.location.href = '/ai-training-questions';
  });

  const startTaskBtnGroup = document.querySelectorAll('.view-task');
  startTaskBtnGroup.forEach(button => {
   button.addEventListener('click', async () => {
    
    // Find the closest parent with the class 'task-item'
    const taskItem = button.closest('.task-item');
    const todoTask = taskItem.textContent.trim(); // Extract the text
    console.log('todo content', todoTask);

    // Send the user's input to the AI API
    const response = await fetch('/GroqChatCompletion', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
          question: "Please give me specific instruction on how to do this: " + todoTask
      }),
  });

  // Extract the response data
  const responseData = await response.json();

  // Update the HTML content with the response
  localStorage.setItem('responseData', JSON.stringify(responseData.message));

  console.log(responseData.message);
  });
});

// Display date
const now = new Date();
const dayOfWeek = now.toLocaleString('en-US', {weekday: 'long'});
const dateString = `${dayOfWeek}, ${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
document.getElementById('date-display').innerHTML = dateString;

// Firework animation for the leader board
function randomColor() {
  var minBrightness = 100; // Minimum brightness value to exclude dark colors
  var r, g, b;
  do {
    r = Math.floor(Math.random() * 256);
    g = Math.floor(Math.random() * 256);
    b = Math.floor(Math.random() * 256);
  } while ((r * 0.299 + g * 0.587 + b * 0.114) < minBrightness); // Calculate brightness using luminance formula
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

var sparks = [];

function createSpark() {
  var spark = document.createElement('div');
  spark.classList.add('spark');
  spark.style.top = Math.floor(Math.random() * (document.getElementById('leaderboard').offsetHeight - 20)) + 'px';
  spark.style.left = Math.floor(Math.random() * (document.getElementById('leaderboard').offsetWidth - 20)) + 'px';
  document.getElementById('leaderboard').appendChild(spark);
}

function createFirework() {
  var firework = document.createElement('div');
  firework.classList.add('firework');
  firework.style.top = Math.random() * 100 + '%'; // Random top position within the leaderboard div
  firework.style.left = Math.random() * 100 + '%'; // Random left position within the leaderboard div
  firework.style.backgroundColor = randomColor(); // Set random color
  document.getElementById('leaderboard').appendChild(firework);
}

function animate() {
  var startTime = Date.now(); // Record the start time
  var intervalId = setInterval(function() {
    if (Date.now() - startTime < 10000) { // Continue creating fireworks for 5 seconds
      createSpark();
      document.querySelector('.firework').style.backgroundColor = randomColor();
      createFirework();
    } else {
      clearInterval(intervalId); // Stop the interval after 5 seconds
    }
  }, 1000); // Adjust interval as needed
}

animate();


const communityBtn = document.getElementById('home');
communityBtn.addEventListener('click', () => {
  window.location.href = '/community';
})

