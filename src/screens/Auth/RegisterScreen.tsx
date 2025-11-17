/**
 * RegisterScreen
 * --------------
 * Handles onboarding for new users. After creating the Firebase auth record it
 * seeds the accompanying Firestore profile with a default volunteer role.
 */
import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import ErrorBanner from "../../components/ErrorBanner";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import OutlinedButton from "../../components/OutlinedButton";
import PrimaryButton from "../../components/PrimaryButton";
import { useLanguage } from "../../context/LanguageContext";
import { auth, db } from "../../firebaseConfig";
import { colors } from "../../theme/colors";
import { UserRole } from "../../types";

type Props = NativeStackScreenProps<any>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  // Create auth credentials then persist a matching user profile document.
  const handleRegister = async () => {
    setError(null);
    if (!email || !password || !displayName) {
      setError(t("register.errorMissingFields"));
      return;
    }

    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      if (cred.user) {
        await updateProfile(cred.user, { displayName });
      }

      const defaultRole: UserRole = "volunteer";

      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        displayName,
        role: defaultRole,
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      setError(e.message ?? t("register.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <LanguageSwitcher />
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="account-plus"
            size={28}
            color={colors.surface}
          />
        </View>
        <Text style={styles.title}>{t("register.title")}</Text>
        <Text style={styles.subtitle}>{t("register.subtitle")}</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder={t("register.emailPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder={t("register.displayNamePlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder={t("register.passwordPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <ErrorBanner message={error} />

        <PrimaryButton
          title={loading ? t("register.loading") : t("register.button")}
          icon="account-check"
          onPress={handleRegister}
          disabled={loading}
        />

        <OutlinedButton
          title={t("register.backToLogin")}
          icon="arrow-left"
          onPress={() => navigation.goBack()}
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
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: colors.secondary,
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
    shadowColor: colors.secondary,
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

export default RegisterScreen;
