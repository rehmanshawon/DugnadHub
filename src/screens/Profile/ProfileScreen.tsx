/**
 * ProfileScreen
 * -------------
 * Combines volunteer statistics, language switching, favourites, and role
 * toggling in one place. Data is aggregated from participations and favourites so
 * users immediately see the impact of their activity.
 */
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import EventCard from "../../components/EventCard";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import OutlinedButton from "../../components/OutlinedButton";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { db } from "../../firebaseConfig";
import { colors } from "../../theme/colors";
import { Event, Participation, UserRole } from "../../types";

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { appUser, signOutUser } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({ total: 0, upcoming: 0, past: 0 });
  const [favorites, setFavorites] = useState<Event[]>([]);

  useEffect(() => {
    if (!appUser?.id) {
      setStats({ total: 0, upcoming: 0, past: 0 });
      setFavorites([]);
      return;
    }

    let isMounted = true;

    const participationQuery = query(
      collection(db, "participations"),
      where("userId", "==", appUser.id),
      where("status", "==", "signed_up")
    );

    const participationUnsubscribe = onSnapshot(
      participationQuery,
      async (snapshot) => {
        try {
          const participations: Participation[] = snapshot.docs.map(
            (docSnap) => {
              const data = docSnap.data() as any;
              return {
                id: docSnap.id,
                userId: data.userId,
                eventId: data.eventId,
                status: data.status,
                createdAt: data.createdAt?.toDate?.() ?? new Date(),
              };
            }
          );

          const now = new Date();
          const eventDates = await Promise.all(
            participations.map(async (participation) => {
              const eventSnapshot = await getDoc(
                doc(db, "events", participation.eventId)
              );

              if (!eventSnapshot.exists()) return null;
              const eventData = eventSnapshot.data() as any;
              return eventData.dateTime?.toDate?.() ?? new Date();
            })
          );

          let upcoming = 0;
          let past = 0;
          for (const eventDate of eventDates) {
            if (!eventDate) continue;
            if (eventDate >= now) upcoming += 1;
            else past += 1;
          }

          if (isMounted) {
            setStats({ total: participations.length, upcoming, past });
          }
        } catch (error) {
          console.warn("Failed to update participation stats", error);
        }
      }
    );

    const favoritesQuery = query(
      collection(db, "favorites"),
      where("userId", "==", appUser.id)
    );

    const favoritesUnsubscribe = onSnapshot(
      favoritesQuery,
      async (snapshot) => {
        try {
          const favoriteEvents = await Promise.all(
            snapshot.docs.map(async (favoriteDoc) => {
              const favoriteData = favoriteDoc.data() as any;
              const eventSnapshot = await getDoc(
                doc(db, "events", favoriteData.eventId)
              );

              if (!eventSnapshot.exists()) return null;
              const eventData = eventSnapshot.data() as any;
              const event: Event = {
                id: eventSnapshot.id,
                title: eventData.title,
                description: eventData.description,
                tasks: eventData.tasks,
                category: eventData.category,
                locationText: eventData.locationText,
                dateTime: eventData.dateTime?.toDate?.() ?? new Date(),
                createdBy: eventData.createdBy,
                maxVolunteers: eventData.maxVolunteers,
                currentVolunteers: eventData.currentVolunteers,
                imageUrls: eventData.imageUrls || [],
              };

              return event;
            })
          );

          if (isMounted) {
            setFavorites(
              favoriteEvents.filter((event): event is Event => Boolean(event))
            );
          }
        } catch (error) {
          console.warn("Failed to update favorites", error);
        }
      }
    );

    return () => {
      isMounted = false;
      participationUnsubscribe();
      favoritesUnsubscribe();
    };
  }, [appUser?.id]);

  // Allow users to switch between organiser and volunteer roles; requires re-login.
  const handleRoleToggle = async () => {
    if (!appUser) return;
    const updatedRole: UserRole =
      appUser.role === "volunteer" ? "organiser" : "volunteer";
    await updateDoc(doc(db, "users", appUser.id), { role: updatedRole });
  };

  if (!appUser) {
    // Encourage authentication while still exposing language switching.
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={[styles.screen, styles.center]}>
          <LanguageSwitcher />
          <Text style={styles.centerLabel}>{t("profile.loginPrompt")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.languageWrapper}>
          <LanguageSwitcher />
        </View>
        {/* Profile header summarises identity and participation progress. */}
        <View style={styles.headerCard}>
          <View style={styles.avatarPlaceholder}>
            <MaterialCommunityIcons
              name="account-star"
              size={36}
              color={colors.surface}
            />
          </View>
          <Text style={styles.name}>
            {appUser.displayName || appUser.email}
          </Text>
          <View style={styles.rolePill}>
            <MaterialCommunityIcons
              name={appUser.role === "volunteer" ? "hand-heart" : "account-tie"}
              size={16}
              color={colors.surface}
            />
            <Text style={styles.roleText}>
              {t(`profile.role.${appUser.role}`)}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>{t("profile.totalEvents")}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.upcoming}</Text>
              <Text style={styles.statLabel}>{t("profile.upcoming")}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.past}</Text>
              <Text style={styles.statLabel}>{t("profile.completed")}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <OutlinedButton
              title={
                appUser.role === "volunteer"
                  ? t("profile.switchToOrganiser")
                  : t("profile.switchToVolunteer")
              }
              icon="swap-horizontal"
              onPress={handleRoleToggle}
              active
              style={styles.roleButton}
            />
            <PrimaryButton
              title={t("profile.signOut")}
              icon="logout"
              onPress={signOutUser}
              style={styles.signOutButton}
            />
          </View>
        </View>

        {/* Favourites provide quick access to saved volunteering opportunities. */}
        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitle}>
            {t("profile.favouritesTitle")}
          </Text>
          {favorites.length > 0 ? (
            <Text style={styles.scrollHint}>{t("profile.favouritesHint")}</Text>
          ) : null}
          {favorites.length === 0 ? (
            <View style={styles.emptyFavorites}>
              <MaterialCommunityIcons
                name="heart-outline"
                size={28}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>{t("profile.noFavourites")}</Text>
            </View>
          ) : (
            <FlatList
              data={favorites}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <EventCard
                  event={item}
                  onPress={() =>
                    navigation.navigate("EventDetails", { eventId: item.id })
                  }
                />
              )}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.favoritesContent}
            />
          )}
        </View>
      </View>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabel: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  languageWrapper: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  headerCard: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  roleText: {
    color: colors.surface,
    fontWeight: "600",
    marginLeft: 8,
    textTransform: "capitalize",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    width: "100%",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  sectionWrapper: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 18,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 10,
  },
  emptyFavorites: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 24,

    alignItems: "center",
    backgroundColor: colors.surface,
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    width: "100%",
  },
  roleButton: {
    flex: 1,
    marginRight: 10,
  },
  signOutButton: {
    flex: 1,
  },
  favoritesContent: {
    paddingBottom: 24,
  },
  scrollHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
});

export default ProfileScreen;
