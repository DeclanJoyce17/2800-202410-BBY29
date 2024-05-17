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
    progressBar.value = progress;
}

var textContent = " I am interested in ";

// Get the value of the selected button
document.getElementById('topic').addEventListener('click', function (event) {
    const clickedContainer = event.target.closest('.icon-container');
    if (clickedContainer) {
        textContent += clickedContainer.querySelector('.topic-text').textContent;
        console.log(textContent); // save the text content
    }
});



document.addEventListener('DOMContentLoaded', async () => {

    const continueButton = document.getElementById("continue-ctn");

    continueButton.addEventListener("click", async () => {

        let selectedValues = {
            checkboxes: [],
            list: 'My age is' + 0,
            link: 'I want to exercise ' + 0 + " times a week",
            button: "I want to do these activities: " + textContent,
        };

        // selectedValues.button = button;
        console.log(selectedValues);

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
        var freq = "I want to work out ";
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
                    + goals + "\n" + age + "\n" + freq + "\n" + textContent
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