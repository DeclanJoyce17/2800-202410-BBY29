const auth = firebase.auth();
const database = firebase.database();


function signup() {
    full_name = document.getElementById('name').value
    email = document.getElementById('email').value
    password = document.getElementById('password').value

    if (full_name == null || full_name <= 0) {
        return;
    }

    if (!validate_email(email)) {
        alert("Email is not correct format")
        return;
    }
    if (!validate_password(password)) {
        alert("Password is less than 7 characters");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(function() {

        })
        .catch(function(error) {
            var error_code = error.code;
            var error_message = error.message;

            alert(error_message);
        })


}



function validate_email(email) {
    expression = /^[^@]+@\w+(\.\w+)+\w$/
    if (expression.test(email)) {
        return true;
    }
    else return false;
}

function validate_password(password) {
    if (password < 6) {
        return false;
    }
    else return true;
}

