/**
 * firebaseConfig.ts
 * -----------------
 * Centralized Firebase bootstrap logic. We lazily initialize the app once and
 * expose the strongly typed service instances (auth, firestore, storage) so the
 * rest of the codebase can import them without duplicating setup concerns.
 */
import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Explicit casts so TypeScript enforces the presence of required keys at build time.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env
    .EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID as string,
};

// Reuse an existing Firebase app instance when hot reloading to avoid duplicate initialization warnings.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        // AsyncStorage persistence ensures native sign-in survives app restarts.
        persistence: getReactNativePersistence(AsyncStorage),
      });
export const db = getFirestore(app);
export const storage = getStorage(app);
