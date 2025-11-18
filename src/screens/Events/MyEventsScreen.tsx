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
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { Event } from "../../types";
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
    if (!appUser?.id) {
      setEvents([]);
      return;
    }

    let isMounted = true;
    const eventCache = new Map<string, Event>();
    const eventSubscriptions = new Map<string, () => void>();
    let latestParticipationDocs: any[] = [];

    const recomputeEvents = () => {
      if (!isMounted) return;
      const ordered = [...latestParticipationDocs]
        .sort((a, b) => {
          const aData = a.data() as any;
          const bData = b.data() as any;
          const aDate =
            aData.createdAt?.toDate?.()?.getTime?.() ??
            aData.createdAt?.getTime?.() ??
            0;
          const bDate =
            bData.createdAt?.toDate?.()?.getTime?.() ??
            bData.createdAt?.getTime?.() ??
            0;
          return bDate - aDate;
        })
        .map((docSnap) => {
          const data = docSnap.data() as any;
          return eventCache.get(data.eventId);
        })
        .filter((event): event is Event => Boolean(event));
      setEvents(ordered);
    };

    const participationQuery = query(
      collection(db, "participations"),
      where("userId", "==", appUser.id),
      where("status", "==", "signed_up")
    );

    const unsubscribeParticipations = onSnapshot(
      participationQuery,
      (snapshot) => {
        latestParticipationDocs = snapshot.docs;
        const nextEventIds = new Set(
          snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as any;
            return data.eventId as string;
          })
        );

        // Remove subscriptions for events no longer referenced.
        eventSubscriptions.forEach((unsubscribe, eventId) => {
          if (!nextEventIds.has(eventId)) {
            unsubscribe();
            eventSubscriptions.delete(eventId);
            eventCache.delete(eventId);
          }
        });

        // Add subscriptions for new event references.
        nextEventIds.forEach((eventId) => {
          if (eventSubscriptions.has(eventId)) {
            return;
          }
          const eventRef = doc(db, "events", eventId);
          const unsubscribeEvent = onSnapshot(
            eventRef,
            (eventSnap) => {
              if (!eventSnap.exists()) {
                eventCache.delete(eventId);
              } else {
                const eventData = eventSnap.data() as any;
                eventCache.set(eventId, {
                  id: eventSnap.id,
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
                });
              }
              recomputeEvents();
            },
            (error) => {
              console.warn("Failed to stream event", error);
            }
          );
          eventSubscriptions.set(eventId, unsubscribeEvent);
        });

        recomputeEvents();
      },
      (error) => {
        console.warn("Failed to stream participations", error);
        if (isMounted) {
          setEvents([]);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeParticipations();
      eventSubscriptions.forEach((unsubscribe) => unsubscribe());
      eventSubscriptions.clear();
      eventCache.clear();
    };
  }, [appUser?.id]);

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
        <View style={styles.languageWrapper}>
          <LanguageSwitcher />
        </View>
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
  languageWrapper: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 18,
    marginBottom: 8,
  },
});

export default MyEventsScreen;
