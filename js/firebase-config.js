// ==========================================
// SAIFA DESIGNS – FIREBASE CLOUD CONFIGURATION
// ==========================================
// Live Firebase Realtime Cloud Database Config

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCQWxaJUznSWz1bgHDtPpTHch0J2T8MAJk",
  authDomain: "saifa-designs.firebaseapp.com",
  databaseURL: "https://saifa-designs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "saifa-designs",
  storageBucket: "saifa-designs.firebasestorage.app",
  messagingSenderId: "1076024721327",
  appId: "1:1076024721327:web:b4d10e9c064d4de7ff395a",
  measurementId: "G-81DT7DWS1Y"
};

// Check if valid Firebase configuration is present
function isFirebaseConfigured() {
  return (
    typeof FIREBASE_CONFIG !== "undefined" &&
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.apiKey.startsWith("AIzaSy") &&
    FIREBASE_CONFIG.projectId === "saifa-designs"
  );
}
