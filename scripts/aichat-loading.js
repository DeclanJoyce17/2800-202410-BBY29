var loadingProgress = document.querySelector('.loading-progress');
var loadingBar = document.querySelector('.loading-bar');
var progress = 0;

function animateProgress() {
    progress += 10;
    loadingProgress.style.width = `${progress}%`;
    loadingProgress.classList.add('animate'); /* add animate class */
    if (progress < 1500) {
      requestAnimationFrame(animateProgress);
    } else {
      window.location.href = '/aichat-log';
    }
  }
  
  animateProgress();