/**
 * AuthContext
 * -----------
 * Centralises Firebase authentication state. It hydrates a richer AppUser model by
 * pairing the auth profile with the corresponding Firestore document and exposes
 * sign-out helpers to downstream components.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { AppUser, UserRole } from "../types";

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  signOutUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth changes and sync the richer AppUser document when it exists.
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      unsubscribeUserDoc?.();
      unsubscribeUserDoc = null;

      setFirebaseUser(user);
      if (!user) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const defaultRole: UserRole = "volunteer";
        // On first login we persist a baseline profile so the profile screen has data.
        await setDoc(ref, {
          email: user.email,
          displayName: user.displayName || "",
          role: defaultRole,
          createdAt: serverTimestamp(),
        });
      }

      unsubscribeUserDoc = onSnapshot(
        ref,
        (docSnap) => {
          const data = docSnap.data();
          if (!data) {
            setAppUser(null);
            return;
          }

          setAppUser({
            id: user.uid,
            email: data.email,
            displayName: data.displayName,
            role: data.role as UserRole,
          });
          setLoading(false);
        },
        (error) => {
          console.warn("Failed to subscribe to user profile", error);
          setAppUser({
            id: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            role: "volunteer",
          });
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc?.();
    };
  }, []);

  const signOutUser = async () => {
    // Firebase signOut already clears persistence; the context state resets via listener.
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ firebaseUser, appUser, loading, signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
