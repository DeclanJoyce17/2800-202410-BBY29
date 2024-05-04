document.addEventListener('DOMContentLoaded', function () {
    // Initialize Firebase Auth and Firestore
    const db = firebase.firestore();
    const auth = firebase.auth();

    // Function to delete a task entry
    function deleteTask(userId, taskID) {
        // it goes into user's subcollection('task') and delete the specific task(taskID).
        db.collection('users').doc(userId).collection('task').doc(taskId).delete().then(() => {
            console.log("Document successfully deleted!");
            // Instead of refetching, just remove the element from DOM
            removeTaskFromDOM(taskID);
        }).catch((error) => {
            console.error("Error removing document: ", error);
        });
    }
    
    function removeTaskFromDOM(taskId) {
        const taskElement = document.getElementById(`task-${taskId}`);
        if (taskElement) {
            // Removes the task element from the DOM
            taskElement.remove();
        }
    }

    // Sets up an observer on the Auth object to listen for changes in the user's sign-in state.
    auth.onAuthStateChanged(user => {
        if (user) {
             // Calls a function to fetch and display the task entries for the signed-in user using their unique ID.
            fetchAndDisplayTask(user.uid);
        } else {
            console.log("User is not signed in.");
        }
    });

    // Obtain a reference to the container that holds all task entries
    const taskContainer = document.getElementById('taskEntriesContainer');
    // Add a click event listener to the taskContainer. This listener will react to all clicks within the container.
    taskContainer.addEventListener('click', function (e) {
        // Check if the clicked element is a delete button. This is determined by the presence of the 'delete-btn' class.
        if (e.target && e.target.matches('.delete-btn')) {
            // Retrieve the unique ID of the task entry to be deleted from the clicked button's data-task-id attribute.
            const taskId = e.target.getAttribute('data-task-id');
            // Attempt to retrieve the current user's UID from Firebase Auth. If no user is logged in, this will be null.
            const userId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
            // Check if a user ID was successfully retrieved, meaning a user is logged in.
            if (userId) {
                // Display a confirmation dialog to the user, ensuring they want to proceed with deletion.
                const isConfirmed = confirm("Are you sure you want to delete this task entry?");
                // If the user confirms the deletion, proceed to call the deletetask function with the user ID and task ID.
                if (isConfirmed) {
                    deletetask(userId, taskId);
                }
            } else {
                // Log an error if no user is signed in. Deleting task entries requires user authentication.
                console.error("User is not signed in.");
            }
        }
    });

    // Defines a function that fetches task entries for a specific user and displays them on the web page.
    function fetchAndDisplayTask(userId) {
        const taskRef = db.collection('users').doc(userId).collection('task');
        taskRef.get().then(querySnapshot => {
            const taskContainer = document.getElementById('taskEntriesContainer');
            taskContainer.className = 'task-list-container'; // Ensure consistent styling
            taskContainer.innerHTML = ''; // Clear previous entries
    
            if (querySnapshot.empty) {
                taskContainer.innerHTML = '<p>No tasks found. Add some tasks!</p>'; // User feedback if no tasks
                return;
            }
    
            let tasksHtml = '';
            querySnapshot.forEach(doc => {
                const task = doc.data();
                tasksHtml += `
                    <div class="task-entry">
                        <h4>${task.title || 'No Title'}</h4>
                        <p>${task.content}</p>
                    </div>
                    <button class="btn btn-info delete-btn" data-task-id="${taskId}">done</button>
                `;
            });
    
            taskContainer.innerHTML = tasksHtml; // Update the DOM once with all task entries
        }).catch(error => {
            console.error("Error fetching task: ", error);
            taskContainer.innerHTML = '<p>Error loading tasks. Please try again later.</p>'; // Error feedback
        });
});