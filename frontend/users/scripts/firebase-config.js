/**
 * Firebase Configuration for officeFlow
 * Client-side Firebase initialization
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Firebase configuration
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAxB4aP9vgKM0Sqke9VNNLwGeXDu_rDvwo",
  authDomain: "office-flow-2232d.firebaseapp.com",
  projectId: "office-flow-2232d",
  storageBucket: "office-flow-2232d.firebasestorage.app",
  messagingSenderId: "1009116060762",
  appId: "1:1009116060762:web:722004573be18d20980c63"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { 
    auth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
};
