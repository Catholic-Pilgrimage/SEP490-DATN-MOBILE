import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toast from "react-native-toast-message";
import { toastConfig } from "../../../../../config/toast.config";
import {
    ActivityIndicator,
  Animated,
  Easing,
    FlatList,
    Image,
    Modal,
  Pressable,
  ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../../../constants/theme.constants";
import type { SiteType } from "../../../../../types/common.types";
import { SiteSummary } from "../../../../../types/pilgrim";


type RegionFilter = "all" | "north" | "central" | "south";

interface AddSiteModalProps {
  visible: boolean;
  onClose: () => void;
  t: (key: string, options?: any) => string;
  styles: any;
  activeTab: "all" | "favorites" | "events";
  setActiveTab: (tab: "all" | "favorites" | "events") => void;
  onOpenEventsTab: () => void;
  isLoadingSites: boolean;
  isLoadingFavorites: boolean;
  isLoadingEventSites: boolean;
  eventSitesList: SiteSummary[];
  onSelectEventSite: (site: SiteSummary) => void;
  sites: SiteSummary[];
  favorites: SiteSummary[];
  onAddSite?: (siteId: string) => void;
  onOpenNearbyAmenities?: (site: SiteSummary) => void;
  /** Chạm vào ảnh/tên địa điểm — mở trang chi tiết site (nút + vẫn chỉ thêm vào lịch). */
  onOpenSiteDetail?: (siteId: string) => void;
  addingItem: boolean;
  alreadyAddedSiteIds: Set<string>;
  addedCount: number;
}

export default function AddSiteModal({
  visible,
  onClose,
  t,
  styles: sharedStyles,
  activeTab,
  setActiveTab,
  onOpenEventsTab,
  isLoadingSites,
  isLoadingFavorites,
  isLoadingEventSites,
  eventSitesList,
  onSelectEventSite,
  sites,
  favorites,
  onAddSite,
  onOpenNearbyAmenities,
  onOpenSiteDetail,
  addingItem,
  alreadyAddedSiteIds,
  addedCount,
}: AddSiteModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [regionSheetVisible, setRegionSheetVisible] = useState(false);
  const [pendingAddSiteId, setPendingAddSiteId] = useState<string | null>(null);
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const q = searchQuery.trim().toLowerCase();

  /** Padding đáy list để không bị floating bar che — tính trực tiếp tránh lỗi scope/Hermes với biến trung gian. */
  const bottomPad =
    110 + Math.max(typeof insets?.bottom === "number" ? insets.bottom : 0, 8);

  const matchesRegion = useCallback((site: SiteSummary) => {
    if (regionFilter === "all") return true;
    const r = String(site.region || "").toLowerCase();
    if (regionFilter === "north") return r.includes("bac") || r.includes("bắc");
    if (regionFilter === "central") return r.includes("trung");
    if (regionFilter === "south") return r.includes("nam");
    return true;
  }, [regionFilter]);

  const filteredSites = useMemo(() => {
    const byRegion = sites.filter(matchesRegion);
    const searched = !q
      ? byRegion
      : byRegion.filter((s) => {
          const name = (s.name || "").toLowerCase();
          const address = (s.address || "").toLowerCase();
          return name.includes(q) || address.includes(q);
        });
    return [...searched].sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
  }, [q, sites, matchesRegion]);

  const filteredFavorites = useMemo(() => {
    const byRegion = favorites.filter(matchesRegion);
    const searched = !q
      ? byRegion
      : byRegion.filter((s) => {
          const name = (s.name || "").toLowerCase();
          const address = (s.address || "").toLowerCase();
          return name.includes(q) || address.includes(q);
        });
    return [...searched].sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
  }, [q, favorites, matchesRegion]);

  const filteredEventSites = useMemo(() => {
    const byRegion = eventSitesList.filter(matchesRegion);
    const searched = !q
      ? byRegion
      : byRegion.filter((s) => {
          const name = (s.name || "").toLowerCase();
          const address = (s.address || "").toLowerCase();
          return name.includes(q) || address.includes(q);
        });
    return [...searched].sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
  }, [q, eventSitesList, matchesRegion]);

  const featuredSites = useMemo(() => {
    // Featured should be stable and meaningful: only show in "All" tab without keyword search.
    if (activeTab !== "all" || q.length > 0) return [];

    const candidates = sites.filter(matchesRegion);
    if (candidates.length === 0) return [];

    const hasRankingSignal = candidates.some(
      (s) => Number(s.rating || 0) > 0 || Number(s.reviewCount || 0) > 0
    );

    if (hasRankingSignal) {
      return [...candidates]
        .sort((a, b) => {
          const ratingA = Number(a.rating || 0);
          const ratingB = Number(b.rating || 0);
          const reviewsA = Number(a.reviewCount || 0);
          const reviewsB = Number(b.reviewCount || 0);

          // Weighted score balances quality (rating) and confidence (review count).
          const scoreA = ratingA * Math.log10(reviewsA + 1);
          const scoreB = ratingB * Math.log10(reviewsB + 1);

          if (scoreB !== scoreA) return scoreB - scoreA;
          if (reviewsB !== reviewsA) return reviewsB - reviewsA;
          if (ratingB !== ratingA) return ratingB - ratingA;
          return (a.name || "").localeCompare(b.name || "", "vi");
        })
        .slice(0, 5);
    }

    // Fallback when API has no ranking metrics yet.
    const keywordBoost = (name?: string) => {
      const n = String(name || "").toLowerCase();
      if (n.includes("la vang")) return 5;
      if (n.includes("phú nhai") || n.includes("phu nhai")) return 4;
      if (n.includes("fatima")) return 3;
      if (n.includes("trà kiệu") || n.includes("tra kieu")) return 2;
      return 0;
    };

    return [...candidates]
      .sort((a, b) => {
        const boost = keywordBoost(b.name) - keywordBoost(a.name);
        if (boost !== 0) return boost;
        return (a.name || "").localeCompare(b.name || "", "vi");
      })
      .slice(0, 5);
  }, [activeTab, q, sites, matchesRegion]);

  const featuredPrimary = useMemo(() => featuredSites.slice(0, 2), [featuredSites]);
  const featuredSecondary = useMemo(() => featuredSites.slice(2), [featuredSites]);
  const eventSiteIdSet = useMemo(
    () => new Set(eventSitesList.map((site) => String(site.id))),
    [eventSitesList],
  );

  const listData = useMemo(() => {
    if (activeTab === "events") return filteredEventSites;
    if (activeTab === "favorites") return filteredFavorites;
    // "Tất cả địa điểm" nên luôn chứa toàn bộ site, bao gồm cả những site nổi bật.
    return filteredSites;
  }, [
    activeTab,
    filteredEventSites,
    filteredFavorites,
    filteredSites,
  ]);

  const activeCount =
    activeTab === "events"
      ? filteredEventSites.length
      : activeTab === "favorites"
      ? filteredFavorites.length
      : filteredSites.length;

  const hasActiveFilters = regionFilter !== "all" || q.length > 0;

  const isCurrentTabLoading =
    activeTab === "events"
      ? isLoadingEventSites
      : activeTab === "favorites"
        ? isLoadingFavorites
        : isLoadingSites;

  const hasCurrentTabData = activeCount > 0;
  const showBlockingLoader = isCurrentTabLoading && !hasCurrentTabData;

  const regionOptions = useMemo(
    () => [
      { key: "all" as RegionFilter, label: t("explore.allRegions") },
      { key: "north" as RegionFilter, label: t("explore.north") },
      { key: "central" as RegionFilter, label: t("explore.central") },
      { key: "south" as RegionFilter, label: t("explore.south") },
    ],
    [t]
  );

  const selectedRegionLabel =
    regionOptions.find((r) => r.key === regionFilter)?.label ||
    t("explore.allRegions");

  const openRegionSheet = () => {
    setRegionSheetVisible(true);
  };

  const closeRegionSheet = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => setRegionSheetVisible(false));
  }, [sheetAnim]);

  useEffect(() => {
    if (!visible) {
      setRegionSheetVisible(false);
      setPendingAddSiteId(null);
      setShowAllFeatured(false);
    }
  }, [visible]);

  useEffect(() => {
    setShowAllFeatured(false);
  }, [activeTab, q, regionFilter]);

  useEffect(() => {
    if (!pendingAddSiteId) return;
    if (alreadyAddedSiteIds.has(pendingAddSiteId) || !addingItem) {
      setPendingAddSiteId(null);
    }
  }, [addingItem, alreadyAddedSiteIds, pendingAddSiteId]);

  useEffect(() => {
    if (!regionSheetVisible) return;
    sheetAnim.setValue(0);
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [regionSheetVisible, sheetAnim]);

  /**
   * Nhãn loại địa điểm — lấy từ `site.type` (API / SiteType).
   * Enum chuẩn: church | shrine | monastery | center | other (xem `types/common.types`).
   * Trước đây chỉ khớp chuỗi "cathedral"/"parish" nên gần như mọi site đều rơi về "Hành hương".
   */
  const getTypeLabel = (site: SiteSummary): string => {
    const raw = String((site as { type?: SiteType | string }).type ?? "")
      .trim()
      .toLowerCase();
    const byEnum: Record<SiteType, string> = {
      church: t("explore.typeChurch"),
      shrine: t("planner.typeHolyLand"),
      monastery: t("explore.typeMonastery"),
      center: t("explore.typeCenter"),
      other: t("planner.typeLocation"),
    };
    if (raw in byEnum) return byEnum[raw as SiteType];
    if (raw.includes("cathedral") || raw.includes("vương cung"))
      return t("planner.typeHolyLand");
    if (raw.includes("parish") || raw.includes("giáo xứ")) return t("planner.typeParish");
    return t("planner.typePilgrimage");
  };

  const getShortLocation = (address?: string) => {
    const raw = String(address || "").trim();
    if (!raw) return "Địa điểm hành hương";
    const parts = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length >= 2)
      return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    return parts[0];
  };

  const handleAddFromList = (siteId: string) => {
    if (!onAddSite || addingItem || pendingAddSiteId) return;
    setPendingAddSiteId(siteId);
    onAddSite(siteId);
  };

  const renderSiteRow = (item: SiteSummary, featured = false) => {
    const hasEvents =
      item.hasEvents === true ||
      Number(item.eventCount || 0) > 0 ||
      eventSiteIdSet.has(String(item.id));
    const isAdded = alreadyAddedSiteIds.has(item.id);
    const isPending = pendingAddSiteId === item.id;
    const isActionLocked = addingItem || !!pendingAddSiteId;
    const canAddFromCard = !!onAddSite && !isAdded && !isActionLocked;

    const handleCardPress = () => {
      if (isActionLocked) return;
      if (canAddFromCard) {
        handleAddFromList(item.id);
        return;
      }
      onOpenSiteDetail?.(item.id);
    };

    return (
      <View
        style={[
          sharedStyles.siteItem,
          localStyles.siteCard,
          hasEvents && localStyles.siteCardWithEvent,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            localStyles.cardGlow,
            hasEvents && localStyles.cardGlowWithEvent,
          ]}
        />
        <TouchableOpacity
          style={localStyles.siteMainPressable}
          activeOpacity={0.88}
          onPress={handleCardPress}
          onLongPress={() => onOpenSiteDetail?.(item.id)}
          delayLongPress={260}
          disabled={isActionLocked ? true : (!canAddFromCard && !onOpenSiteDetail)}
        >
          <View style={localStyles.siteTopRow}>
            <View style={localStyles.siteImageWrap}>
              <Image
                source={{
                  uri: item.coverImage || "https://via.placeholder.com/60",
                }}
                style={sharedStyles.siteItemImage}
              />
              {featured ? (
                <View style={localStyles.featuredCornerIcon}>
                  <Ionicons name="sparkles" size={11} color="#fff" />
                </View>
              ) : null}
            </View>

            <View style={localStyles.siteTopTextColumn}>
              <View style={localStyles.siteTitleRow}>
                <Text
                  style={[sharedStyles.siteItemName, localStyles.siteTitle]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.name}
                </Text>
              </View>
            </View>
          </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={localStyles.siteTagsRow}
              style={localStyles.siteTagsScroller}
            >
              {hasEvents ? (
                <View style={localStyles.eventBadge}>
                  <Ionicons name="calendar" size={10} color="#7C2D12" />
                  <Text style={localStyles.eventBadgeText}>
                    {t("planner.hasEventsShort", {
                      defaultValue: "Có sự kiện",
                    })}
                  </Text>
                </View>
              ) : null}
              <View style={localStyles.typeBadge}>
                <Text style={localStyles.typeBadgeText}>
                  {getTypeLabel(item)}
                </Text>
              </View>
              {item.patronSaint && (
                <View style={localStyles.patronBadge}>
                  <Text style={localStyles.patronBadgeText} numberOfLines={1}>
                    {t("planner.patronSaintShort", {
                      defaultValue: "Bổn mạng: {{name}}",
                      name: item.patronSaint,
                    })}
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={localStyles.siteAddressRow}>
              <Ionicons name="location" size={12} color="#DC2626" />
              <Text
                style={[
                  sharedStyles.siteItemAddress,
                  localStyles.siteAddressText,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {getShortLocation(item.address)}
              </Text>
            </View>
        </TouchableOpacity>

        <View style={localStyles.siteActionsColumn}>
          {!featured ? (
            <TouchableOpacity
              style={localStyles.nearbyActionButton}
              onPress={() => {
                if (isActionLocked) return;
                onOpenNearbyAmenities?.(item);
              }}
              disabled={!onOpenNearbyAmenities || isActionLocked}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="map-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              localStyles.addSiteButton,
              hasEvents && localStyles.addSiteButtonWithEvent,
              isPending && localStyles.pendingSiteButton,
              isAdded && localStyles.addedSiteButton,
            ]}
            onPress={() => !isAdded && handleAddFromList(item.id)}
            disabled={addingItem || !!pendingAddSiteId || isAdded}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#4B5563" />
            ) : isAdded ? (
              <Ionicons name="checkmark" size={20} color="#fff" />
            ) : (
              <Ionicons name="add" size={22} color="#4B5563" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[sharedStyles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={sharedStyles.modalHeader}>
          <Text style={sharedStyles.modalTitle}>
            {t("planner.chooseLocation")}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={sharedStyles.modalClose}>{t("planner.close")}</Text>
          </TouchableOpacity>
        </View>

        <View style={localStyles.tabsOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={localStyles.tabsRow}
          >
            <TouchableOpacity
              style={[
                localStyles.tabButton,
                activeTab === "all" && localStyles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("all")}
            >
              <View style={localStyles.tabInner}>
                <Ionicons
                  name="location-outline"
                  size={15}
                  color={activeTab === "all" ? "#0F172A" : COLORS.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    localStyles.tabText,
                    activeTab === "all" && localStyles.tabTextActive,
                  ]}
                >
                  {t("planner.allLocations")}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                localStyles.tabButton,
                activeTab === "events" && localStyles.tabButtonActive,
              ]}
              onPress={onOpenEventsTab}
            >
              <View style={localStyles.tabInner}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={activeTab === "events" ? "#0F172A" : COLORS.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    localStyles.tabText,
                    activeTab === "events" && localStyles.tabTextActive,
                  ]}
                >
                  {t("planner.events")}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                localStyles.tabButton,
                activeTab === "favorites" && localStyles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("favorites")}
            >
              <View style={localStyles.tabInner}>
                <Ionicons
                  name="heart-outline"
                  size={15}
                  color={activeTab === "favorites" ? "#0F172A" : COLORS.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    localStyles.tabText,
                    activeTab === "favorites" && localStyles.tabTextActive,
                  ]}
                >
                  {t("planner.myFavorites")}
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={localStyles.filterBarWrap}>
          <View
            style={[
              localStyles.searchBox,
              isSearchFocused && localStyles.searchBoxFocused,
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={COLORS.textTertiary}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("common.search", { defaultValue: "Tìm kiếm" })}
              placeholderTextColor={COLORS.textTertiary}
              style={{
                flex: 1,
                color: COLORS.textPrimary,
                fontSize: 14,
                padding: 0,
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              localStyles.openFilterButton,
              regionFilter !== "all" && localStyles.openFilterButtonActive,
            ]}
            onPress={openRegionSheet}
            activeOpacity={0.85}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={regionFilter !== "all" ? "#9A3412" : COLORS.textSecondary}
            />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                localStyles.openFilterText,
                regionFilter !== "all" && localStyles.openFilterTextActive,
              ]}
            >
              {regionFilter === "all"
                ? t("planner.regionFilterBtn", { defaultValue: "Bộ lọc" })
                : selectedRegionLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={localStyles.listMetaRow}>
          <Text style={localStyles.listMetaText}>
            {t("planner.foundPlacesLabel", {
              defaultValue: "{{count}} địa điểm phù hợp",
              count: activeCount,
            })}
          </Text>
          {hasActiveFilters ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setRegionFilter("all");
              }}
            >
              <Text style={localStyles.clearFilterText}>
                {t("planner.clearFilters", { defaultValue: "Xóa lọc" })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={localStyles.actionHintRow}>
          <Ionicons name="add-circle-outline" size={12} color={COLORS.textTertiary} />
          <Text style={localStyles.actionHintText}>
            {t("planner.addGestureHint", {
              defaultValue: "Chạm để thêm, nhấn giữ để xem chi tiết",
            })}
          </Text>
        </View>



        {showBlockingLoader ? (
          <ActivityIndicator
            size="large"
            color={COLORS.accent}
            style={{ marginTop: 20 }}
          />
        ) : activeTab === "events" ? (
          filteredEventSites.length === 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 32,
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={48}
                color={COLORS.textTertiary}
              />
              <Text
                style={{
                  color: COLORS.textSecondary,
                  marginTop: 12,
                  fontSize: 15,
                  textAlign: "center",
                }}
              >
                {t("planner.noEventSitesHint")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredEventSites}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={sharedStyles.siteItem}
                  onPress={() => onSelectEventSite(item)}
                >
                  <Image
                    source={{
                      uri: item.coverImage || "https://via.placeholder.com/60",
                    }}
                    style={sharedStyles.siteItemImage}
                  />
                  <View style={sharedStyles.siteItemContent}>
                    <Text style={sharedStyles.siteItemName}>{item.name}</Text>
                    <Text
                      style={sharedStyles.siteItemAddress}
                      numberOfLines={1}
                    >
                      {t("planner.selectToSeeEvents")}
                    </Text>
                  </View>
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={COLORS.accent}
                  />
                </TouchableOpacity>
              )}
            />
          )
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
            ListHeaderComponent={
              activeTab === "all" && featuredSites.length > 0 ? (
                <View style={localStyles.sectionWrap}>
                  <View style={localStyles.sectionHeaderRow}>
                    <Text style={localStyles.featuredSectionTitle}>
                      {t("planner.featuredSuggestions")}
                    </Text>
                    <View style={localStyles.sectionCountPill}>
                      <Text style={localStyles.sectionCountPillText}>{featuredSites.length}</Text>
                    </View>
                  </View>
                  {featuredPrimary.map((s) => (
                    <View key={`featured_${s.id}`}>
                      {renderSiteRow(s, true)}
                    </View>
                  ))}
                  {featuredSecondary.length > 0 ? (
                    <TouchableOpacity
                      style={localStyles.moreFeaturedBtn}
                      onPress={() => setShowAllFeatured((v) => !v)}
                      activeOpacity={0.85}
                    >
                      <Text style={localStyles.moreFeaturedBtnText}>
                        {showAllFeatured
                          ? t("planner.collapseFeatured", { defaultValue: "Thu gọn gợi ý" })
                          : t("planner.expandFeatured", {
                              defaultValue: "Xem thêm {{count}} gợi ý",
                              count: featuredSecondary.length,
                            })}
                      </Text>
                      <Ionicons
                        name={showAllFeatured ? "chevron-up" : "chevron-down"}
                        size={14}
                        color="#9A3412"
                      />
                    </TouchableOpacity>
                  ) : null}
                  {showAllFeatured
                    ? featuredSecondary.map((s) => (
                        <View key={`featured_more_${s.id}`}>
                          {renderSiteRow(s, true)}
                        </View>
                      ))
                    : null}
                  <Text style={localStyles.normalSectionTitle}>
                    {t("planner.allLocationsSection")}
                  </Text>
                </View>
              ) : null
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={8}
            removeClippedSubviews
            ListEmptyComponent={
              <View style={localStyles.emptyStateWrap}>
                <Ionicons name="compass-outline" size={42} color={COLORS.textTertiary} />
                <Text style={localStyles.emptyStateTitle}>
                  {t("planner.emptyResultTitle", {
                    defaultValue: "Không tìm thấy địa điểm phù hợp",
                  })}
                </Text>
                <Text style={localStyles.emptyStateDesc}>
                  {t("planner.emptyResultDesc", {
                    defaultValue: "Thử từ khóa khác hoặc đặt lại bộ lọc vùng để xem thêm địa điểm.",
                  })}
                </Text>
                {hasActiveFilters ? (
                  <TouchableOpacity
                    style={localStyles.emptyStateButton}
                    onPress={() => {
                      setSearchQuery("");
                      setRegionFilter("all");
                    }}
                  >
                    <Text style={localStyles.emptyStateButtonText}>
                      {t("planner.clearFilters", { defaultValue: "Xóa lọc" })}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => renderSiteRow(item)}
          />
        )}
        <View
          style={[
            localStyles.bottomBarShadowWrap,
            { bottom: 12 + Math.max(insets.bottom, 8) },
          ]}
          pointerEvents="box-none"
        >
          <View style={localStyles.bottomBar}>
            <Text style={localStyles.bottomBarText} numberOfLines={1}>
              {t("planner.addedCountLabel", { count: addedCount })}
            </Text>
            <TouchableOpacity
              style={localStyles.bottomBarButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={localStyles.bottomBarButtonText}>
                {t("planner.viewItineraryCta")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal
        visible={regionSheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeRegionSheet}
      >
        <Pressable style={localStyles.sheetBackdrop} onPress={closeRegionSheet}>
          <Animated.View
            style={[
              localStyles.regionSheet,
              { paddingBottom: 26 + Math.max(insets.bottom, 8) },
              {
                transform: [
                  {
                    translateY: sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [220, 0],
                    }),
                  },
                ],
                opacity: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.65, 1],
                }),
              },
            ]}
          >
            <View style={localStyles.sheetHandle} />
            <Text style={localStyles.regionSheetTitle}>
              {t("planner.chooseRegionTitle", { defaultValue: "Chọn khu vực" })}
            </Text>

            {regionOptions.map((opt) => {
              const active = regionFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[localStyles.regionSheetItem, active && localStyles.regionSheetItemActive]}
                  onPress={() => {
                    setRegionFilter(opt.key);
                    closeRegionSheet();
                  }}
                >
                  <Text
                    style={[
                      localStyles.regionSheetItemText,
                      active && localStyles.regionSheetItemTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={18} color="#9A3412" />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </Pressable>
      </Modal>

      {visible ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, elevation: 9999 }} pointerEvents="box-none">
          <Toast config={toastConfig} />
        </View>
      ) : null}
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginTop: -2,
  },
  headerMetaText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    paddingRight: 12,
  },
  headerCountBadge: {
    minWidth: 34,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(217,119,6,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCountBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A3412",
  },
  tabsOuter: {
    marginTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  tabsRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  tabButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    flexShrink: 0,
  },
  tabButtonActive: {
    backgroundColor: "rgba(217,119,6,0.15)",
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.22)",
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    maxWidth: 136,
  },
  tabTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  filterBarWrap: {
    marginTop: 8,
    marginHorizontal: 16,
    padding: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  searchBoxFocused: {
    borderColor: "rgba(217,119,6,0.34)",
    backgroundColor: "#FFFFFF",
  },
  openFilterButton: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 160,
  },
  openFilterButtonActive: {
    backgroundColor: "rgba(217,119,6,0.14)",
    borderColor: "rgba(217,119,6,0.24)",
  },
  openFilterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  openFilterTextActive: {
    color: "#9A3412",
  },
  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
  },
  listMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  actionHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  actionHintText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "500",
  },
  siteMainPressable: {
    flex: 1,
    flexDirection: "column",
    alignItems: "stretch",
  },
  siteTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  siteImageWrap: {
    position: "relative",
  },
  siteTopTextColumn: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 0,
  },
  siteCard: {
    marginBottom: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    borderRadius: 18,
    padding: 11,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    position: "relative",
    overflow: "hidden",
  },
  siteCardWithEvent: {
    borderColor: "rgba(180, 83, 9, 0.34)",
    backgroundColor: "#FFF9F3",
    shadowOpacity: 0.14,
    elevation: 6,
  },
  cardGlow: {
    position: "absolute",
    top: -34,
    right: -18,
    width: 90,
    height: 90,
    borderRadius: 999,
    backgroundColor: "rgba(217,119,6,0.08)",
  },
  cardGlowWithEvent: {
    backgroundColor: "rgba(217,119,6,0.18)",
    top: -28,
    width: 100,
    height: 100,
  },
  siteItemTextColumn: {
    flex: 1,
    minWidth: 0,
    marginRight: 0,
  },
  /** Cố định chiều cao 2 dòng — mọi thẻ cùng bậc, tên 1 dòng vẫn chừa khoảng trống dưới (đồng điều UI). */
  siteTitleRow: {
    minHeight: 42,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  siteTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
    flex: 1,
    minWidth: 0,
  },
  siteTagsScroller: {
    maxHeight: 22,
    marginBottom: 6,
    marginTop: 2,
  },
  siteTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 8,
  },
  siteAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  siteAddressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(217,119,6,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.25)",
  },
  eventBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(180, 83, 9, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(180, 83, 9, 0.28)",
  },
  eventBadgeText: {
    fontSize: 10,
    color: "#7C2D12",
    fontWeight: "800",
  },
  typeBadgeText: {
    fontSize: 10,
    color: "#B45309",
    fontWeight: "700",
  },
  featuredCornerIcon: {
    position: "absolute",
    left: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#CA8A04",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fff",
  },
  patronBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(30, 77, 107, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(30, 77, 107, 0.2)",
    maxWidth: 190,
  },
  patronBadgeText: {
    fontSize: 10,
    color: "#1E4D6B",
    fontWeight: "700",
  },
  addSiteButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginLeft: 10,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  addSiteButtonWithEvent: {
    backgroundColor: "#FEF3C7",
    borderColor: "rgba(180, 83, 9, 0.34)",
  },
  siteActionsColumn: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginLeft: 8,
  },
  nearbyActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  pendingSiteButton: {
    backgroundColor: "#EEF2F7",
  },
  addedSiteButton: {
    backgroundColor: COLORS.accent,
    borderColor: "rgba(0,0,0,0)",
  },
  regionChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
    gap: 6,
    paddingRight: 12,
    minHeight: 32,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "flex-end",
  },
  regionSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.14)",
    marginBottom: 10,
  },
  regionSheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  regionSheetItem: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  regionSheetItemActive: {
    backgroundColor: "rgba(217,119,6,0.12)",
    borderColor: "rgba(217,119,6,0.28)",
  },
  regionSheetItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  regionSheetItemTextActive: {
    color: "#9A3412",
  },
  regionChip: {
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  regionChipActive: {
    backgroundColor: "rgba(217,119,6,0.16)",
    borderColor: "rgba(217,119,6,0.28)",
  },
  regionChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  regionChipTextActive: {
    color: "#9A3412",
  },
  sectionWrap: {
    marginBottom: 8,
  },
  moreFeaturedBtn: {
    marginTop: 2,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(217,119,6,0.10)",
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.20)",
  },
  moreFeaturedBtnText: {
    fontSize: 11,
    color: "#9A3412",
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  featuredSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionCountPill: {
    minWidth: 26,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(217,119,6,0.16)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  sectionCountPillText: {
    fontSize: 11,
    color: "#9A3412",
    fontWeight: "700",
  },
  normalSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  emptyStateWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    marginTop: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyStateDesc: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyStateButton: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(217,119,6,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.22)",
  },
  emptyStateButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A3412",
  },
  bottomBarShadowWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  bottomBarText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  bottomBarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  bottomBarButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  addSiteButtonDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.65,
  },
});
