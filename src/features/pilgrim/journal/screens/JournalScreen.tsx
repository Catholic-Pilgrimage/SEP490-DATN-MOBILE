import { MaterialIcons } from "@expo/vector-icons";
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
  useScrollToTop,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../constants/theme.constants";
import Toast from "react-native-toast-message";
import { useAuth } from "../../../../contexts/AuthContext";
import { getMyJournals, restoreJournal } from "../../../../services/api/pilgrim/journalApi";
import { getPlanDetail } from "../../../../services/api/pilgrim/plannerApi";
import { getSiteDetail } from "../../../../services/api/pilgrim/siteApi";
import { JournalEntry } from "../../../../types/pilgrim/journal.types";
import {
  normalizeImageUrls,
  parsePostgresArray,
} from "../../../../utils/postgresArrayParser";

const FontDisplay = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "serif",
});

const getJournalPlannerItemIds = (journal: JournalEntry): string[] =>
  Array.from(
    new Set([
      ...parsePostgresArray(journal.planner_item_id),
      ...parsePostgresArray(journal.planner_item_ids),
    ]),
  );

const pickSiteImage = (site?: any): string | null => {
  if (!site) return null;
  const candidates = [
    site.coverImage,
    site.cover_image,
    site.image,
    site.thumbnail,
    site.thumbnail_url,
    Array.isArray(site.images) ? site.images[0] : null,
  ];
  const selected = candidates.find(
    (v) => typeof v === "string" && v.trim().length > 0,
  );
  return selected ? String(selected) : null;
};

