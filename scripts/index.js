function redirectToLogin(event) {
    console.log("redirecting");
    event.preventDefault();
    window.location.href = '/login';
}

function redirectToSignup(event) {
    console.log("redirecting");
    event.preventDefault();
    window.location.href = '/signup';
}