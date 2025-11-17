/**
 * ErrorBanner
 * -----------
 * Lightweight component for surfacing transient validation or network errors.
 * It renders nothing when no message is provided to avoid reserving screen space.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  /** Localised message to display. Null hides the banner entirely. */
  message: string | null;
}

const ErrorBanner: React.FC<Props> = ({ message }) => {
  // Returning null keeps React Native from mounting the view when not needed.
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffdddd",
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 4,
  },
  text: {
    color: "#a00",
    fontSize: 13,
  },
});

export default ErrorBanner;
