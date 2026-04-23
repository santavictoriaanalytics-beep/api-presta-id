import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjydGW5A7dH_8S_EKgHDQas5Odyw36mVA",
  authDomain: "presta-id-monitor-v2.firebaseapp.com",
  projectId: "presta-id-monitor-v2",
  storageBucket: "presta-id-monitor-v2.firebasestorage.app",
  messagingSenderId: "624664881771",
  appId: "1:624664881771:web:c07243d69c047ec9d41f2e"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
