/**
 * EventCard
 * ---------
 * Re-usable presentation component for the volunteer event list and favourites.
 * Shows the hero image, core metadata, and a localized capacity summary.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Event } from "../types";
import { colors } from "../theme/colors";
import { useLanguage } from "../context/LanguageContext";

interface Props {
  event: Event;
  onPress: () => void;
}

const EventCard: React.FC<Props> = ({ event, onPress }) => {
  const { t } = useLanguage();
  // Prefer the first uploaded image, otherwise we fall back to an icon placeholder.
  const firstImage = event.imageUrls?.[0];
  const categoryLabel = useMemo(() => {
    if (!event.category) return "";
    const key = event.category.trim().toLowerCase();
    if (key === "cleanup" || key === "social") {
      return t(`eventList.filter.${key}`);
    }
    return event.category;
  }, [event.category, t]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {firstImage ? (
        <Image
          source={{ uri: firstImage }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        /* Placeholder with icon ensures layout consistency when no media is provided. */
        <View style={styles.imageFallback}>
          <MaterialCommunityIcons
            name="image-broken-variant"
            size={30}
            color={colors.textSecondary}
          />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="shape-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.subtitle}>{categoryLabel}</Text>
        </View>
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.subtitle}>
            {t("eventCard.volunteerCount", {
              current: event.currentVolunteers,
              max: event.maxVolunteers,
            })}
          </Text>
        </View>
        <Text numberOfLines={2} style={styles.description}>
          {event.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "column",
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  image: {
    width: "100%",
    height: 136,
  },
  imageFallback: {
    width: "100%",
    height: 136,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  info: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontWeight: "700",
    fontSize: 17,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  description: {
    fontSize: 12,
    marginTop: 6,
    color: colors.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
});

export default EventCard;
