function redirectToLogin(event) {
    console.log("redirecting");
    event.preventDefault();
    window.location.href = '/login';
}