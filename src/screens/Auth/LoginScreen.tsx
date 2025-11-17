/**
 * LoginScreen
 * -----------
 * Provides the email/password authentication flow. Validates user input, displays
 * localized error messaging, and exposes a navigation shortcut to registration.
 */
import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { signInWithEmailAndPassword } from "firebase/auth";

import ErrorBanner from "../../components/ErrorBanner";
import OutlinedButton from "../../components/OutlinedButton";
import PrimaryButton from "../../components/PrimaryButton";
import { auth } from "../../firebaseConfig";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<any>;
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useLanguage } from "../../context/LanguageContext";

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  // Validate fields then delegate to Firebase auth.
  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError(t("login.errorMissingFields"));
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError(e.message ?? "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {/* Language toggle appears within the header so the entire form localises instantly. */}
        <LanguageSwitcher />
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="hand-heart"
            size={28}
            color={colors.surface}
          />
        </View>
        <Text style={styles.title}>{t("login.title")}</Text>
        <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder={t("login.emailPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder={t("login.passwordPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <ErrorBanner message={error} />

        <PrimaryButton
          title={loading ? t("login.loading") : t("login.button")}
          icon="login"
          onPress={handleLogin}
          disabled={loading}
        />

        <OutlinedButton
          title={t("login.createAccount")}
          icon="account-plus"
          onPress={() => navigation.navigate("Register")}
          style={{ marginTop: 18 }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  header: {
    marginTop: 40,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  formCard: {
    marginTop: 32,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default LoginScreen;
