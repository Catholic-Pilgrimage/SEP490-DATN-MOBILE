import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../../../../constants/theme.constants";
import { SiteNearbyPlace } from "../../../../../types/pilgrim";

interface NearbyPlacesModalProps {
  visible: boolean;
  onClose: () => void;
  t: (key: string, options?: any) => string;
  styles: any;
  nearbySiteName: string;
  nearbyCategory: "all" | "food" | "lodging" | "medical";
  setNearbyCategory: (v: "all" | "food" | "lodging" | "medical") => void;
  loadingNearby: boolean;
  nearbyPlaces: SiteNearbyPlace[];
  savedNearbyPlaceIds: Set<string>;
  savingNearbyPlaceId: string | null;
  handleSaveNearbyPlace: (place: SiteNearbyPlace) => void;
}

export default function NearbyPlacesModal({
  visible,
  onClose,
  t,
  styles,
  nearbySiteName,
  nearbyCategory,
  setNearbyCategory,
  loadingNearby,
  nearbyPlaces,
  savedNearbyPlaceIds,
  savingNearbyPlaceId,
  handleSaveNearbyPlace,
}: NearbyPlacesModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {t("planner.nearbyLocations")} - {nearbySiteName}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>{t("planner.close")}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.tabContainer, { paddingHorizontal: 16 }]}>
          {(["all", "food", "lodging", "medical"] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.tabButton,
                nearbyCategory === cat && styles.activeTabButton,
              ]}
              onPress={() => setNearbyCategory(cat)}
            >
              <Text
                style={[
                  styles.tabText,
                  nearbyCategory === cat && styles.activeTabText,
                ]}
              >
                {cat === "all"
                  ? "Tất cả"
                  : cat === "food"
                    ? "🍜 Ăn uống"
                    : cat === "lodging"
                      ? "🏨 Lưu trú"
                      : "🏥 Y tế"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loadingNearby ? (
          <ActivityIndicator
            size="large"
            color={COLORS.accent}
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={
              nearbyCategory === "all"
                ? nearbyPlaces
                : nearbyPlaces.filter((p) => p.category === nearbyCategory)
            }
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="location-outline"
                  size={48}
                  color={COLORS.textTertiary}
                />
                <Text style={styles.emptyStateText}>
                  {t("planner.noNearbyLocations")}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.nearbyPlaceCard}>
                <View style={styles.nearbyPlaceCategoryBadge}>
                  <Text style={styles.nearbyPlaceCategoryText}>
                    {item.category === "food"
                      ? "🍜"
                      : item.category === "lodging"
                        ? "🏨"
                        : "🏥"}
                  </Text>
                </View>
                <View style={styles.nearbyPlaceContent}>
                  <Text style={styles.nearbyPlaceName}>{item.name}</Text>
                  {item.address ? (
                    <Text style={styles.nearbyPlaceAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                    {item.distance_meters ? (
                      <Text style={styles.nearbyPlaceMeta}>
                        📍{" "}
                        {item.distance_meters >= 1000
                          ? `${(item.distance_meters / 1000).toFixed(1)} km`
                          : `${item.distance_meters} m`}
                      </Text>
                    ) : null}
                    {item.phone ? (
                      <Text style={styles.nearbyPlaceMeta}>📞 {item.phone}</Text>
                    ) : null}
                  </View>
                  {item.description ? (
                    <Text style={styles.nearbyPlaceDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={[
                      styles.nearbyPlaceSelectBtn,
                      savedNearbyPlaceIds.has(item.id) && {
                        backgroundColor: "#4CAF50",
                      },
                    ]}
                    onPress={() => handleSaveNearbyPlace(item)}
                    disabled={
                      savingNearbyPlaceId === item.id ||
                      savedNearbyPlaceIds.has(item.id)
                    }
                  >
                    {savingNearbyPlaceId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : savedNearbyPlaceIds.has(item.id) ? (
                      <>
                        <Ionicons name="checkmark-circle" size={14} color="#fff" />
                        <Text style={styles.nearbyPlaceSelectBtnText}>Đã lưu</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="bookmark-outline" size={14} color="#fff" />
                        <Text style={styles.nearbyPlaceSelectBtnText}>
                          Lưu vào lịch trình
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

