/**
 * OutlinedButton
 * --------------
 * Shared pill-shaped button with optional icon support. Used for language toggles
 * and other secondary actions where the outlined style provides proper contrast.
 */
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "../theme/colors";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface Props {
  title: string;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

const OutlinedButton: React.FC<Props> = ({
  title,
  onPress,
  icon,
  style,
  active = false,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.base,
      active ? styles.active : null,
      pressed ? styles.pressed : null,
      style,
    ]}
  >
    {icon ? (
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={active ? colors.surface : colors.textSecondary}
        style={styles.icon}
      />
    ) : null}
    <Text style={[styles.label, active ? styles.activeLabel : null]}>
      {title}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  active: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  activeLabel: {
    color: colors.surface,
  },
  icon: {
    marginRight: 6,
  },
});

export default OutlinedButton;
