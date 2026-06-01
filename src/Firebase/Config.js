import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDEgc08Lgu3GL2HnMB74nFPYuzP1BZGyMU",
  authDomain: "proyecto-final-web-b270d.firebaseapp.com",
  projectId: "proyecto-final-web-b270d",
  storageBucket: "proyecto-final-web-b270d.firebasestorage.app",
  messagingSenderId: "847681037441",
  appId: "1:847681037441:web:ac9879403e9a029df15980"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app)
export const db = getFirestore(app)