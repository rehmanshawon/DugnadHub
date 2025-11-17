/**
 * ManageParticipantsScreen
 * ------------------------
 * Allows organisers to review and update the volunteer list for a given event.
 * Provides quick actions to remove or reinstate participants and keeps the
 * displayed capacity in sync with Firestore.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import LanguageSwitcher from "../../components/LanguageSwitcher";
import ErrorBanner from "../../components/ErrorBanner";
import OutlinedButton from "../../components/OutlinedButton";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { db } from "../../firebaseConfig";
import { colors } from "../../theme/colors";
import { Participation } from "../../types";

interface ParticipantRow {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  status: Participation["status"];
  createdAt: Date | null;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface StatusStyle {
  container: StyleProp<ViewStyle>;
  label: StyleProp<TextStyle>;
}

type ManageParticipantsRoute = RouteProp<any, "ManageParticipants">;

const ManageParticipantsScreen: React.FC = () => {
  const route = useRoute<ManageParticipantsRoute>();
  const { eventId } = route.params as { eventId: string };
  const { appUser } = useAuth();
  const { t, language } = useLanguage();
  const locale = language === "no" ? "nb-NO" : "en-GB";

  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [eventStats, setEventStats] = useState<{
    title: string;
    currentVolunteers: number;
    maxVolunteers: number;
    ownerId: string;
  } | null>(null);
  const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeParticipants = useMemo(
    () => participants.filter((p) => p.status === "signed_up"),
    [participants]
  );
  const withdrawnParticipants = useMemo(
    () => participants.filter((p) => p.status === "withdrawn"),
    [participants]
  );
  const attendedParticipants = useMemo(
    () => participants.filter((p) => p.status === "attended"),
    [participants]
  );

  const formatJoinedLabel = useCallback(
    (date: Date | null) => {
      if (!date) {
        return t("manageParticipants.joinedUnknown");
      }
      return t("manageParticipants.joined", {
        date: new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date),
      });
    },
    [locale, t]
  );

  useEffect(() => {
    if (!eventId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const eventRef = doc(db, "events", eventId);
    const unsubscribe = onSnapshot(
      eventRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          if (isMounted) {
            setAllowed(false);
            setEventStats(null);
            setError(t("manageParticipants.eventMissing"));
            setLoading(false);
          }
          return;
        }

        const eventData = snapshot.data() as any;
        const ownerId = eventData.createdBy;

        if (!appUser) {
          if (isMounted) {
            setAllowed(false);
            setEventStats({
              title: eventData.title ?? "",
              currentVolunteers: eventData.currentVolunteers ?? 0,
              maxVolunteers: eventData.maxVolunteers ?? 0,
              ownerId,
            });
            setError(t("manageParticipants.authRequired"));
            setLoading(false);
          }
          return;
        }

        if (ownerId !== appUser.id) {
          if (isMounted) {
            setAllowed(false);
            setEventStats({
              title: eventData.title ?? "",
              currentVolunteers: eventData.currentVolunteers ?? 0,
              maxVolunteers: eventData.maxVolunteers ?? 0,
              ownerId,
            });
            setError(t("manageParticipants.notOwner"));
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setAllowed(true);
          setEventStats({
            title: eventData.title ?? "",
            currentVolunteers: eventData.currentVolunteers ?? 0,
            maxVolunteers: eventData.maxVolunteers ?? 0,
            ownerId,
          });
          setError(null);
          setLoading(false);
        }
      },
      (snapshotError) => {
        if (isMounted) {
          setAllowed(false);
          setEventStats(null);
          setError(snapshotError.message ?? t("manageParticipants.errorLoad"));
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [appUser, eventId, t]);

  useEffect(() => {
    if (!eventId || !allowed || !appUser) {
      setParticipants([]);
      setRefreshing(false);
      return;
    }

    let isMounted = true;
    const userCache = new Map<string, { displayName: string; email: string }>();

    const participationQuery = query(
      collection(db, "participations"),
      where("eventId", "==", eventId)
    );

    const unsubscribe = onSnapshot(
      participationQuery,
      async (snapshot) => {
        try {
          const rows: ParticipantRow[] = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const data = docSnap.data() as any;
              const userId = data.userId as string;

              let profile = userCache.get(userId);
              if (!profile) {
                try {
                  const userSnap = await getDoc(doc(db, "users", userId));
                  if (userSnap.exists()) {
                    const userData = userSnap.data() as any;
                    profile = {
                      displayName: userData.displayName || "",
                      email: userData.email || "",
                    };
                  } else {
                    profile = { displayName: "", email: "" };
                  }
                } catch (userError) {
                  console.warn("Failed to load user profile", userError);
                  profile = { displayName: "", email: "" };
                }
                userCache.set(userId, profile);
              }

              const createdAtRaw = data.createdAt;
              const createdAt = createdAtRaw?.toDate?.()
                ? createdAtRaw.toDate()
                : createdAtRaw instanceof Date
                ? createdAtRaw
                : null;

              return {
                id: docSnap.id,
                userId,
                status: (data.status as Participation["status"]) || "signed_up",
                createdAt,
                displayName:
                  profile?.displayName ||
                  profile?.email ||
                  t("manageParticipants.unknownUser"),
                email: profile?.email ?? "",
              };
            })
          );

          rows.sort(
            (a, b) =>
              (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
          );

          if (isMounted) {
            setParticipants(rows);
            setError(null);
          }
        } catch (err: any) {
          if (isMounted) {
            setError(err?.message ?? t("manageParticipants.errorLoad"));
          }
        } finally {
          if (isMounted) {
            setRefreshing(false);
          }
        }
      },
      (snapshotError) => {
        if (isMounted) {
          setParticipants([]);
          setError(snapshotError.message ?? t("manageParticipants.errorLoad"));
          setRefreshing(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [allowed, appUser, eventId, t]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }
    refreshTimeout.current = setTimeout(() => {
      setRefreshing(false);
      refreshTimeout.current = null;
    }, 400);
  }, []);

  const handleStatusChange = useCallback(
    async (
      participant: ParticipantRow,
      nextStatus: Participation["status"]
    ) => {
      if (!eventId || !eventStats) {
        setError(t("manageParticipants.eventMissing"));
        return;
      }
      if (!appUser || eventStats.ownerId !== appUser.id) {
        setError(t("manageParticipants.notOwner"));
        return;
      }
      if (participant.status === nextStatus) {
        return;
      }

      if (
        participant.status !== "signed_up" &&
        nextStatus === "signed_up" &&
        eventStats.currentVolunteers >= eventStats.maxVolunteers
      ) {
        setError(t("manageParticipants.errorFull"));
        return;
      }

      setUpdatingId(participant.id);
      setError(null);
      try {
        const participationRef = doc(db, "participations", participant.id);
        await updateDoc(participationRef, { status: nextStatus });

        let delta = 0;
        if (participant.status === "signed_up" && nextStatus !== "signed_up") {
          delta = -1;
        } else if (
          participant.status !== "signed_up" &&
          nextStatus === "signed_up"
        ) {
          delta = 1;
        }

        if (delta !== 0) {
          const eventRef = doc(db, "events", eventId);
          await updateDoc(eventRef, { currentVolunteers: increment(delta) });
        }
      } catch (err: any) {
        setError(err?.message ?? t("manageParticipants.errorUpdate"));
      } finally {
        setUpdatingId(null);
      }
    },
    [appUser, eventId, eventStats, t]
  );

  const confirmStatusChange = useCallback(
    (participant: ParticipantRow, nextStatus: Participation["status"]) => {
      const isReinstate = nextStatus === "signed_up";
      const title = isReinstate
        ? t("manageParticipants.reinstateConfirmTitle")
        : t("manageParticipants.removeConfirmTitle");
      const message = isReinstate
        ? t("manageParticipants.reinstateConfirmMessage", {
            name: participant.displayName,
          })
        : t("manageParticipants.removeConfirmMessage", {
            name: participant.displayName,
          });
      const actionLabel = isReinstate
        ? t("manageParticipants.reinstateAction")
        : t("manageParticipants.removeAction");

      Alert.alert(title, message, [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: actionLabel,
          style: isReinstate ? "default" : "destructive",
          onPress: () => handleStatusChange(participant, nextStatus),
        },
      ]);
    },
    [handleStatusChange, t]
  );

  const renderParticipantCard = useCallback(
    (
      participant: ParticipantRow,
      statusStyle: StatusStyle,
      action?: {
        nextStatus: Participation["status"];
        label: string;
        icon: IconName;
      }
    ) => {
      const joinedLabel = formatJoinedLabel(participant.createdAt);
      const isUpdating = updatingId === participant.id;

      return (
        <View key={participant.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons
                name="account-outline"
                size={22}
                color={colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.participantName}>
                {participant.displayName}
              </Text>
              {participant.email ? (
                <Text style={styles.participantEmail}>{participant.email}</Text>
              ) : null}
            </View>
            <View style={[styles.statusPill, statusStyle.container]}>
              <Text style={[styles.statusLabel, statusStyle.label]}>
                {t(`manageParticipants.status.${participant.status}`)}
              </Text>
            </View>
          </View>
          <Text style={styles.joinedLabel}>{joinedLabel}</Text>
          {action ? (
            <View style={styles.cardActions}>
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <OutlinedButton
                  title={action.label}
                  icon={action.icon}
                  onPress={() =>
                    confirmStatusChange(participant, action.nextStatus)
                  }
                  style={styles.actionButton}
                />
              )}
            </View>
          ) : null}
        </View>
      );
    },
    [confirmStatusChange, formatJoinedLabel, t, updatingId]
  );

  useEffect(() => {
    return () => {
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LanguageSwitcher />
          <Text style={styles.title}>{t("manageParticipants.title")}</Text>
          <Text style={styles.subtitle}>
            {eventStats?.title
              ? t("manageParticipants.subtitleWithName", {
                  title: eventStats.title,
                })
              : t("manageParticipants.subtitle")}
          </Text>
          <ErrorBanner message={error} />
          {eventStats ? (
            <View style={styles.capacityPill}>
              <MaterialCommunityIcons
                name="account-group"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.capacityText}>
                {t("manageParticipants.capacity", {
                  current: eventStats.currentVolunteers,
                  max: eventStats.maxVolunteers,
                })}
              </Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerMessage}>
              {t("manageParticipants.loading")}
            </Text>
          </View>
        ) : allowed ? (
          <>
            {activeParticipants.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("manageParticipants.section.active")}
                </Text>
                {activeParticipants.map((participant) =>
                  renderParticipantCard(participant, statusStyles.active, {
                    nextStatus: "withdrawn",
                    label: t("manageParticipants.removeAction"),
                    icon: "account-remove",
                  })
                )}
              </View>
            ) : null}

            {withdrawnParticipants.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("manageParticipants.section.withdrawn")}
                </Text>
                {withdrawnParticipants.map((participant) =>
                  renderParticipantCard(participant, statusStyles.withdrawn, {
                    nextStatus: "signed_up",
                    label: t("manageParticipants.reinstateAction"),
                    icon: "account-plus",
                  })
                )}
              </View>
            ) : null}

            {attendedParticipants.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("manageParticipants.section.attended")}
                </Text>
                {attendedParticipants.map((participant) =>
                  renderParticipantCard(participant, statusStyles.attended)
                )}
              </View>
            ) : null}

            {participants.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="account-multiple-outline"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>
                  {t("manageParticipants.empty")}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.loadingState}>
            <MaterialCommunityIcons
              name="lock-alert"
              size={40}
              color={colors.accent}
            />
            <Text style={styles.centerMessage}>
              {error ?? t("manageParticipants.notOwner")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const statusStyles: Record<"active" | "withdrawn" | "attended", StatusStyle> = {
  active: {
    container: {
      backgroundColor: "rgba(127, 90, 240, 0.16)",
      borderColor: colors.primary,
    },
    label: {
      color: colors.primary,
    },
  },
  withdrawn: {
    container: {
      backgroundColor: "rgba(239, 69, 101, 0.16)",
      borderColor: colors.accent,
    },
    label: {
      color: colors.accent,
    },
  },
  attended: {
    container: {
      backgroundColor: "rgba(45, 212, 191, 0.16)",
      borderColor: colors.success,
    },
    label: {
      color: colors.success,
    },
  },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    color: colors.textSecondary,
  },
  capacityPill: {
    marginTop: 18,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capacityText: {
    marginLeft: 10,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  participantName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  participantEmail: {
    color: colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  joinedLabel: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  cardActions: {
    marginTop: 16,
  },
  actionButton: {
    alignSelf: "flex-start",
  },
  emptyState: {
    marginTop: 40,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  loadingState: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  centerMessage: {
    marginTop: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export default ManageParticipantsScreen;
