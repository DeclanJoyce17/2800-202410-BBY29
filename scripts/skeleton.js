//---------------------------------------------------
// This code is reused from the previous project 1800.
// Credit: Course Comp1800 - Instructor: Ms Carly Orr

// This function loads the parts of your skeleton 
// (navbar, footer, and other things) into html doc. 
//---------------------------------------------------
// function loadSkeleton(){
//     console.log($('#navbarPlaceholder').load('../text/nav.html'));
//     console.log($('#footerPlaceholder').load('../text/footer.html'));
// }
// loadSkeleton();  //invoke the function

//---------------------------------------------------
// This function loads the parts of your skeleton 
// (navbar, footer, and other things) into html doc. 
//---------------------------------------------------
function loadSkeleton() {

    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {                   //if the pointer to "user" object is not null, then someone is logged in
            // User is signed in.
            // Do something for the user here.
            console.log($('#navbarPlaceholder').load('../text/nav_after_login.html'));
            console.log($('#footerPlaceholder').load('../text/footer.html'));
        } else {
            // No user is signed in.
            console.log($('#navbarPlaceholder').load('../text/nav_before_login.html'));
            console.log($('#footerPlaceholder').load('../text/footer.html'));
        }
    });
}
loadSkeleton(); //invoke the function

// //------------------------------------------------
// // Call this function when the "logout" button is clicked
// //-------------------------------------------------
// function logout() {
//     firebase.auth().signOut().then(() => {
//         // Sign-out successful.
//         console.log("logging out user");
//       }).catch((error) => {
//         // An error happened.
//       });
// }