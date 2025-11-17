/**
 * CreateEventScreen
 * -----------------
 * Form workflow for organisers to publish new volunteering opportunities. Handles
 * media capture, validation, Firestore persistence, and image uploads to Firebase
 * Storage before refreshing the UI with a success message.
 */
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { db, storage } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import ErrorBanner from "../../components/ErrorBanner";
import PrimaryButton from "../../components/PrimaryButton";
import OutlinedButton from "../../components/OutlinedButton";
import { colors } from "../../theme/colors";

const CreateEventScreen: React.FC = () => {
  const { appUser } = useAuth();
  const { t, language } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState("");
  const [category, setCategory] = useState("Cleanup");
  const [locationText, setLocationText] = useState("");
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [maxVolunteers, setMaxVolunteers] = useState("10");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Pre-format the selected date/time in the active locale for display.
  const formattedDate = useMemo(() => {
    if (!dateTime) return t("createEvent.datePlaceholder");
    const locale = language === "no" ? "nb-NO" : "en-GB";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dateTime);
  }, [dateTime, language, t]);

  // Request gallery permission and append the chosen photo to the image list.
  const pickImageFromLibrary = async () => {
    const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mediaPerm.granted) {
      Alert.alert(
        t("createEvent.permissionTitle"),
        t("createEvent.permissionMedia")
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImages((prev) => [...prev, uri]);
    }
  };

  // Capture a new photo with the device camera, mirroring gallery behaviour.
  const pickImageFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t("createEvent.permissionTitle"),
        t("createEvent.permissionCamera")
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImages((prev) => [...prev, uri]);
    }
  };

  // Upload staged images sequentially and return the remote download URLs.
  const uploadImages = async (eventId: string) => {
    const urls: string[] = [];
    for (const uri of images) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `${eventId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, `events/${filename}`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      urls.push(downloadUrl);
    }
    return urls;
  };

  // Validate input, create the event document, and patch it with uploaded images.
  const handleCreate = async () => {
    setError(null);
    if (!appUser) {
      setError(t("createEvent.authRequired"));
      return;
    }
    if (!title || !dateTime || !locationText) {
      setError(t("createEvent.errorMissingFields"));
      return;
    }

    const numericMax = Number(maxVolunteers);
    if (!Number.isFinite(numericMax) || numericMax <= 0) {
      setError(t("createEvent.errorMaxVolunteers"));
      return;
    }

    try {
      setSaving(true);
      const evRef = await addDoc(collection(db, "events"), {
        title,
        description,
        tasks,
        category,
        locationText,
        dateTime: Timestamp.fromDate(dateTime),
        createdBy: appUser.id,
        maxVolunteers: numericMax,
        currentVolunteers: 0,
        imageUrls: [],
        createdAt: serverTimestamp(),
      });

      const urls = await uploadImages(evRef.id);
      // update event with image urls after initial create
      if (urls.length) {
        await updateDoc(evRef, { imageUrls: urls });
      }

      Alert.alert(
        t("createEvent.successTitle"),
        t("createEvent.successMessage")
      );
      setTitle("");
      setDescription("");
      setTasks("");
      setLocationText("");
      setDateTime(null);
      setMaxVolunteers("10");
      setImages([]);
    } catch (e: any) {
      console.log(e);
      setError(e.message ?? t("createEvent.errorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  // On native we show the picker; on web we prompt for a manual ISO timestamp.
  const handleDateInputPress = () => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return;
      }
      const input = window.prompt(
        t("createEvent.datePromptMessage"),
        dateTime ? dateTime.toISOString().slice(0, 16).replace("T", " ") : ""
      );
      if (!input) {
        return;
      }
      const normalized = input.includes("T") ? input : input.replace(" ", "T");
      const parsed = new Date(normalized);
      if (Number.isNaN(parsed.getTime())) {
        Alert.alert(
          t("createEvent.datePromptTitle"),
          t("createEvent.datePromptInvalid")
        );
        return;
      }
      setDateTime(parsed);
      return;
    }
    setPickerVisible(true);
  };

  // Volunteers are shown a friendly message instead of the full editor.
  if (appUser?.role !== "organiser") {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textPrimary }}>
          {t("createEvent.organiserOnly")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t("createEvent.title")}</Text>
      <Text style={styles.subtitle}>{t("createEvent.subtitle")}</Text>
      <ErrorBanner message={error} />

      <View style={styles.card}>
        {/* Essentials section covers the core metadata for a volunteering event. */}
        <Text style={styles.sectionLabel}>
          {t("createEvent.sectionEssentials")}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t("createEvent.eventTitlePlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder={t("createEvent.eventDescriptionPlaceholder")}
          placeholderTextColor={colors.textMuted}
          multiline
          value={description}
          onChangeText={setDescription}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder={t("createEvent.tasksPlaceholder")}
          placeholderTextColor={colors.textMuted}
          multiline
          value={tasks}
          onChangeText={setTasks}
        />
        <Text style={styles.fieldLabel}>{t("createEvent.eventTypeLabel")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("createEvent.categoryPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder={t("createEvent.locationPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={locationText}
          onChangeText={setLocationText}
        />

        <TouchableOpacity
          style={[styles.input, styles.dateInput]}
          onPress={handleDateInputPress}
        >
          <MaterialCommunityIcons
            name="calendar-range"
            size={20}
            color={colors.textSecondary}
            style={{ marginRight: 10 }}
          />
          <Text style={styles.dateText}>{formattedDate}</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>
          {t("createEvent.maxVolunteersLabel")}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t("createEvent.maxVolunteersPlaceholder")}
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={maxVolunteers}
          onChangeText={setMaxVolunteers}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t("createEvent.sectionMedia")}</Text>
        <View style={styles.imageButtons}>
          <OutlinedButton
            title={t("createEvent.galleryButton")}
            icon="image-multiple"
            onPress={pickImageFromLibrary}
            style={styles.mediaButton}
          />
          <OutlinedButton
            title={t("createEvent.cameraButton")}
            icon="camera"
            onPress={pickImageFromCamera}
            style={[styles.mediaButton, styles.mediaButtonLast]}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {images.map((uri) => (
            <View key={uri} style={styles.imagePreview}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() =>
                  setImages((prev) =>
                    prev.filter((imageUri) => imageUri !== uri)
                  )
                }
              >
                <MaterialCommunityIcons
                  name="close"
                  size={16}
                  color={colors.surface}
                />
              </TouchableOpacity>
            </View>
          ))}
          {images.length === 0 ? (
            <View style={styles.emptyImageState}>
              <MaterialCommunityIcons
                name="image-outline"
                size={28}
                color={colors.textMuted}
              />
              <Text style={styles.emptyImageLabel}>
                {t("createEvent.emptyMediaTitle")}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <PrimaryButton
        title={saving ? t("createEvent.loading") : t("createEvent.button")}
        icon="rocket-launch"
        onPress={handleCreate}
        disabled={saving}
      />

      {Platform.OS !== "web" ? (
        <DateTimePickerModal
          isVisible={pickerVisible}
          mode="datetime"
          onConfirm={(value) => {
            setDateTime(value);
            setPickerVisible(false);
          }}
          onCancel={() => setPickerVisible(false)}
        />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  sectionLabel: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: colors.textMuted,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
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
    fontSize: 15,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  imageButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mediaButton: {
    flex: 1,
    marginRight: 12,
  },
  mediaButtonLast: {
    marginRight: 0,
  },
  imagePreview: {
    marginRight: 12,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: 110,
    height: 110,
  },
  removeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: colors.accent,
    borderRadius: 999,
    padding: 4,
  },
  emptyImageState: {
    width: 140,
    height: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyImageLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default CreateEventScreen;
