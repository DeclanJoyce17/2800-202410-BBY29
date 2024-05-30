const progressBar = document.getElementById("progress-bar");
const checkboxes = document.querySelectorAll(".form-check-input");

let totalCheckboxes = checkboxes.length;
let checkedCheckboxes = 0;

checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
            checkedCheckboxes++;
        } else {
            checkedCheckboxes--;
        }

        updateProgressBar();
    });
});

function updateProgressBar() {
    const progress = (checkedCheckboxes / totalCheckboxes) * 100;
    progressBar.innerHTML = progress.toFixed(2) + '%';
    progressBar.innerHTML = progress + '%';
    progressBar.style.setProperty('--bs-progress-bar-bg', '#FF8624', 'width', '25%');
}

var textContent = " I am interested in ";

// Function to update textContent with toggled divs' inner HTML content
function updateTextContent() {
    textContent = " I am interested in "; // Reset the textContent
    const activeDivs = document.querySelectorAll('.icon-container.active');

    activeDivs.forEach(div => {
        textContent += div.querySelector('.topic-text').innerHTML + ", ";
    });

    console.log(textContent); // Log the updated textContent
}


document.addEventListener('DOMContentLoaded', async () => {

    const continueButton = document.getElementById("continue-ctn");

    continueButton.addEventListener("click", async () => {

        // Get the values of the checked checkboxes
        var goals = 'My fiteness goals are: ';
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach((checkbox) => {
            goals += checkbox.id + ", ";
        });

        var age = "My age is: ";
        // Get the value of the selected list item
        const listItems = document.querySelectorAll(".list-group-item");
        for (let i = 0; i < listItems.length; i++) {
            if (listItems[i].classList.contains("active")) {
                age += listItems[i].innerText;
                break;
            }
        }

        // Get the href value of the selected link
        var freq = "I want to commit ";
        const links = document.querySelectorAll(".nav-link");
        for (let i = 0; i < links.length; i++) {
            if (links[i].classList.contains("active")) {
                freq += links[i].textContent + " times a week";
                break;
            }
        }

        // Send the user's input to the AI API
        const response = await fetch('http://localhost:2800/GroqChatCompletion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                question: "I want to have a personalized fitness training plan based on the information that I provide as follow"
                    + goals + "\n" + age + "\n" + freq + "\n" + textContent + ". Your answer should be concise. Please remove all special characters"
                    + "asterisk (*) from your response. Please make appropriate sentences and paragraphs to ensure readibility for humans."
            }),
        });

        // Extract the response data
        const responseData = await response.json();

        // Update the HTML content with the response
        localStorage.setItem('responseData', JSON.stringify(responseData));

        console.log(responseData.message);

        window.location.href = '/ai-training-scan-request';
    });
});

const homeBtn = document.getElementById('home');
homeBtn.addEventListener('click', () => {
    window.location.href = '/main';
});

// Toggle the age group button
const ageGroups = document.querySelectorAll('.list-group-item');

ageGroups.forEach(age => {
    age.addEventListener('click', () => {
        // Remove active class from all items
        ageGroups.forEach(age => {
            age.classList.remove('active');
        });

        // Toggle active class on the clicked item
        age.classList.toggle('active');
    });
});

// Toggle the frequency button
const freqGroup = document.querySelectorAll('.nav-link');

freqGroup.forEach(freq => {
    freq.addEventListener('click', () => {
        // Remove 'active' class from all links
        freqGroup.forEach(freq => {
            freq.classList.remove('active');
        });

        // Add 'active' class to the clicked link
        freq.classList.add('active');
    });
});

// Toggle the topic 
const topicGroup = document.querySelectorAll('.icon-container');

topicGroup.forEach(topic => {
    topic.addEventListener('click', () => {
            topic.classList.toggle('active');
            updateTextContent();
    });
});

// Save the value for the topic to toggle the topic in AI recommendation page
// Function to save toggled divs' inner HTML content into local storage
function saveToggledDivs() {
    const activeDivs = document.querySelectorAll('.icon-container.active');
    const contentArray = [];

    activeDivs.forEach(div => {
        contentArray.push(div.innerHTML);
    });

    // Save the content array into local storage
    localStorage.setItem('toggledDivsContent', JSON.stringify(contentArray));
}