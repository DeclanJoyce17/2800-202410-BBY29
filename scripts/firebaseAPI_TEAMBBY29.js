//----------------------------------------
//  Our web app's Firebase configuration
//----------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyD4oqIiloUlDC0BxLOdod29thu-XJFBflY",
    authDomain: "comp2800-bby29.firebaseapp.com",
    projectId: "comp2800-bby29",
    storageBucket: "comp2800-bby29.appspot.com",
    messagingSenderId: "492966192171",
    appId: "1:492966192171:web:4661ca15b5d81d02b4366e",
    measurementId: "G-CSFFBP0QMK"
  };
  
  //--------------------------------------------
  // initialize the Firebase app
  // initialize Firestore database if using it
  //--------------------------------------------
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const storage = firebase.storage();