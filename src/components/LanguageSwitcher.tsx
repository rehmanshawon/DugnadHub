/**
 * LanguageSwitcher
 * ----------------
 * Renders the EN/NO toggle buttons used across screens. The component relies on
 * LanguageContext so new locales can be added by extending the options array.
 */
import React from "react";
import { View, StyleSheet } from "react-native";

import OutlinedButton from "./OutlinedButton";
import { useLanguage } from "../context/LanguageContext";
import { SupportedLanguage } from "../i18n/translations";
import { colors } from "../theme/colors";

const options: { code: SupportedLanguage; labelKey: string }[] = [
  { code: "en", labelKey: "language.english" },
  { code: "no", labelKey: "language.norwegian" },
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  // Render buttons side-by-side so users can quickly switch language on any screen.
  return (
    <View style={styles.container}>
      {options.map((option, index) => (
        <OutlinedButton
          key={option.code}
          title={t(option.labelKey)}
          onPress={() => setLanguage(option.code)}
          active={language === option.code}
          style={[
            styles.button,
            index === 0 ? styles.buttonLeft : styles.buttonRight,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignSelf: "flex-end",
    marginBottom: 12,
  },
  button: {
    flex: 0,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderColor: colors.border,
  },
  buttonLeft: {
    marginRight: 8,
  },
  buttonRight: {
    marginRight: 0,
  },
});

export default LanguageSwitcher;
