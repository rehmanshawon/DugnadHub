/**
 * MyEventsScreen
 * --------------
 * Shows the volunteer opportunities the user has already joined. Fetches
 * participation records then hydrates them with the corresponding event details
 * to render familiar EventCard components.
 */
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { Event, Participation } from "../../types";
import EventCard from "../../components/EventCard";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../theme/colors";
import { useLanguage } from "../../context/LanguageContext";

const MyEventsScreen: React.FC = () => {
  const { appUser } = useAuth();
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<Event[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    // Load the user's participations and join with event metadata for display.
    const load = async () => {
      if (!appUser) return;
      const pQuery = query(
        collection(db, "participations"),
        where("userId", "==", appUser.id),
        where("status", "==", "signed_up")
      );
      const snap = await getDocs(pQuery);
      const participations: Participation[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          userId: data.userId,
          eventId: data.eventId,
          status: data.status,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
        };
      });

      const eventIds = participations.map((p) => p.eventId);
      const results: Event[] = [];
      for (const id of eventIds) {
        const evSnap = await getDoc(doc(db, "events", id));
        if (evSnap.exists()) {
          const data = evSnap.data() as any;
          results.push({
            id: evSnap.id,
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
          });
        }
      }
      setEvents(results);
    };

    load();
  }, [appUser]);

  if (!appUser) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={[styles.screen, styles.center]}>
          <LanguageSwitcher />
          <Text style={styles.emptyTitle}>{t("myEvents.loginPrompt")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <LanguageSwitcher />
        {events.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="calendar-heart"
              size={40}
              color={colors.textSecondary}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.emptyTitle}>{t("myEvents.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("myEvents.emptySubtitle")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                onPress={() =>
                  navigation.navigate("EventDetails", { eventId: item.id })
                }
              />
            )}
          />
        )}
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
});

export default MyEventsScreen;
