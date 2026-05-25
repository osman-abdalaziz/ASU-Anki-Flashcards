import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; // <--- جديد

const firebaseConfig = {
    apiKey: "AIzaSyAdmMKFEcCJvhKKv2no_ptgNve_vxPrSf4",
    authDomain: "asu-anki-flashcards.firebaseapp.com",
    projectId: "asu-anki-flashcards",
    storageBucket: "asu-anki-flashcards.firebasestorage.app",
    messagingSenderId: "422843832096",
    appId: "1:422843832096:web:085f661b3aab5081cbe945",
    measurementId: "G-W0N6VJZRCY",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app); // <--- جديد: تشغيل قاعدة البيانات

// تصدير الأدوات (أضفنا db للقائمة)
export { auth, provider, db };

export const DEFAULT_BANNER_URL = "images/default_banner.webp";
