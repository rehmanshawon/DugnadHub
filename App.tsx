/**
 * App.tsx
 * --------
 * Application entry point that wires up top-level providers and the root navigator.
 * Providers are ordered to ensure that localization is available before auth logic
 * mounts, so every screen can immediately render in the selected language.
 */
import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { LanguageProvider } from "./src/context/LanguageContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  // Wrap the navigation hierarchy with providers so context values are globally available.
  return (
    <LanguageProvider>
      <AuthProvider>
        {/* Status bar is styled once here because nested navigators inherit it. */}
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </LanguageProvider>
  );
}
