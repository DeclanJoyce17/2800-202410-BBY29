// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBM1I5SCIehqtRSMG7un8ZWVE57JNXNzY4",
  authDomain: "comp2800bby29.firebaseapp.com",
  projectId: "comp2800bby29",
  storageBucket: "comp2800bby29.appspot.com",
  messagingSenderId: "1041457682810",
  appId: "1:1041457682810:web:efbf9233966b50f6e99ec3",
  measurementId: "G-PSLTGMNG93"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

