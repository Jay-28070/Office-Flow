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
import {
  getFirestore,
  doc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase configuration
// Note: Firebase client API keys are designed to be public and visible in browser code
// Security is enforced through Firebase Security Rules, not by hiding these keys
// Every Firebase web app has these keys visible in the source code
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
const db = getFirestore(app);

export {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  doc,
  onSnapshot
};
