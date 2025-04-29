// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  doc,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC43LDkmXcXYtqqP26B-TM4ZgVZa8Q9fOM",
  authDomain: "lost-n-found-unified-database.firebaseapp.com",
  projectId: "lost-n-found-unified-database",
  storageBucket: "lost-n-found-unified-database.firebasestorage.app",
  messagingSenderId: "1003382149020",
  appId: "1:1003382149020:web:e507cc98cfa1fc01c54259",
  measurementId: "G-ZYFGKRMVV8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);

const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Send user data to your backend
    await fetch("http://localhost:3001/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }),
    });
  } catch (error) {
    console.error("Google Sign-In Error:", error);
  }
};

export {
  db,
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  auth,
  provider,
  signInWithGoogle,
  storage,
};
