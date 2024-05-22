const startChatBtn = document.getElementById('initiate-chat');
startChatBtn.addEventListener('click', (e) => {
    e.preventDefault();

    window.location.href = '/aichat-loading';
})