// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_iDdchFYPvxYWxprjsjvxLiQgiXPP5Fg",
  authDomain: "dailylifeplanner-402c9.firebaseapp.com",
  projectId: "dailylifeplanner-402c9",
  storageBucket: "dailylifeplanner-402c9.firebasestorage.app",
  messagingSenderId: "407951821793",
  appId: "1:407951821793:web:62c1beb3587b01c33aa0a0",
  measurementId: "G-KEEKS5V8CM"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
// Optionally export analytics if needed elsewhere
// export const analytics = getAnalytics(firebaseApp);