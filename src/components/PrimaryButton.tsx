/**
 * PrimaryButton
 * -------------
 * Gradient-filled call-to-action button used for emphasised interactions like
 * submitting forms or signing out. Keeps press feedback consistent across screens.
 */
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "../theme/colors";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface Props {
  title: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PrimaryButton: React.FC<Props> = ({
  title,
  onPress,
  icon,
  disabled = false,
  style,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pressable,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {/* Gradient supplies depth even when the button is disabled. */}
      <LinearGradient
        colors={
          disabled ? ["#6d7190", "#5b5f7a"] : [colors.primary, colors.accent]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color="white"
            style={styles.icon}
          />
        ) : null}
        <Text style={styles.label}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default PrimaryButton;
