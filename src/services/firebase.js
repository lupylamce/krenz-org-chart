import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyDY8GQtAbYOnUkUUMcp_SN_ijiPAm2Ky3c",
  authDomain: "krenz-org.firebaseapp.com",
  projectId: "krenz-org",
  storageBucket: "krenz-org.firebasestorage.app",
  messagingSenderId: "350471338404",
  appId: "1:350471338404:web:cc3db002b6cc0d551b6931"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'krenz-org-system';
const googleProvider = new GoogleAuthProvider();

export { auth, db, appId, googleProvider };
