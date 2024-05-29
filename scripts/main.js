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