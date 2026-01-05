export const environment = {
  production: false,

  firebase: {
    apiKey: "AIzaSyCQd1D6NbL4CUhEJiiIsDj31zLyZTCcy0U",
    authDomain: "bubblehope-53b8f.firebaseapp.com",
    projectId: "bubblehope-53b8f",
    storageBucket: "bubblehope-53b8f.appspot.com",
    messagingSenderId: "537902604580",
    appId: "1:537902604580:web:6052b8e7425c567c4613b1",
  },

  apiBaseUrl: "https://alhendalcompany-001-site1.stempurl.com"
};





// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCQd1D6NbL4CUhEJiiIsDj31zLyZTCcy0U",
  authDomain: "bubblehope-53b8f.firebaseapp.com",
  projectId: "bubblehope-53b8f",
  storageBucket: "bubblehope-53b8f.firebasestorage.app",
  messagingSenderId: "537902604580",
  appId: "1:537902604580:web:6052b8e7425c567c4613b1",
  measurementId: "G-06SBVT1GRE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);