/**
 * Module augmentation for firebase/auth so TypeScript knows about the
 * getReactNativePersistence helper shipped by the modular SDK. Without this
 * declaration Expo projects raise type errors when using AsyncStorage persistence.
 */
import type { Persistence } from "firebase/auth";

declare module "firebase/auth" {
  /**
   * Returns a persistence adapter that stores auth state in React Native AsyncStorage.
   */
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void> | void;
    getItem(key: string): Promise<string | null> | string | null;
    removeItem(key: string): Promise<void> | void;
  }): Persistence;
}
