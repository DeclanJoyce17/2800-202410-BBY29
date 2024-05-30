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

    window.location.href = '/body-motion-capture';
  });
});

// Display date
const now = new Date();
const dayOfWeek = now.toLocaleString('en-US', {weekday: 'long'});
const dateString = `${dayOfWeek}, ${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
document.getElementById('date-display').innerHTML = dateString;