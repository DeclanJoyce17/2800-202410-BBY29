setTimeout(function() {
  window.location.href = '/ai-training-female-body-scan-result'; 
}, 6000); // redirect after 6 seconds

const cancelBtn = document.getElementById('cancel-ctn');
cancelBtn.addEventListener('click', () => {
window.location.href = '/ai-training-recommendation';
})

const homeBtn = document.getElementById('home');
homeBtn.addEventListener('click', () => {
  window.location.href = '/main';
});