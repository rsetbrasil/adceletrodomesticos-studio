
// /src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration using environment variables for security
// These values are automatically populated by Firebase App Hosting.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};


// Initialize Firebase
// Check if the app is already initialized to prevent errors during hot-reloading
const app = (typeof window !== 'undefined' && !getApps().length) ? initializeApp(firebaseConfig) : (typeof window !== 'undefined' ? getApp() : undefined);
const db = app ? getFirestore(app) : undefined;
const auth = app ? getAuth(app) : undefined;


export { db, auth, app };
