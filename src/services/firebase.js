import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCdSWqfhthDa9itRWE9twBKh8YoyIc8Mbk",
    authDomain: "agentda-48ef7.firebaseapp.com",
    projectId: "agentda-48ef7",
    storageBucket: "agentda-48ef7.firebasestorage.app",
    messagingSenderId: "739940107946",
    appId: "1:739940107946:web:b1050b071d16ae3ffef2d3",
    measurementId: "G-67XYQ5E76Y"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
