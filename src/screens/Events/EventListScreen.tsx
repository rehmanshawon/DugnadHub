/**
 * EventListScreen
 * ---------------
 * Landing view that streams volunteer events from Firestore in real time. Users
 * can search, filter by category, toggle featured events, and navigate to detail
 * or creation flows depending on their role.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, TextInput, FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import EventCard from "../../components/EventCard";
import OutlinedButton from "../../components/OutlinedButton";
import PrimaryButton from "../../components/PrimaryButton";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { db } from "../../firebaseConfig";
import { colors } from "../../theme/colors";
import { Event } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const EventListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false);
  const { appUser } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    // Subscribe to event collection updates so the list stays fresh without manual refreshes.
    const colRef = collection(db, "events");
    const q = query(colRef, orderBy("dateTime", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Event[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
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
      });
      setEvents(list);
    });

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    // Apply text, category, and featured filters on the fly for responsive UX.
    return events.filter((e) => {
      const matchesSearch =
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || e.category === categoryFilter;
      const matchesFeatured = showOnlyFeatured ? e.imageUrls.length > 0 : true;
      return matchesSearch && matchesCategory && matchesFeatured;
    });
  }, [events, search, categoryFilter, showOnlyFeatured]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.searchContainer}>
          <LanguageSwitcher />
          <View style={styles.searchField}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t("eventList.searchPlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.filterRow}>
            {/* Quick filter chips support the exam requirement for search and filter functionality. */}
            {[
              { label: t("eventList.filter.all"), value: null, icon: "earth" },
              {
                label: t("eventList.filter.cleanup"),
                value: "Cleanup",
                icon: "broom",
              },
              {
                label: t("eventList.filter.social"),
                value: "Social",
                icon: "account-heart",
              },
            ].map((item) => (
              <OutlinedButton
                key={item.label}
                title={item.label}
                icon={item.icon as any}
                active={categoryFilter === item.value}
                onPress={() => setCategoryFilter(item.value)}
              />
            ))}
          </View>

          <View style={styles.toggleRow}>
            <OutlinedButton
              title={
                showOnlyFeatured
                  ? t("eventList.toggle.featured")
                  : t("eventList.toggle.all")
              }
              icon={showOnlyFeatured ? "star" : "star-outline"}
              active={showOnlyFeatured}
              onPress={() => setShowOnlyFeatured((prev) => !prev)}
              style={[
                styles.toggleButton,
                appUser?.role === "organiser" ? null : styles.toggleButtonFull,
              ]}
            />
            {appUser?.role === "organiser" ? (
              <PrimaryButton
                title={t("eventList.createButton")}
                icon="plus-circle"
                onPress={() => navigation.navigate("CreateEvent")}
                style={styles.createButton}
              />
            ) : null}
          </View>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="calendar-remove"
              size={42}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>{t("eventList.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("eventList.emptySubtitle")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                onPress={() =>
                  navigation.navigate("EventDetails", { eventId: item.id })
                }
              />
            )}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
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
  searchContainer: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  toggleButton: {
    flex: 1,
    marginRight: 12,
  },
  toggleButtonFull: {
    marginRight: 0,
  },
  createButton: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 12,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export default EventListScreen;
