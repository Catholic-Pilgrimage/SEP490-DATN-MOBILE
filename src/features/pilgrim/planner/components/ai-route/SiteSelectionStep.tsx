import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../../../../constants/theme.constants";
import { useQuery as useApiQuery } from "../../../../../hooks/useApi";
import { getFavorites, getSites, searchSites } from "../../../../../services/api/pilgrim/siteApi";
import { styles } from "./SiteSelectionStep.styles";

interface SiteInfo {
  id: string;
  name: string;
  address: string;
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
  type?: string;
  patronSaint?: string;
}

interface SiteSelectionStepProps {
  selectedSites: SiteInfo[];
  onSiteAdd: (site: SiteInfo) => void;
  onSiteRemove: (siteId: string) => void;
}

export const SiteSelectionStep = ({
  selectedSites,
  onSiteAdd,
  onSiteRemove,
}: SiteSelectionStepProps) => {
  const { t } = useTranslation();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [allSites, setAllSites] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [regionFilter, setRegionFilter] = useState<"all" | "north" | "central" | "south">("all");

  const { isLoading: loadingFavorites, execute: fetchFavorites } = useApiQuery(
    () => getFavorites({ page: 1, limit: 100 }),
    {
      autoFetch: false,
      onSuccess: (res: any) => {
        console.log('getFavorites response:', res);
        if (res.success && res.data?.sites) {
          setFavorites(res.data.sites);
        } else if (Array.isArray(res.data)) {
          setFavorites(res.data);
        } else {
          console.log('Unexpected getFavorites response structure:', res);
        }
      },
      onError: (error) => {
        console.log('getFavorites error:', error);
      },
    }
  );

  const { isLoading: loadingAllSites, execute: fetchAllSites } = useApiQuery(
    () => getSites({ page: 1, limit: 100 }),
    {
      autoFetch: false,
      onSuccess: (res: any) => {
        console.log('getSites response:', res);
        if (res && res.success && res.data) {
          const rawData = (res.data as any).data || (res.data as any).items || [];
          setAllSites(rawData);
        } else {
          console.log('Unexpected getSites response structure:', res);
        }
      },
      onError: (error) => {
        console.log('getSites error:', error);
      },
    }
  );

  const { isLoading: loadingSearch, execute: executeSearch } = useApiQuery(
    () => searchSites({ query: searchQuery, page: 1, limit: 20 }),
    {
      autoFetch: false,
      onSuccess: (res: any) => {
        console.log('searchSites response:', res);
        if (res.success && res.data?.items) {
          setSearchResults(res.data.items);
        } else if (Array.isArray(res.data)) {
          setSearchResults(res.data);
        } else {
          console.log('Unexpected searchSites response structure:', res);
        }
      },
      onError: (error) => {
        console.log('searchSites error:', error);
      },
    }
  );

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [fetchFavorites])
  );

  // Load all sites when modal opens
  React.useEffect(() => {
    if (showSearchModal && allSites.length === 0) {
      fetchAllSites();
    }
  }, [showSearchModal, allSites.length, fetchAllSites]);

  // Auto search when query changes
  React.useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        executeSearch();
      }, 500); // Debounce 500ms
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, executeSearch]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      executeSearch();
    }
  };

  const handleSelectSite = (site: any) => {
    const siteInfo: SiteInfo = {
      id: site.id,
      name: site.name,
      address: site.address || site.province || "",
      thumbnail: site.cover_image,
      latitude: site.latitude,
      longitude: site.longitude,
      type: site.type,
      patronSaint: site.patron_saint,
    };
    
    // Toggle selection instead of closing modal
    if (isSelected(site.id)) {
      onSiteRemove(site.id);
    } else {
      onSiteAdd(siteInfo);
    }
  };

  const isSelected = (siteId: string) => {
    return selectedSites.some((s) => s.id === siteId);
  };

  // Filter sites by region
  const filterSitesByRegion = (sites: any[]) => {
    if (regionFilter === "all") return sites;
    
    return sites.filter((site) => {
      const province = (site.province || site.address || "").toLowerCase();
      
      if (regionFilter === "north") {
        return (
          province.includes("hà nội") ||
          province.includes("hải phòng") ||
          province.includes("quảng ninh") ||
          province.includes("bắc") ||
          province.includes("thái nguyên") ||
          province.includes("lạng sơn") ||
          province.includes("cao bằng") ||
          province.includes("hà giang") ||
          province.includes("lào cai") ||
          province.includes("yên bái") ||
          province.includes("điện biên") ||
          province.includes("lai châu") ||
          province.includes("sơn la") ||
          province.includes("hòa bình") ||
          province.includes("phú thọ") ||
          province.includes("vĩnh phúc") ||
          province.includes("bắc giang") ||
          province.includes("bắc kạn") ||
          province.includes("tuyên quang") ||
          province.includes("hà nam") ||
          province.includes("nam định") ||
          province.includes("thái bình") ||
          province.includes("ninh bình") ||
          province.includes("hưng yên") ||
          province.includes("hải dương")
        );
      }
      
      if (regionFilter === "central") {
        return (
          province.includes("thanh hóa") ||
          province.includes("nghệ an") ||
          province.includes("hà tĩnh") ||
          province.includes("quảng bình") ||
          province.includes("quảng trị") ||
          province.includes("thừa thiên") ||
          province.includes("huế") ||
          province.includes("đà nẵng") ||
          province.includes("quảng nam") ||
          province.includes("quảng ngãi") ||
          province.includes("bình định") ||
          province.includes("phú yên") ||
          province.includes("khánh hòa") ||
          province.includes("ninh thuận") ||
          province.includes("bình thuận") ||
          province.includes("kon tum") ||
          province.includes("gia lai") ||
          province.includes("đắk lắk") ||
          province.includes("đắk nông") ||
          province.includes("lâm đồng")
        );
      }
      
      if (regionFilter === "south") {
        return (
          province.includes("sài gòn") ||
          province.includes("hồ chí minh") ||
          province.includes("tp.hcm") ||
          province.includes("đồng nai") ||
          province.includes("bình dương") ||
          province.includes("bà rịa") ||
          province.includes("vũng tàu") ||
          province.includes("tây ninh") ||
          province.includes("bình phước") ||
          province.includes("long an") ||
          province.includes("tiền giang") ||
          province.includes("bến tre") ||
          province.includes("trà vinh") ||
          province.includes("vĩnh long") ||
          province.includes("đồng tháp") ||
          province.includes("an giang") ||
          province.includes("kiên giang") ||
          province.includes("cần thơ") ||
          province.includes("hậu giang") ||
          province.includes("sóc trăng") ||
          province.includes("bạc liêu") ||
          province.includes("cà mau")
        );
      }
      
      return true;
    });
  };

  // Helper function to get type label for selected sites
  const getTypeLabel = (site: SiteInfo): string => {
    const raw = String(site.type ?? "").trim().toLowerCase();
    if (raw === "church") return "Nhà thờ";
    if (raw === "shrine") return "Thánh địa";
    if (raw === "monastery") return "Tu viện";
    if (raw === "center") return "Trung tâm";
    return "Hành hương";
  };

  const getDisplaySites = () => {
    const baseSites = searchQuery.trim().length > 0 ? searchResults : allSites;
    return filterSitesByRegion(baseSites);
  };

  return (
    <View style={styles.container}>
      {/* Selected Sites Count */}
      <View style={styles.countBadge}>
        <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
        <Text style={styles.countText}>
          {t("aiRoute.siteSelection.count", {
            count: selectedSites.length,
            max: 10,
            defaultValue: `${selectedSites.length}/10 địa điểm`,
          })}
        </Text>
      </View>

      {/* Selected Sites List */}
      {selectedSites.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.sectionTitle}>
            {t("aiRoute.siteSelection.selected", { defaultValue: "Địa điểm đã chọn" })}
          </Text>
          {selectedSites.map((site, index) => (
            <View key={site.id} style={styles.siteCard}>
              {/* Order Badge - positioned absolutely */}
              <View style={styles.siteOrderBadge}>
                <Text style={styles.siteOrderText}>{index + 1}</Text>
              </View>

              {/* Card Content */}
              <View style={styles.siteCardContent}>
                {/* Top Row: Image + Info */}
                <View style={styles.siteTopRow}>
                  <View style={styles.siteImageWrap}>
                    <Image
                      source={{
                        uri: site.thumbnail || "https://via.placeholder.com/60",
                      }}
                      style={styles.siteImage}
                    />
                  </View>

                  <View style={styles.siteInfo}>
                    <Text style={styles.siteName} numberOfLines={2}>
                      {site.name}
                    </Text>
                  </View>
                </View>

                {/* Tags Row */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.siteTagsRow}
                  style={styles.siteTagsScroller}
                >
                  {site.type && (
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {getTypeLabel(site)}
                      </Text>
                    </View>
                  )}
                  {site.patronSaint && (
                    <View style={styles.patronBadge}>
                      <Text style={styles.patronBadgeText} numberOfLines={1}>
                        Bổn mạng: {site.patronSaint}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Address Row */}
                <View style={styles.siteAddressRow}>
                  <Ionicons name="location" size={12} color="#DC2626" />
                  <Text style={styles.siteAddress} numberOfLines={1}>
                    {site.address}
                  </Text>
                </View>
              </View>

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onSiteRemove(site.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Site Buttons */}
      <View style={styles.addSection}>
        <Text style={styles.sectionTitle}>
          {t("aiRoute.siteSelection.addMore", { defaultValue: "Thêm địa điểm" })}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowSearchModal(true)}
          disabled={selectedSites.length >= 10}
        >
          <Ionicons name="search" size={20} color={COLORS.accent} />
          <Text style={styles.addButtonText}>
            {t("aiRoute.siteSelection.search", { defaultValue: "Tìm kiếm địa điểm" })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>
            {t("aiRoute.siteSelection.favorites", { defaultValue: "Địa điểm yêu thích" })}
          </Text>
          {loadingFavorites ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <FlatList
              data={favorites.filter((f) => !isSelected(f.id))}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.favoriteCard}
                  onPress={() => {
                    const siteInfo: SiteInfo = {
                      id: item.id,
                      name: item.name,
                      address: item.address || item.province || "",
                      thumbnail: item.cover_image,
                      latitude: item.latitude,
                      longitude: item.longitude,
                      type: item.type,
                      patronSaint: item.patron_saint,
                    };
                    onSiteAdd(siteInfo);
                  }}
                  disabled={selectedSites.length >= 10}
                >
                  <Image
                    source={{ uri: item.cover_image || "https://via.placeholder.com/150" }}
                    style={styles.favoriteImage}
                  />
                  <Text style={styles.favoriteName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.favoriteAddIcon}>
                    <Ionicons name="add-circle" size={24} color="#D4AF37" />
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowSearchModal(false);
              setSearchQuery("");
              setSearchResults([]);
            }}>
              <Ionicons name="close" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {t("aiRoute.siteSelection.searchTitle", { defaultValue: "Tìm địa điểm" })}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowSearchModal(false);
              setSearchQuery("");
              setSearchResults([]);
            }}>
              <Text style={{ color: "#D4AF37", fontSize: 16, fontWeight: "600" }}>
                {t("common.done", { defaultValue: "Xong" })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t("aiRoute.siteSelection.searchPlaceholder", {
                defaultValue: "Nhập tên địa điểm...",
              })}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Region Filter */}
          <View style={styles.regionFilterContainer}>
            <TouchableOpacity
              style={[styles.regionFilterButton, regionFilter === "all" && styles.regionFilterButtonActive]}
              onPress={() => setRegionFilter("all")}
            >
              <Text style={[styles.regionFilterText, regionFilter === "all" && styles.regionFilterTextActive]}>
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.regionFilterButton, regionFilter === "north" && styles.regionFilterButtonActive]}
              onPress={() => setRegionFilter("north")}
            >
              <Text style={[styles.regionFilterText, regionFilter === "north" && styles.regionFilterTextActive]}>
                Miền Bắc
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.regionFilterButton, regionFilter === "central" && styles.regionFilterButtonActive]}
              onPress={() => setRegionFilter("central")}
            >
              <Text style={[styles.regionFilterText, regionFilter === "central" && styles.regionFilterTextActive]}>
                Miền Trung
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.regionFilterButton, regionFilter === "south" && styles.regionFilterButtonActive]}
              onPress={() => setRegionFilter("south")}
            >
              <Text style={[styles.regionFilterText, regionFilter === "south" && styles.regionFilterTextActive]}>
                Miền Nam
              </Text>
            </TouchableOpacity>
          </View>

          {loadingSearch || loadingAllSites ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
          ) : (
            <FlatList
              data={getDisplaySites()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isItemSelected = isSelected(item.id);
                
                // Helper function to get type label
                const getTypeLabel = (site: any): string => {
                  const raw = String(site.type ?? "").trim().toLowerCase();
                  if (raw === "church") return "Nhà thờ";
                  if (raw === "shrine") return "Thánh địa";
                  if (raw === "monastery") return "Tu viện";
                  if (raw === "center") return "Trung tâm";
                  return "Hành hương";
                };

                return (
                  <View
                    style={[
                      styles.searchResultCard,
                      isItemSelected && styles.searchResultCardSelected,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.searchResultPressable}
                      onPress={() => handleSelectSite(item)}
                      disabled={!isItemSelected && selectedSites.length >= 10}
                      activeOpacity={0.7}
                    >
                      <View style={styles.searchResultTopRow}>
                        <View style={styles.searchResultImageWrap}>
                          <Image
                            source={{ uri: item.cover_image || "https://via.placeholder.com/60" }}
                            style={styles.searchResultImage}
                          />
                        </View>

                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName} numberOfLines={2}>
                            {item.name}
                          </Text>
                        </View>
                      </View>

                      {/* Tags Row */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.searchResultTagsRow}
                        style={styles.searchResultTagsScroller}
                      >
                        <View style={styles.searchResultTypeBadge}>
                          <Text style={styles.searchResultTypeBadgeText}>
                            {getTypeLabel(item)}
                          </Text>
                        </View>
                        {item.patron_saint && (
                          <View style={styles.searchResultPatronBadge}>
                            <Text style={styles.searchResultPatronBadgeText} numberOfLines={1}>
                              Bổn mạng: {item.patron_saint}
                            </Text>
                          </View>
                        )}
                      </ScrollView>

                      <View style={styles.searchResultAddressRow}>
                        <Ionicons name="location" size={12} color="#DC2626" />
                        <Text style={styles.searchResultAddress} numberOfLines={1}>
                          {item.address || item.province}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.searchResultActionButton}
                      onPress={() => handleSelectSite(item)}
                      disabled={!isItemSelected && selectedSites.length >= 10}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {isItemSelected ? (
                        <Ionicons name="checkmark-circle" size={24} color="#D4AF37" />
                      ) : (
                        <Ionicons name="add-circle" size={24} color="#D4AF37" />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color={COLORS.textTertiary} style={{ opacity: 0.3 }} />
                  <Text style={styles.emptyText}>
                    {searchQuery.length > 0
                      ? t("aiRoute.siteSelection.noResults", {
                          defaultValue: "Không tìm thấy địa điểm",
                        })
                      : t("aiRoute.siteSelection.noSites", {
                          defaultValue: "Chưa có địa điểm nào",
                        })}
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};
