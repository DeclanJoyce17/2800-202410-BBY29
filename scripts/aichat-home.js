const initiateChatBtn = document.getElementById('plus');
initiateChatBtn.addEventListener('click', (e) => {
    e.preventDefault();

    window.location.href = '/aichat-config';
})