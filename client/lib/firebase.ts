import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD7KlxN05OoSCGHwjXhiiYyKF5bOXianLY",
  authDomain: "keysystem-d0b86-8df89.firebaseapp.com",
  projectId: "keysystem-d0b86-8df89",
  storageBucket: "keysystem-d0b86-8df89.firebasestorage.app",
  messagingSenderId: "1048409565735",
  appId: "1:1048409565735:web:65b368e2b20a74df0dfc02",
  measurementId: "G-N1P4V34PE5",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize Analytics only in supported environments
isSupported().then((ok) => {
  if (ok) {
    try {
      getAnalytics(app);
    } catch {}
  }
});

export const auth = getAuth(app);
export const db = getFirestore(app);
