document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('button[id^="doneButton"]');
    buttons.forEach(button => {
        const taskId = button.id.replace('doneButton', '');
        const form = document.getElementById(`doneForm${taskId}`); 
        
        button.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default form submission

            // Check if the button is already disabled
            if (button.disabled) {
                return;
            }

            // Submit the form
            form.submit();

            // Disable the button
            button.disabled = true;
            localStorage.setItem(`buttonDisabled${taskId}`, 'true');
            localStorage.setItem(`buttonDisabledTime${taskId}`, Date.now());

            // Set a timeout to re-enable the button after 1 hour
            setTimeout(() => {
                button.disabled = false;
                localStorage.removeItem(`buttonDisabled${taskId}`);
                localStorage.removeItem(`buttonDisabledTime${taskId}`);
            }, 3600000); // 1 hour in milliseconds
        });

        // On page load, check if the button should be disabled
        const buttonDisabled = localStorage.getItem(`buttonDisabled${taskId}`);
        const buttonDisabledTime = localStorage.getItem(`buttonDisabledTime${taskId}`);

        if (buttonDisabled && buttonDisabledTime) {
            const timeElapsed = Date.now() - buttonDisabledTime;
            if (timeElapsed < 60000) {
                button.disabled = true;
                setTimeout(() => {
                    button.disabled = false;
                    localStorage.removeItem(`buttonDisabled${taskId}`);
                    localStorage.removeItem(`buttonDisabledTime${taskId}`);
                }, 3600000 - timeElapsed);
            } else {
                // Clear local storage if more than 1 hour has passed
                localStorage.removeItem(`buttonDisabled${taskId}`);
                localStorage.removeItem(`buttonDisabledTime${taskId}`);
            }
        }
    });
});