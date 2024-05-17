const responseData = JSON.parse(localStorage.getItem('responseData'));
console.log("recommendation: ", responseData);
const rec = document.getElementById('ai-recommendation');
rec.textContent = responseData.message;
