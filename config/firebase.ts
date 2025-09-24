import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Debug: Log Firebase configuration (without sensitive data)
console.log('Firebase Config Check:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
  hasAppId: !!firebaseConfig.appId,
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase auth
const auth = getAuth(app);

// Initialize Firestore with multiple fallback methods
let db: any;
try {
  // Method 1: Try with long polling first
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
  console.log('✅ Firestore initialized with long polling');
} catch (longPollingError) {
  console.warn('Long polling failed, trying standard initialization...', longPollingError);
  try {
    // Method 2: Try standard initialization
    db = getFirestore(app);
    console.log('✅ Firestore initialized with standard method');
  } catch (standardError) {
    console.error('❌ All Firestore initialization methods failed:', standardError);
    // Method 3: Try with different settings
    try {
      db = initializeFirestore(app, {
        experimentalForceLongPolling: false,
      });
      console.log('✅ Firestore initialized with backup method');
    } catch (backupError) {
      console.error('❌ Complete Firestore initialization failure:', backupError);
      throw backupError;
    }
  }
}

console.log('Firebase initialized successfully');
console.log('Firestore instance:', db.app.name);
console.log('Project ID:', firebaseConfig.projectId);

// Export Firebase services
export { auth };
export { db };
export const storage = getStorage(app);
export type { Firestore } from 'firebase/firestore';

export default app;
