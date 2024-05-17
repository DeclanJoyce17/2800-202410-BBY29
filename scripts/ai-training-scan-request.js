document.addEventListener('DOMContentLoaded', () => {
    const toggleVideo = (event) => {
      const video = event.target;
      let otherVideo = null;
  
      if (video.id === 'female') {
        otherVideo = document.getElementById('male');
      } else if (video.id === 'male') {
        otherVideo = document.getElementById('female');
      }
  
      if (otherVideo !== null) {
        video.classList.add('fade');
        setTimeout(() => {
          otherVideo.classList.remove('fade');
        }, 0);
  
        // Save the state of which video was toggled
        if (video.id === 'female') {
          sessionStorage.setItem('selectedVideo', 'female');
        } else if (video.id === 'male') {
          sessionStorage.setItem('selectedVideo', 'male');
        }
      }
    };
  
    ['female', 'male'].forEach((videoId) => {
      document.getElementById(videoId).addEventListener('click', toggleVideo);
    });
  });
  
      const nextPage = () => {
        // Navigate to another page
        window.location.href = "/ai-training-camera-feed";
      };
  
  
      document.getElementById('continue').addEventListener('click', nextPage);