// Animated guest card with floating + icon pulse
const GuestCardAnimated = ({
  handleLogin,
  t,
}: {
  handleLogin: () => void;
  t: any;
}) => {
  const cardFloat = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat, {
          toValue: -6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(cardFloat, {
          toValue: 6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: SPACING.xl,
      }}
    >
      <Animated.View
        style={[styles.guestCard, { transform: [{ translateY: cardFloat }] }]}
      >
        <Animated.View style={{ transform: [{ scale: iconPulse }] }}>
          <MaterialIcons name="lock-outline" size={48} color="#D4AF37" />
        </Animated.View>
        <Text style={styles.guestTitle}>{t("profile.loginRequired")}</Text>
        <Text style={styles.guestSubtitle}>
          {t("profile.loginRequiredMessage")}
        </Text>
        <TouchableOpacity
          style={styles.guestLoginBtn}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <View style={styles.guestLoginInner}>
            <MaterialIcons name="login" size={20} color="#FFFFFF" />
            <Text style={styles.guestLoginText}>
              {t("profile.loginRegister", {
                defaultValue: "Đăng nhập / Đăng ký",
              })}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export const JournalScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isGuest, exitGuestMode, user } = useAuth();
  const { t } = useTranslation();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(!isGuest);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [siteNamesById, setSiteNamesById] = useState<Record<string, string>>(
    {},
  );
  const [siteImagesById, setSiteImagesById] = useState<Record<string, string>>(
    {},
  );
  const [plannerNamesById, setPlannerNamesById] = useState<
    Record<string, string>
  >({});
  const [plannerItemSiteNamesById, setPlannerItemSiteNamesById] = useState<
    Record<string, string>
  >({});
  const [plannerItemSiteImagesById, setPlannerItemSiteImagesById] = useState<
    Record<string, string>
  >({});

  const scrollRef = useRef(null);
  const requestedSiteIdsRef = useRef(new Set<string>());
  const requestedPlannerIdsRef = useRef(new Set<string>());
  const cardPressAnimsRef = useRef<Record<string, Animated.Value>>({});
  useScrollToTop(scrollRef);

  const getCardPressAnim = (id: string) => {
    if (!cardPressAnimsRef.current[id]) {
      cardPressAnimsRef.current[id] = new Animated.Value(1);
    }
    return cardPressAnimsRef.current[id];
  };

  const animateCardPress = (id: string, toValue: number) => {
    Animated.spring(getCardPressAnim(id), {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 5,
    }).start();
  };

  const fetchJournals = async (
    deleted?: boolean,
    options?: { silent?: boolean },
  ) => {
    const isDeleted = deleted ?? showDeleted;
    const silent = options?.silent === true;
    try {
      if (!silent) setLoading(true);
      const response = await getMyJournals({
        is_active: isDeleted ? "false" : "true",
      } as any);
      const journalsData = response?.data?.journals;
      if (Array.isArray(journalsData)) {
        setJournals(journalsData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handlePullRefresh = useCallback(async () => {
    try {
      setPullRefreshing(true);
      await fetchJournals(undefined, { silent: true });
    } finally {
      setPullRefreshing(false);
    }
  }, [showDeleted]);

  const handleRestore = async (id: string) => {
    try {
      setRestoringId(id);
      await restoreJournal(id);
      Toast.show({
        type: "success",
        text1: t("journal.restoreSuccess", { defaultValue: "Khôi phục thành công" }),
        position: "top",
      });
      await fetchJournals(true);
    } catch (error: any) {
      console.error("Restore failed:", error);
      Toast.show({
        type: "error",
        text1: t("journal.restoreErrorTitle", { defaultValue: "Lỗi khôi phục" }),
        text2:
          error?.response?.data?.error?.message ||
          error?.message ||
          t("journal.restoreError", { defaultValue: "Không thể khôi phục nhật ký" }),
        position: "top",
      });
    } finally {
      setRestoringId(null);
    }
  };

  const toggleDeletedView = () => {
    const next = !showDeleted;
    setShowDeleted(next);
    fetchJournals(next);
  };

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) {
        fetchJournals();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGuest, showDeleted]),
  );

  // Resolve site names/images from site detail
  useEffect(() => {
    const missingSiteIds = Array.from(
      new Set(
        journals
          .map((j) => {
            if (!j.site_id) return null;
            const hasJournalImage = normalizeImageUrls(j.image_url).length > 0;
            const needsName = !j.site?.name && !siteNamesById[j.site_id];
            const needsImage =
              !hasJournalImage &&
              !siteImagesById[j.site_id] &&
              !pickSiteImage(j.site as any);
            return needsName || needsImage ? j.site_id : null;
          })
          .filter((id): id is string =>
            Boolean(id && !requestedSiteIdsRef.current.has(id)),
          ),
      ),
    );
    if (!missingSiteIds.length) return;
    missingSiteIds.forEach((id) => requestedSiteIdsRef.current.add(id));
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        missingSiteIds.map(async (id) => {
          try {
            const r = await getSiteDetail(id);
            return {
              id,
              name: r?.data?.name || null,
              image: pickSiteImage(r?.data),
            };
          } catch {
            return { id, name: null, image: null };
          }
        }),
      );
      if (cancelled) return;
      const nextNames: Record<string, string> = {};
      const nextImages: Record<string, string> = {};
      results.forEach(({ id, name, image }) => {
        if (name) nextNames[id] = name;
        if (image) nextImages[id] = image;
        if (!name && !image) requestedSiteIdsRef.current.delete(id);
      });
      if (Object.keys(nextNames).length)
        setSiteNamesById((prev) => ({ ...prev, ...nextNames }));
      if (Object.keys(nextImages).length)
        setSiteImagesById((prev) => ({ ...prev, ...nextImages }));
    })();
    return () => {
      cancelled = true;
    };
  }, [journals, siteImagesById, siteNamesById]);

  // Resolve planner names + planner item site names
  useEffect(() => {
    const missingPlannerIds = Array.from(
      new Set(
        journals
          .map((j) => {
            const itemIds = getJournalPlannerItemIds(j);
            const needsName =
              j.planner_id &&
              !j.planner?.name &&
              !plannerNamesById[j.planner_id];
            const hasJournalImage = normalizeImageUrls(j.image_url).length > 0;
            const needsSite =
              j.planner_id &&
              itemIds.length > 0 &&
              itemIds.some((id) => !plannerItemSiteNamesById[id]);
            const needsSiteImage =
              j.planner_id &&
              !hasJournalImage &&
              itemIds.length > 0 &&
              itemIds.some((id) => !plannerItemSiteImagesById[id]);
            return needsName || needsSite || needsSiteImage
              ? j.planner_id
              : null;
          })
          .filter((id): id is string =>
            Boolean(id && !requestedPlannerIdsRef.current.has(id)),
          ),
      ),
    );
    if (!missingPlannerIds.length) return;
    missingPlannerIds.forEach((id) => requestedPlannerIdsRef.current.add(id));
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        missingPlannerIds.map(async (plannerId) => {
          try {
            const r = await getPlanDetail(plannerId);
            const planner = r?.data;
            const items =
              planner?.items ||
              Object.values(planner?.items_by_day || {}).flat();
            return {
              plannerId,
              plannerName: planner?.name || null,
              itemSiteNames: Object.fromEntries(
                (items as any[])
                  .filter((i) => i?.id && i.site?.name)
                  .map((i) => [i.id, i.site.name]),
              ) as Record<string, string>,
              itemSiteImages: Object.fromEntries(
                (items as any[])
                  .filter((i) => i?.id)
                  .map((i) => [i.id, pickSiteImage(i.site)])
                  .filter(([, image]) => Boolean(image)),
              ) as Record<string, string>,
            };
          } catch {
            return {
              plannerId,
              plannerName: null,
              itemSiteNames: {},
              itemSiteImages: {},
            };
          }
        }),
      );
      if (cancelled) return;
      const nextNames: Record<string, string> = {};
      const nextItemSites: Record<string, string> = {};
      const nextItemImages: Record<string, string> = {};
      results.forEach(
        ({ plannerId, plannerName, itemSiteNames, itemSiteImages }) => {
          if (plannerName) nextNames[plannerId] = plannerName;
          Object.assign(nextItemSites, itemSiteNames);
          Object.assign(nextItemImages, itemSiteImages);
          if (
            !plannerName &&
            Object.keys(itemSiteNames).length === 0 &&
            Object.keys(itemSiteImages).length === 0
          ) {
            requestedPlannerIdsRef.current.delete(plannerId);
          }
        },
      );
      if (Object.keys(nextNames).length)
        setPlannerNamesById((prev) => ({ ...prev, ...nextNames }));
      if (Object.keys(nextItemSites).length)
        setPlannerItemSiteNamesById((prev) => ({ ...prev, ...nextItemSites }));
      if (Object.keys(nextItemImages).length)
        setPlannerItemSiteImagesById((prev) => ({
          ...prev,
          ...nextItemImages,
        }));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    journals,
    plannerItemSiteImagesById,
    plannerItemSiteNamesById,
    plannerNamesById,
  ]);

  const handleLogin = async () => {
    if (isGuest) {
      await exitGuestMode();
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      }),
    );
  };

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const images = normalizeImageUrls(item.image_url);
    const plannerItemIds = getJournalPlannerItemIds(item);
    const heroImage =
      images[0] ||
      pickSiteImage(item.site as any) ||
      (item.site_id ? siteImagesById[item.site_id] : null) ||
      plannerItemIds.map((id) => plannerItemSiteImagesById[id]).find(Boolean) ||
      null;
    const authorName =
      item.author?.full_name || user?.fullName || t("journal.pilgrimRole");
    const cardPressAnim = getCardPressAnim(item.id);

    const resolvedSiteName = [
      item.site?.name,
      item.site_id ? siteNamesById[item.site_id] : undefined,
      ...plannerItemIds.map((id) => plannerItemSiteNamesById[id]),
    ]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(", ");

    return (
      <View style={styles.cardWrapper}>
        <View style={styles.cardStackBack} pointerEvents="none" />

        <Animated.View
          style={[
            styles.cardAnimatedWrapper,
            { transform: [{ scale: cardPressAnim }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPressIn={() => animateCardPress(item.id, 0.986)}
            onPressOut={() => animateCardPress(item.id, 1)}
            onPress={() =>
              navigation.navigate("JournalDetailScreen", { journalId: item.id })
            }
            style={styles.notebookPage}
          >
            <View style={styles.notebookInnerBorder} pointerEvents="none" />
            <Text style={styles.notebookHeader}>
              {t("journal.cardHeader", {
                defaultValue: t("journal.screenTitle").toUpperCase(),
              })}
            </Text>

            {heroImage ? (
              <View style={styles.journalImageWrap}>
                <Image
                  source={{ uri: heroImage }}
                  style={styles.journalImage}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.22)"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.journalImageOverlay}
                />
              </View>
            ) : (
              <View
                style={[styles.journalImage, styles.journalHeroPlaceholder]}
              >
                <MaterialIcons name="church" size={28} color={COLORS.accent} />
              </View>
            )}

            <View style={styles.metaSection}>
              <Text style={styles.metaText} numberOfLines={1}>
                <Text style={styles.boldLabel}>
                  {t("journal.authorLabel")}:
                </Text>{" "}
                {authorName}
              </Text>
              <Text style={styles.metaText} numberOfLines={1}>
                <Text style={styles.boldLabel}>
                  {t("journal.locationLabel")}:
                </Text>{" "}
                {resolvedSiteName || t("journal.unknownLocation")}
              </Text>
              <Text style={styles.metaText}>
                <Text style={styles.boldLabel}>{t("journal.dateLabel")}:</Text>{" "}
                {new Date(item.created_at).toLocaleDateString("vi-VN")}
              </Text>
            </View>

            <View style={styles.contentArea}>
              <View style={styles.leftMarginLine} />
              <View pointerEvents="none" style={styles.ruledLinesContainer}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <View key={`rule-${idx}`} style={styles.ruleLine} />
                ))}
              </View>
              <View style={styles.handwritingTitleRow}>
                <MaterialIcons
                  name="create"
                  size={15}
                  color="#a9734d"
                  style={styles.handwritingTitleIcon}
                />
                <Text style={styles.handwritingTitle}>
                  {item.title || t("journal.defaultTitle")}
                </Text>
              </View>
              <Text style={styles.journalBody} numberOfLines={4}>
                {item.content}
              </Text>
            </View>

            {/* Deleted overlay with restore button */}
            {showDeleted && (
              <View style={styles.deletedOverlay}>
                <View style={styles.deletedBadge}>
                  <MaterialIcons name="delete" size={14} color="#fff" />
                  <Text style={styles.deletedBadgeText}>
                    {t("journal.deletedLabel", { defaultValue: "Đã xóa" })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.restoreCardBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRestore(item.id);
                  }}
                  activeOpacity={0.8}
                  disabled={restoringId === item.id}
                >
                  {restoringId === item.id ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : (
                    <>
                      <MaterialIcons name="restore" size={18} color={COLORS.accent} />
                      <Text style={styles.restoreCardBtnText}>
                        {t("journal.restore", { defaultValue: "Khôi phục" })}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bindingContainer} pointerEvents="none">
          {Array.from({ length: 8 }).map((_, idx) => (
            <View key={`ring-${item.id}-${idx}`} style={styles.ringHole}>
              <View style={styles.ironRing} />
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ImageBackground
      source={require("../../../../../assets/images/journal-bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTitleContainer}>
          {/* Background Icon Decoration - Aligned with Planner */}
          <View style={styles.headerWatermark}>
            <MaterialIcons
              name="church"
              size={160}
              color={COLORS.textTertiary}
              style={{ opacity: 0.1 }}
            />
          </View>

          {/* Tagline row with restore icon */}
          <View style={styles.headerTaglineRow}>
            <Text style={styles.headerTagline}>{t("journal.tagline")}</Text>
            {!isGuest && (
              <TouchableOpacity
                style={[
                  styles.restoreToggleBtn,
                  showDeleted && styles.restoreToggleBtnActive,
                ]}
                onPress={toggleDeletedView}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={showDeleted ? "restore" : "delete-outline"}
                  size={20}
                  color={showDeleted ? COLORS.white : COLORS.accent}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Main Title */}
          <Text style={styles.headerTitle}>
            {showDeleted
              ? t("journal.deletedTitle", { defaultValue: "ĐÃ XÓA" })
              : t("journal.screenTitle")}
          </Text>

          {/* Yellow Line Decoration */}
          <View style={styles.headerDecoration} />
        </View>
      </View>

      {isGuest ? (
        <GuestCardAnimated handleLogin={handleLogin} t={t} />
      ) : loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          ref={scrollRef}
          data={journals}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: 100 }} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Text style={{ color: COLORS.textSecondary }}>
                {t("journal.emptyList")}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={handlePullRefresh}
              progressViewOffset={Math.max(insets.top, 0) + 8}
              colors={[COLORS.accent]}
              tintColor={COLORS.accent}
            />
          }
        />
      )}

      {/* FAB - Hidden for guests */}
      {!isGuest && (
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(insets.bottom, 10) + 6 }]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("CreateJournalScreen")}
        >
          <LinearGradient
            colors={[COLORS.accent, COLORS.accentDark]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="edit" size={24} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4eee0",
  },
  bgPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  header: {
    paddingHorizontal: SPACING.lg, // Increased padding
    paddingBottom: SPACING.md,
    backgroundColor: "transparent",
    zIndex: 10,
    marginBottom: 10,
  },
  headerTitleContainer: {
    position: "relative",
    paddingVertical: SPACING.xs,
  },
  headerWatermark: {
    position: "absolute",
    right: -30,
    top: -40,
    transform: [{ rotate: "-15deg" }], // Matching Planner style
    zIndex: -1,
  },
  headerTaglineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTagline: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: FontDisplay,
    fontSize: 32,
    fontWeight: "700",
    color: "#4a3e35",
    lineHeight: 38,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  headerDecoration: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginTop: 16,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 20,
    paddingBottom: 165,
    gap: 0,
  },
  cardWrapper: {
    marginBottom: 24,
    paddingLeft: 0,
    position: "relative",
    marginHorizontal: 16,
  },
  cardAnimatedWrapper: {
    borderRadius: 6,
  },
  cardStackBack: {
    position: "absolute",
    left: 12,
    right: 2,
    top: 3,
    bottom: -2,
    borderRadius: 6,
    backgroundColor: "#eee5d5",
    borderWidth: 1.1,
    borderColor: "#d2c4a8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 1,
  },
  cardContainer: {
    flexDirection: "row",
    marginBottom: 25,
    position: "relative",
  },
  card: {
    backgroundColor: "transparent",
    borderRadius: BORDER_RADIUS.xl, // Increased radius
    padding: 0,
    ...SHADOWS.small,
    shadowColor: "rgba(26, 42, 70, 0.08)",
    borderWidth: 0,
    overflow: "visible",
    position: "relative",
  },
  cardPrivate: {
    backgroundColor: "#fff",
  },
  privateDecor: {
    position: "absolute",
    right: -30,
    bottom: -30,
    opacity: 0.03,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface0,
    padding: 2,
    ...SHADOWS.small,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  initialAvatar: {
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  initialAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6, // Taller pill
    borderRadius: 20,
    backgroundColor: COLORS.background, // Subtle default
  },
  badgePublic: {
    backgroundColor: "rgba(236, 182, 19, 0.08)",
  },
  badgePrivate: {
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  badgeTextPublic: {
    color: COLORS.accentDark,
  },
  badgeTextPrivate: {
    color: COLORS.textSecondary,
  },
  contentContainer: {
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: FontDisplay, // Serif for entry titles too
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 10,
    lineHeight: 30,
  },
  cardBody: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 26,
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
  },
  quoteContainer: {
    marginTop: 16,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accentLight,
  },
  quoteText: {
    fontFamily: FontDisplay,
    fontStyle: "italic",
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  imageGrid: {
    flexDirection: "row",
    height: 200,
    gap: 10,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  mainImageContainer: {
    flex: 1,
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  sideImagesContainer: {
    width: "48%",
    gap: 10,
  },
  sideImageWrapper: {
    flex: 1,
    borderRadius: 0,
  },
  sideImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  socialActions: {
    flexDirection: "row",
    gap: 14,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  fab: {
    position: "absolute",
    right: 18,
    borderRadius: 28,
    ...SHADOWS.large,
    shadowColor: COLORS.accent,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  fabIconContainer: {
    // Removed container for cleaner look
  },
  guestCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.md,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    width: "100%",
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  guestLoginBtn: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: SPACING.sm,
  },
  guestLoginInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: "#D4AF37",
    gap: 8,
  },
  guestLoginText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
  fabText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
  cardInactive: {
    opacity: 0.92,
  },
  inactiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#c0392b",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  inactiveBannerText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textFaded: {
    color: COLORS.textTertiary,
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#27ae60",
    borderRadius: 20,
  },
  restoreButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  notebookPage: {
    backgroundColor: "#fffcf5",
    borderRadius: 6,
    padding: 16,
    paddingLeft: 28,
    borderWidth: 2.2,
    borderColor: "#bcae8f",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    position: "relative",
  },
  notebookInnerBorder: {
    position: "absolute",
    left: 5,
    right: 5,
    top: 5,
    bottom: 5,
    borderWidth: 1,
    borderColor: "#ece2cf",
    borderRadius: 4,
  },
  notebookHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4a3e35",
    letterSpacing: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: "#dcd1bb",
    paddingBottom: 5,
    marginBottom: 12,
  },
  bindingContainer: {
    position: "absolute",
    left: 8,
    top: 16,
    bottom: 16,
    justifyContent: "space-between",
    width: 14,
    zIndex: 10,
  },
  ringHole: {
    width: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1c7b7",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 0,
  },
  ironRing: {
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#5d5d5d",
    position: "absolute",
    left: -4,
    borderTopWidth: 1,
    borderTopColor: "#999",
    borderBottomWidth: 1.5,
    borderBottomColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 1,
    elevation: 3,
  },
  journalImage: {
    width: "100%",
    height: 168,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e6dac8",
  },
  journalImageWrap: {
    position: "relative",
  },
  journalImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    marginBottom: 12,
  },
  journalHeroImage: {
    width: "100%",
    height: 118,
    borderRadius: 10,
    borderWidth: 1.4,
    borderColor: "#ddd3c2",
    resizeMode: "cover",
  },
  journalHeroPlaceholder: {
    backgroundColor: "#ddd7cb",
    justifyContent: "center",
    alignItems: "center",
  },
  metaBlock: {
    marginTop: 10,
    marginBottom: 8,
    gap: 2,
  },
  metaSection: {
    marginBottom: 15,
  },
  metaText: {
    fontSize: 13,
    color: "#635449",
    lineHeight: 20,
  },
  boldLabel: {
    fontWeight: "700",
    color: "#4a3e35",
  },
  metaLine: {
    fontSize: 13.5,
    color: "#35312d",
    lineHeight: 19,
  },
  metaLabel: {
    fontWeight: "700",
  },
  notebookTitle: {
    fontFamily: FontDisplay,
    fontStyle: "italic",
    fontSize: 35,
    lineHeight: 40,
    color: "#2f2419",
    marginTop: 2,
    marginBottom: 4,
  },
  notebookBody: {
    fontSize: 15,
    color: "#3b3329",
    lineHeight: 24,
  },
  contentArea: {
    position: "relative",
    borderTopWidth: 1,
    borderTopColor: "#ddd2bf",
    paddingTop: 12,
    paddingLeft: 14,
    minHeight: 122,
    justifyContent: "flex-start",
  },
  leftMarginLine: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 4,
    width: 1.2,
    backgroundColor: "rgba(212, 120, 100, 0.55)",
  },
  ruledLinesContainer: {
    ...StyleSheet.absoluteFillObject,
    top: 10,
    left: 10,
    right: 0,
    justifyContent: "space-around",
    opacity: 0.45,
  },
  ruleLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#eeeadd",
    height: 30,
  },
  handwritingTitle: {
    fontFamily: FontDisplay,
    fontSize: 20,
    fontStyle: "italic",
    color: "#a46f48",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.08)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    marginBottom: 8,
    zIndex: 2,
  },
  handwritingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
    zIndex: 2,
  },
  handwritingTitleIcon: {
    marginTop: 1,
  },
  journalBody: {
    fontSize: 15,
    color: "#504238",
    lineHeight: 30,
    fontStyle: "normal",
    zIndex: 2,
  },
  bottomRule: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#d6c9b4",
  },
  notebookActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteEditBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#8b5a24",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6b4317",
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  restoreToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  restoreToggleBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  deletedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  deletedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(220, 60, 60, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deletedBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  restoreCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  restoreCardBtnText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "700",
  },
});
