import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import Toast from "react-native-toast-message";
import { toastConfig } from "../../../../../config/toast.config";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
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
  onOpenSiteDetail,
  addingItem,
  alreadyAddedSiteIds,
  addedCount,
}: AddSiteModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const q = searchQuery.trim().toLowerCase();

  /** Padding đáy list để không bị floating bar che — tính trực tiếp tránh lỗi scope/Hermes với biến trung gian. */
  const bottomPad =
    110 + Math.max(typeof insets?.bottom === "number" ? insets.bottom : 0, 8);

  const matchesRegion = (site: SiteSummary) => {
    if (regionFilter === "all") return true;
    const r = String(site.region || "").toLowerCase();
    if (regionFilter === "north") return r.includes("bac") || r.includes("bắc");
    if (regionFilter === "central") return r.includes("trung");
    if (regionFilter === "south") return r.includes("nam");
    return true;
  };

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
  }, [q, sites, regionFilter]);

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
  }, [q, favorites, regionFilter]);

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
  }, [q, eventSitesList, regionFilter]);

  const featuredSites = useMemo(() => {
    const source = filteredSites;
    return source
      .filter((s) => {
        const n = String(s.name || "").toLowerCase();
        return (
          n.includes("la vang") ||
          n.includes("phú nhai") ||
          n.includes("phu nhai") ||
          n.includes("fatima") ||
          n.includes("bình triệu") ||
          n.includes("binh trieu")
        );
      })
      .slice(0, 5);
  }, [filteredSites]);

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
      church: "Nhà thờ",
      shrine: "Thánh địa",
      monastery: "Tu viện",
      center: "Trung tâm",
      other: "Địa điểm",
    };
    if (raw in byEnum) return byEnum[raw as SiteType];
    if (raw.includes("cathedral") || raw.includes("vương cung"))
      return "Thánh địa";
    if (raw.includes("parish") || raw.includes("giáo xứ")) return "Giáo xứ";
    return "Hành hương";
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

  const renderSiteRow = (item: SiteSummary, featured = false) => {
    const isAdded = alreadyAddedSiteIds.has(item.id);

    return (
      <View
        style={[
          sharedStyles.siteItem,
          localStyles.siteCard,
        ]}
      >
        <TouchableOpacity
          style={localStyles.siteMainPressable}
          activeOpacity={0.85}
          onPress={() => onOpenSiteDetail?.(item.id)}
          disabled={!onOpenSiteDetail}
        >
          <Image
            source={{
              uri: item.coverImage || "https://via.placeholder.com/60",
            }}
            style={sharedStyles.siteItemImage}
          />
          <View
            style={[
              sharedStyles.siteItemContent,
              localStyles.siteItemTextColumn,
            ]}
          >
            <View style={localStyles.siteTitleBlock}>
              <Text
                style={[sharedStyles.siteItemName, localStyles.siteTitle]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.name}
              </Text>
            </View>
            <View style={localStyles.siteTagsRow}>
              <View style={localStyles.typeBadge}>
                <Text style={localStyles.typeBadgeText}>
                  {getTypeLabel(item)}
                </Text>
              </View>
              {featured && (
                <View style={localStyles.featuredBadge}>
                  <Text style={localStyles.featuredBadgeText}>Nổi bật</Text>
                </View>
              )}
              {item.patronSaint && (
                <View style={[localStyles.typeBadge, { backgroundColor: 'rgba(30, 77, 107, 0.1)', borderColor: 'rgba(30, 77, 107, 0.2)' }]}>
                  <Text style={[localStyles.typeBadgeText, { color: '#1E4D6B' }]} numberOfLines={1}>
                    {t("planner.patronSaintShort", {
                      defaultValue: "Bổn mạng: {{name}}",
                      name: item.patronSaint,
                    })}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                sharedStyles.siteItemAddress,
                localStyles.siteAddressLine,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              📍 {getShortLocation(item.address)}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            localStyles.addSiteButton,
            isAdded && localStyles.addedSiteButton,
          ]}
          onPress={() => !isAdded && onAddSite?.(item.id)}
          disabled={addingItem || isAdded}
        >
          {addingItem && !isAdded ? (
            <ActivityIndicator size="small" color="#4B5563" />
          ) : isAdded ? (
            <Ionicons name="checkmark" size={20} color="#fff" />
          ) : (
            <Ionicons name="add" size={22} color="#4B5563" />
          )}
        </TouchableOpacity>
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
      <View style={sharedStyles.modalContainer}>
        <View style={sharedStyles.modalHeader}>
          <Text style={sharedStyles.modalTitle}>
            {t("planner.chooseLocation")}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={sharedStyles.modalClose}>{t("planner.close")}</Text>
          </TouchableOpacity>
        </View>

        <View style={sharedStyles.tabContainer}>
          <TouchableOpacity
            style={[
              sharedStyles.tabButton,
              activeTab === "all" && sharedStyles.activeTabButton,
            ]}
            onPress={() => setActiveTab("all")}
          >
            <Text
              style={[
                sharedStyles.tabText,
                activeTab === "all" && sharedStyles.activeTabText,
              ]}
            >
              {t("planner.allLocations")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              sharedStyles.tabButton,
              activeTab === "events" && sharedStyles.activeTabButton,
            ]}
            onPress={onOpenEventsTab}
          >
            <Text
              style={[
                sharedStyles.tabText,
                activeTab === "events" && sharedStyles.activeTabText,
              ]}
            >
              Sự kiện
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              sharedStyles.tabButton,
              activeTab === "favorites" && sharedStyles.activeTabButton,
            ]}
            onPress={() => setActiveTab("favorites")}
          >
            <Text
              style={[
                sharedStyles.tabText,
                activeTab === "favorites" && sharedStyles.activeTabText,
              ]}
            >
              {t("planner.myFavorites")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 999,
              backgroundColor: "#F3F4F6",
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 8,
            }}
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
        </View>
        <View style={localStyles.regionChipsRow}>
          {[
            { key: "all", label: "Tất cả" },
            { key: "north", label: "Miền Bắc" },
            { key: "central", label: "Miền Trung" },
            { key: "south", label: "Miền Nam" },
          ].map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={[
                localStyles.regionChip,
                regionFilter === chip.key && localStyles.regionChipActive,
              ]}
              onPress={() => setRegionFilter(chip.key as RegionFilter)}
            >
              <Text
                style={[
                  localStyles.regionChipText,
                  regionFilter === chip.key && localStyles.regionChipTextActive,
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>



        {isLoadingSites ||
        isLoadingFavorites ||
        (activeTab === "events" && isLoadingEventSites) ? (
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
                Hiện tại không có địa điểm nào có sự kiện diễn ra trong thời
                gian lịch trình của bạn.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredEventSites}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
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
                      Chọn để xem sự kiện
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
            data={activeTab === "all" ? filteredSites : filteredFavorites}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
            ListHeaderComponent={
              activeTab === "all" && featuredSites.length > 0 ? (
                <View style={{ marginBottom: 10 }}>
                  <Text style={localStyles.featuredSectionTitle}>
                    Gợi ý nổi tiếng
                  </Text>
                  {featuredSites.map((s) => (
                    <View key={`featured_${s.id}`}>
                      {renderSiteRow(s, true)}
                    </View>
                  ))}
                  <Text style={localStyles.normalSectionTitle}>
                    Tất cả địa điểm
                  </Text>
                </View>
              ) : null
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
              Đã thêm: {addedCount} địa điểm
            </Text>
            <TouchableOpacity
              style={localStyles.bottomBarButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={localStyles.bottomBarButtonText}>
                Xem lịch trình
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, elevation: 9999 }} pointerEvents="box-none">
        <Toast config={toastConfig} />
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  siteMainPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  siteCard: {
    marginBottom: 12,
    alignItems: "flex-start",
  },
  siteItemTextColumn: {
    flex: 1,
    minWidth: 0,
    marginRight: 0,
  },
  /** Cố định chiều cao 2 dòng — mọi thẻ cùng bậc, tên 1 dòng vẫn chừa khoảng trống dưới (đồng điều UI). */
  siteTitleBlock: {
    minHeight: 44,
    marginBottom: 6,
    justifyContent: "flex-start",
  },
  siteTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  siteTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  siteAddressLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(217,119,6,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.25)",
  },
  typeBadgeText: {
    fontSize: 10,
    color: "#B45309",
    fontWeight: "700",
  },
  featuredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(202,138,4,0.16)",
  },
  featuredBadgeText: {
    fontSize: 10,
    color: "#A16207",
    fontWeight: "700",
  },
  addSiteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    marginLeft: 8,
    marginTop: 2,
    borderWidth: 0,
  },
  addedSiteButton: {
    backgroundColor: COLORS.accent,
  },
  regionChipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  regionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  regionChipActive: {
    backgroundColor: "rgba(217,119,6,0.15)",
  },
  regionChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  regionChipTextActive: {
    color: "#B45309",
  },
  featuredSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  normalSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 8,
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
