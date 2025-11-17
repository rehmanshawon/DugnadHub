/**
 * EventDetailsScreen
 * ------------------
 * Displays the full volunteer opportunity including metadata, imagery, and
 * participation controls. Handles sign-up flow, favourite toggling, and keeps the
 * UI in sync with Firestore updates for the active event.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import ErrorBanner from "../../components/ErrorBanner";
import PrimaryButton from "../../components/PrimaryButton";
import OutlinedButton from "../../components/OutlinedButton";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { db } from "../../firebaseConfig";
import { colors } from "../../theme/colors";
import { Event } from "../../types";

type EventDetailsRouteProp = RouteProp<any, "EventDetails">;

const EventDetailsScreen: React.FC = () => {
  const route = useRoute<EventDetailsRouteProp>();
  const { eventId } = route.params as any;
  const navigation = useNavigation<any>();
  const { appUser } = useAuth();
  const { t, language } = useLanguage();

  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const locale = language === "no" ? "nb-NO" : "en-GB";
  const categoryLabel = useMemo(() => {
    if (!event?.category) return "";
    const key = event.category.trim().toLowerCase();
    if (key === "cleanup" || key === "social") {
      return t(`eventList.filter.${key}`);
    }
    return event.category;
  }, [event?.category, t]);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, "events", eventId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        setEvent(null);
        setError(t("eventDetails.notFound"));
        return;
      }
      const data = snap.data() as any;
      const ev: Event = {
        id: snap.id,
        title: data.title,
        description: data.description,
        tasks: data.tasks,
        category: data.category,
        locationText: data.locationText,
        dateTime: data.dateTime?.toDate?.() ?? new Date(),
        createdBy: data.createdBy,
        maxVolunteers: data.maxVolunteers,
        currentVolunteers: data.currentVolunteers,
        imageUrls: data.imageUrls || [],
      };
      setEvent(ev);

      if (appUser) {
        await checkParticipation(ev.id, appUser.id);
        await checkFavorite(ev.id, appUser.id);
      } else {
        setIsSignedUp(false);
        setParticipationId(null);
        setFavoriteId(null);
      }
    } catch (e: any) {
      setError(e.message ?? t("eventDetails.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [appUser, eventId, t]);

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [loadEvent])
  );

  // Determine whether the current user has already signed up for this event.
  const checkParticipation = async (eventId: string, userId: string) => {
    const participationQuery = query(
      collection(db, "participations"),
      where("eventId", "==", eventId),
      where("userId", "==", userId),
      where("status", "==", "signed_up")
    );
    const participationSnapshot = await getDocs(participationQuery);
    if (!participationSnapshot.empty) {
      setIsSignedUp(true);
      setParticipationId(participationSnapshot.docs[0].id);
    } else {
      setIsSignedUp(false);
      setParticipationId(null);
    }
  };

  // Look up the favourite document so we can display correct heart state and support toggling.
  const checkFavorite = async (eventId: string, userId: string) => {
    const favoritesQuery = query(
      collection(db, "favorites"),
      where("eventId", "==", eventId),
      where("userId", "==", userId)
    );
    const favoritesSnapshot = await getDocs(favoritesQuery);
    if (!favoritesSnapshot.empty) {
      setFavoriteId(favoritesSnapshot.docs[0].id);
    } else {
      setFavoriteId(null);
    }
  };

  // Simplified sign-up flow: create participation and increment volunteer count.
  const handleSignUp = async () => {
    if (!event || !appUser) return;
    setError(null);

    if (event.currentVolunteers >= event.maxVolunteers) {
      setError(t("eventDetails.errorFull"));
      return;
    }

    try {
      // create participation
      const participationDoc = await addDoc(collection(db, "participations"), {
        userId: appUser.id,
        eventId: event.id,
        status: "signed_up",
        createdAt: new Date(),
      });

      // update capacity (simplified; for production use a transaction)
      const docRef = doc(db, "events", event.id);
      await updateDoc(docRef, {
        currentVolunteers: increment(1),
      });

      setEvent({
        ...event,
        currentVolunteers: event.currentVolunteers + 1,
      });
      setIsSignedUp(true);
      setParticipationId(participationDoc.id);
    } catch (e: any) {
      setError(e.message ?? t("eventDetails.errorSignUp"));
    }
  };

  const handleWithdraw = async () => {
    if (!event || !appUser || !participationId) return;
    setError(null);
    try {
      setWithdrawing(true);
      const participationRef = doc(db, "participations", participationId);
      await updateDoc(participationRef, { status: "withdrawn" });

      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, { currentVolunteers: increment(-1) });

      setEvent({
        ...event,
        currentVolunteers: Math.max(event.currentVolunteers - 1, 0),
      });
      setIsSignedUp(false);
      setParticipationId(null);
    } catch (e: any) {
      setError(e.message ?? t("eventDetails.errorWithdraw"));
    } finally {
      setWithdrawing(false);
    }
  };

  // Create or delete the favourite record and update UI instantly.
  const handleFavoriteToggle = async () => {
    if (!event || !appUser) return;
    try {
      if (favoriteId) {
        const favoriteRef = doc(db, "favorites", favoriteId);
        await deleteDoc(favoriteRef);
        setFavoriteId(null);
      } else {
        const favoriteDoc = await addDoc(collection(db, "favorites"), {
          userId: appUser.id,
          eventId: event.id,
          createdAt: new Date(),
        });
        setFavoriteId(favoriteDoc.id);
      }
    } catch (e: any) {
      setError(e.message ?? t("eventDetails.errorFavorite"));
    }
  };

  const performDeleteEvent = async () => {
    if (!event || !appUser) return;
    setError(null);
    try {
      setDeleting(true);
      const eventRef = doc(db, "events", event.id);
      const snapshot = await getDoc(eventRef);
      if (!snapshot.exists()) {
        setError(t("eventDetails.notFound"));
        setDeleting(false);
        return;
      }
      const eventData = snapshot.data() as any;
      if (eventData.createdBy !== appUser.id) {
        setError(t("eventDetails.errorNotOwner"));
        setDeleting(false);
        return;
      }

      const participationSnap = await getDocs(
        query(
          collection(db, "participations"),
          where("eventId", "==", event.id)
        )
      );
      const favoriteSnap = await getDocs(
        query(collection(db, "favorites"), where("eventId", "==", event.id))
      );

      await Promise.all([
        ...participationSnap.docs.map((d) => deleteDoc(d.ref)),
        ...favoriteSnap.docs.map((d) => deleteDoc(d.ref)),
      ]);

      await deleteDoc(eventRef);
      Alert.alert(
        t("createEvent.successTitle"),
        t("eventDetails.deleteSuccess")
      );
      navigation.navigate("Main", {
        screen: "Events",
      });
    } catch (e: any) {
      setError(e.message ?? t("eventDetails.errorDelete"));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteEvent = () => {
    if (!event) return;
    Alert.alert(
      t("eventDetails.deleteConfirmTitle"),
      t("eventDetails.deleteConfirmMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("eventDetails.deleteButton"),
          style: "destructive",
          onPress: performDeleteEvent,
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={[styles.screen, styles.center]}>
          <LanguageSwitcher />
          <MaterialCommunityIcons
            name="clock-outline"
            size={32}
            color={colors.textSecondary}
          />
          <Text style={styles.centerLabel}>{t("eventDetails.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={[styles.screen, styles.center]}>
          <LanguageSwitcher />
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={34}
            color={colors.accent}
          />
          <Text style={styles.centerLabel}>{t("eventDetails.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determine availability to show the appropriate call-to-action message.
  const isOwner =
    appUser?.role === "organiser" && event.createdBy === appUser.id;
  const canSignUp =
    appUser &&
    event.currentVolunteers < event.maxVolunteers &&
    !isSignedUp &&
    !isOwner;
  const canWithdraw = isSignedUp && participationId !== null;
  const heroImage = event.imageUrls?.[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ErrorBanner message={error} />
        {/* Language switcher stays accessible so the full detail view can be localized in place. */}
        <LanguageSwitcher />

        <View style={styles.heroWrapper}>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <MaterialCommunityIcons
                name="image-area"
                size={48}
                color={colors.textMuted}
              />
            </View>
          )}
          {appUser && (
            <TouchableOpacity
              style={styles.favouriteToggle}
              onPress={handleFavoriteToggle}
            >
              <MaterialCommunityIcons
                name={favoriteId ? "heart" : "heart-outline"}
                size={24}
                color={favoriteId ? colors.accent : colors.textPrimary}
              />
            </TouchableOpacity>
          )}
        </View>

        {event.imageUrls.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12 }}
          >
            {event.imageUrls.slice(1).map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.thumbnail} />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.headerSection}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.categoryPill}>
              <MaterialCommunityIcons
                name="shape"
                size={16}
                color={colors.surface}
              />
              <Text style={styles.categoryPillText}>{categoryLabel}</Text>
            </View>
          </View>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.metaText}>{event.locationText}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.metaText}>
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(event.dateTime)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons
              name="account-group"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.metaText}>
              {t("eventDetails.volunteerCount", {
                current: event.currentVolunteers,
                max: event.maxVolunteers,
              })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("eventDetails.sectionAbout")}
          </Text>
          <Text style={styles.sectionBody}>
            {event.description || t("eventDetails.noDescription")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("eventDetails.sectionTasks")}
          </Text>
          <Text style={styles.sectionBody}>
            {event.tasks || t("eventDetails.noTasks")}
          </Text>
        </View>

        {appUser && (
          <View style={styles.actions}>
            {canSignUp ? (
              <PrimaryButton
                title={t("eventDetails.signUpButton")}
                icon="hand-coin"
                onPress={handleSignUp}
              />
            ) : canWithdraw ? (
              <>
                <PrimaryButton
                  title={
                    withdrawing
                      ? t("eventDetails.withdrawLoading")
                      : t("eventDetails.withdrawButton")
                  }
                  icon="account-remove"
                  onPress={handleWithdraw}
                  disabled={withdrawing}
                />
                <View style={styles.successPill}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={18}
                    color={colors.success}
                  />
                  <Text style={styles.successText}>
                    {t("eventDetails.signedUpLabel")}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.successPill}>
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.successText}>
                  {t("eventDetails.fullLabel")}
                </Text>
              </View>
            )}
            <OutlinedButton
              title={t("eventDetails.shareButton")}
              icon="share-variant"
              onPress={() =>
                Alert.alert(
                  t("eventDetails.shareButton"),
                  t("eventDetails.shareMessage")
                )
              }
              style={styles.shareButton}
            />
          </View>
        )}

        {isOwner && (
          <View style={styles.ownerActions}>
            <Text style={styles.ownerLabel}>
              {t("eventDetails.ownerActionsTitle")}
            </Text>
            <PrimaryButton
              title={t("eventDetails.editButton")}
              icon="pencil"
              onPress={() =>
                navigation.navigate("EditEvent", {
                  eventId: event.id,
                  mode: "edit",
                })
              }
              style={styles.ownerButton}
            />
            <OutlinedButton
              title={t("eventDetails.manageButton")}
              icon="account-group"
              onPress={() =>
                navigation.navigate("ManageParticipants", {
                  eventId: event.id,
                })
              }
              style={styles.ownerButton}
            />
            <OutlinedButton
              title={
                deleting
                  ? t("eventDetails.deleteLoading")
                  : t("eventDetails.deleteButton")
              }
              icon="trash-can"
              onPress={deleting ? () => {} : handleDeleteEvent}
              style={[styles.ownerButton, styles.destructiveButton]}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabel: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  heroWrapper: {
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  heroImage: {
    width: "100%",
    height: 240,
  },
  heroFallback: {
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  favouriteToggle: {
    position: "absolute",
    top: 18,
    right: 18,
    backgroundColor: "rgba(12, 17, 35, 0.6)",
    padding: 10,
    borderRadius: 999,
  },
  thumbnail: {
    width: 120,
    height: 90,
    borderRadius: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerSection: {
    marginHorizontal: 20,
    marginTop: 22,
  },
  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryPillText: {
    color: colors.surface,
    marginLeft: 6,
    fontWeight: "600",
  },
  title: {
    marginTop: 14,
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  metaText: {
    marginLeft: 8,
    color: colors.textSecondary,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionBody: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  ownerActions: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  ownerLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  ownerButton: {
    marginTop: 12,
  },
  destructiveButton: {
    borderColor: colors.accent,
    backgroundColor: "rgba(244, 63, 94, 0.08)",
  },
  successPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  successText: {
    marginLeft: 10,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  shareButton: {
    marginTop: 16,
  },
});

export default EventDetailsScreen;
