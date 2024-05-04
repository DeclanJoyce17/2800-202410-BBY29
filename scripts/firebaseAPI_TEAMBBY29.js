//----------------------------------------
// This code is reused from the previous project.
// Credits: Course 1800 - Instructor Ms Carly Orr
//  FitUp web app's Firebase configuration
//----------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyCYZHuxwD2nETWwgc6eH11uXmlKlx2GyHo",
    authDomain: "comp1800-bby14-b87af.firebaseapp.com",
    projectId: "comp1800-bby14-b87af",
    storageBucket: "comp1800-bby14-b87af.appspot.com",
    messagingSenderId: "146512146276",
    appId: "1:146512146276:web:c76e20f4075f1bc8f5d471",
    measurementId: "G-9M2Q3B13XP"
  };
  
  //--------------------------------------------
  // initialize the Firebase app
  // initialize Firestore database if using it
  //--------------------------------------------
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const storage = firebase.storage();
  
  
