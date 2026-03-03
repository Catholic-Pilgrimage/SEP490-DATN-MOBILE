import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useSites } from "../../../../hooks/useSites";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import locationService from "../../../../services/location/locationService";
import vietmapService from "../../../../services/map/vietmapService";
import { SiteSummary } from "../../../../types/pilgrim";
import { PlanEntity, PlanItem, PlanParticipant, UpdatePlanItemRequest } from "../../../../types/pilgrim/planner.types";

const PlanDetailScreen = ({ route, navigation }: any) => {
  const { planId } = route.params;
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<PlanEntity | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Item State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const { sites, isLoading: isLoadingSites, fetchSites } = useSites();
  const [favorites, setFavorites] = useState<SiteSummary[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [addingItem, setAddingItem] = useState(false);

  // Time input state for all sites
  const [showTimeInputModal, setShowTimeInputModal] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [estimatedTime, setEstimatedTime] = useState("10:00"); // HH:MM format
  const [restDuration, setRestDuration] = useState(120); // Minutes as number
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<string>("");
  const [note, setNote] = useState("");

  // Share/Participants state
  const [showShareModal, setShowShareModal] = useState(false);
  const [participants, setParticipants] = useState<PlanParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);

  // Edit Item State
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [editEstimatedTime, setEditEstimatedTime] = useState("10:00");
  const [editRestDuration, setEditRestDuration] = useState(120);
  const [editNote, setEditNote] = useState("");
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [editTempTime, setEditTempTime] = useState(new Date());
  const [savingEdit, setSavingEdit] = useState(false);

  // Check-in state
  const [checkingInItemId, setCheckingInItemId] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
  }, [planId]);

  useEffect(() => {
    if (isAddModalVisible) {
      if (activeTab === "all") {
        fetchSites({ limit: 20 });
      } else {
        fetchFavorites();
      }
    }
  }, [isAddModalVisible, activeTab]);

  const fetchFavorites = async () => {
    try {
      setIsLoadingFavorites(true);
      const response = await pilgrimSiteApi.getFavorites({ limit: 50 }); // Fetch more for selection
      if (response.success && response.data?.sites) {
        // Map FavoriteSite (snake_case) to SiteSummary (camelCase) for consistency
        const mappedFavorites: SiteSummary[] = response.data.sites.map(
          (site) => ({
            id: site.id,
            name: site.name,
            address: site.address,
            coverImage: site.cover_image,
            rating: 0, // Not in FavoriteSite, default
            reviewCount: 0, // Not in FavoriteSite, default
            isFavorite: true,
            type: site.type,
            region: site.region,
          }),
        );
        setFavorites(mappedFavorites);
      }
    } catch (error) {
      console.error("Fetch favorites error:", error);
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const loadPlan = async () => {
    try {
      setLoading(true);
      const response = await pilgrimPlannerApi.getPlanDetail(planId);
      if (response.success && response.data) {
        setPlan(response.data);
      } else {
        Alert.alert("Error", response.message || "Could not load plan details");
      }
    } catch (error) {
      console.error("Load plan detail error:", error);
      Alert.alert("Error", "Failed to load plan details");
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const response = await pilgrimPlannerApi.getParticipants(planId);
      if (response.success && response.data) {
        setParticipants(response.data);
      }
    } catch (error: any) {
      // Silently handle 404 - participants feature might not be implemented yet
      if (error?.message?.includes("Không tìm thấy")) {
        setParticipants([]);
        // Log as info instead of error
        console.log("Participants endpoint not available, using plan owner only");
      } else {
        // Log other errors
        console.error("Load participants error:", error);
      }
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleInviteParticipant = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    try {
      setInviting(true);
      const response = await pilgrimPlannerApi.inviteParticipant(planId, {
        userId: inviteEmail, // Backend expects userId, but we'll send email
        role: inviteRole,
      });

      if (response.success) {
        Alert.alert("Success", "Invitation sent successfully");
        setInviteEmail("");
        loadParticipants();
      } else {
        Alert.alert("Error", response.message || "Failed to send invitation");
      }
    } catch (error: any) {
      console.error("Invite participant error:", error);
      Alert.alert("Error", error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleOpenShareModal = () => {
    setShowShareModal(true);
    loadParticipants();
  };

  const handleDeletePlan = () => {
    Alert.alert(
      "Delete Plan",
      "Are you sure you want to delete this plan? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await pilgrimPlannerApi.deletePlan(planId);
              if (response.success) {
                navigation.goBack();
              } else {
                Alert.alert(
                  "Error",
                  response.message || "Failed to delete plan",
                );
              }
            } catch (error) {
              console.error("Delete plan error:", error);
              Alert.alert("Error", "Failed to delete plan");
            }
          },
        },
      ],
    );
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this destination?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // Optimistic update could be done here, but reloading is safer for sync
              const response = await pilgrimPlannerApi.deletePlanItem(
                planId,
                itemId,
              );
              if (response.success) {
                loadPlan(); // Reload to refresh
              } else {
                Alert.alert(
                  "Error",
                  response.message || "Failed to remove item",
                );
              }
            } catch (error: any) {
              console.error("Delete item error:", error);
              Alert.alert("Error", error.message || "Failed to remove item");
            }
          },
        },
      ],
    );
  };

  const handleOpenEditItem = (item: PlanItem) => {
    setEditingItem(item);
    // Parse existing estimated_time
    const timeVal = typeof item.estimated_time === "string" ? item.estimated_time : "10:00";
    setEditEstimatedTime(timeVal.length >= 5 ? timeVal.substring(0, 5) : timeVal);
    // Parse rest_duration to minutes
    const durStr = formatTimeValue(item.rest_duration);
    let minutes = 120;
    const hourMatch = durStr.match(/(\d+)\s*gi[oờ]/);
    const minMatch = durStr.match(/(\d+)\s*ph[uút]/);
    if (hourMatch) minutes = parseInt(hourMatch[1]) * 60;
    if (minMatch) minutes += parseInt(minMatch[1]);
    if (!hourMatch && !minMatch) {
      const rawMatch = durStr.match(/(\d+)/);
      if (rawMatch) minutes = parseInt(rawMatch[1]);
    }
    setEditRestDuration(Math.max(60, Math.min(240, minutes)));
    setEditNote(item.note || "");
    setShowEditItemModal(true);
  };

  const handleEditTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEditTimePicker(false);
    if (selectedDate) {
      const h = selectedDate.getHours().toString().padStart(2, "0");
      const m = selectedDate.getMinutes().toString().padStart(2, "0");
      setEditEstimatedTime(`${h}:${m}`);
      if (Platform.OS === "ios") setShowEditTimePicker(false);
    }
  };

  const openEditTimePicker = () => {
    const [h, m] = editEstimatedTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 10);
    d.setMinutes(m || 0);
    setEditTempTime(d);
    setShowEditTimePicker(true);
  };

  const buildDurationString = (totalMinutes: number): string => {
    const dh = Math.floor(totalMinutes / 60);
    const dm = totalMinutes % 60;
    if (dh > 0 && dm > 0) return `${dh} ${dh === 1 ? "hour" : "hours"} ${dm} ${dm === 1 ? "minute" : "minutes"}`;
    if (dh > 0) return `${dh} ${dh === 1 ? "hour" : "hours"}`;
    return `${totalMinutes} ${totalMinutes === 1 ? "minute" : "minutes"}`;
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;
    try {
      setSavingEdit(true);
      const payload: UpdatePlanItemRequest = {
        estimated_time: editEstimatedTime,
        rest_duration: buildDurationString(editRestDuration),
        note: editNote.trim() || undefined,
      };
      const response = await pilgrimPlannerApi.updatePlanItem(planId, editingItem.id, payload);
      if (response.success) {
        setShowEditItemModal(false);
        setEditingItem(null);
        loadPlan();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể cập nhật địa điểm");
      }
    } catch (error: any) {
      console.error("Update item error:", error);
      Alert.alert("Lỗi", error.message || "Không thể cập nhật địa điểm");
    } finally {
      setSavingEdit(false);
    }
  };

  const openAddModal = (day: number) => {
    setSelectedDay(day);
    setIsAddModalVisible(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setEstimatedTime(`${hours}:${minutes}`);
      if (Platform.OS === "ios") {
        setShowTimePicker(false);
      }
    }
  };

  const openTimePicker = () => {
    // Parse current estimatedTime to set initial time
    const [hours, minutes] = estimatedTime.split(":").map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    setTempTime(date);
    setShowTimePicker(true);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours} giờ ${remainingMinutes} phút`;
    } else if (hours > 0) {
      return `${hours} giờ`;
    } else {
      return `${minutes} phút`;
    }
  };

  // Format time/duration values to ensure they're strings
  const formatTimeValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value.hours !== undefined) {
      // Handle object format like {hours: 2, minutes: 30}
      const hours = value.hours || 0;
      const minutes = value.minutes || 0;
      if (hours > 0 && minutes > 0) {
        return `${hours} giờ ${minutes} phút`;
      } else if (hours > 0) {
        return `${hours} giờ`;
      } else if (minutes > 0) {
        return `${minutes} phút`;
      }
    }
    return String(value);
  };

  const handleAddItem = async (siteId: string) => {
    setSelectedSiteId(siteId);
    setCalculatingRoute(true);
    setRouteInfo("");

    // Check if there are previous sites in the day
    const itemsForDay = plan?.items_by_day?.[selectedDay.toString()] || [];

    if (itemsForDay.length > 0) {
      try {
        // Get the last site's ID
        const lastItem = itemsForDay[itemsForDay.length - 1];
        const lastSiteId = lastItem.site_id || lastItem.site?.id;

        // Fetch both site details to get accurate coordinates
        const [lastSiteDetail, newSiteDetail] = await Promise.all([
          lastSiteId ? pilgrimSiteApi.getSiteDetail(lastSiteId) : null,
          pilgrimSiteApi.getSiteDetail(siteId),
        ]);

        const lastSite = lastSiteDetail?.data;
        const newSite = newSiteDetail?.data;

        // If both sites have coordinates, calculate route
        if (
          lastSite?.latitude &&
          lastSite?.longitude &&
          newSite?.latitude &&
          newSite?.longitude
        ) {
          const routeResult = await vietmapService.calculateRoute(
            {
              latitude: lastSite.latitude,
              longitude: lastSite.longitude,
            },
            {
              latitude: newSite.latitude,
              longitude: newSite.longitude,
            },
          );

          // Calculate arrival time based on last site's departure time or estimated time
          const lastSiteTime = lastItem.departure_time || lastItem.arrival_time || "10:00";
          const arrivalTime = vietmapService.calculateArrivalTime(
            lastSiteTime,
            routeResult.durationMinutes,
          );

          setEstimatedTime(arrivalTime);
          setRouteInfo(
            `Khoảng cách: ${routeResult.distanceKm.toFixed(1)} km • Thời gian di chuyển: ${routeResult.durationText}`,
          );
        } else {
          // No coordinates available, use default
          setEstimatedTime("10:00");
          setRouteInfo("Không có tọa độ để tính toán lộ trình");
        }
      } catch (error) {
        console.error("Route calculation failed:", error);
        // Fallback to default time
        setEstimatedTime("10:00");
        setRouteInfo("Không thể tính toán lộ trình");
      }
    } else {
      // First site of the day, use default
      setEstimatedTime("10:00");
      setRouteInfo("Địa điểm đầu tiên trong ngày");
    }

    setCalculatingRoute(false);
    setShowTimeInputModal(true);
  };

  const addItemToItinerary = async (siteId: string) => {
    try {
      setAddingItem(true);
      const payload: any = {
        site_id: siteId,
        day_number: selectedDay,
        note: note.trim() || "Visited",
        estimated_time: estimatedTime,
      };

      // Convert minutes to duration format with proper singular/plural
      const totalMinutes = restDuration;
      const durationHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      if (durationHours > 0 && remainingMinutes > 0) {
        const hourText = durationHours === 1 ? "hour" : "hours";
        const minuteText = remainingMinutes === 1 ? "minute" : "minutes";
        payload.rest_duration = `${durationHours} ${hourText} ${remainingMinutes} ${minuteText}`;
      } else if (durationHours > 0) {
        const hourText = durationHours === 1 ? "hour" : "hours";
        payload.rest_duration = `${durationHours} ${hourText}`;
      } else {
        const minuteText = totalMinutes === 1 ? "minute" : "minutes";
        payload.rest_duration = `${totalMinutes} ${minuteText}`;
      }

      const response = await pilgrimPlannerApi.addPlanItem(planId, payload);

      if (response.success) {
        setIsAddModalVisible(false);
        setShowTimeInputModal(false);
        setNote("");
        loadPlan();
      } else {
        Alert.alert("Error", response.message || "Failed to add item");
      }
    } catch (error: any) {
      console.error("Add item error:", error);
      Alert.alert("Error", error.message || "Failed to add item");
    } finally {
      setAddingItem(false);
    }
  };

  const handleCheckIn = async (itemId: string, siteName: string) => {
    Alert.alert(
      "Check-in",
      `Bạn có muốn check-in tại ${siteName}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Check-in",
          onPress: async () => {
            try {
              setCheckingInItemId(itemId);

              // Get current location
              const location = await locationService.getCurrentLocation();

              const response = await pilgrimPlannerApi.checkInPlanItem(itemId, {
                latitude: location.latitude,
                longitude: location.longitude,
              });

              if (response.success) {
                Alert.alert("Thành công", `Đã check-in tại ${siteName}!`);
                loadPlan(); // Reload to update UI
              } else {
                Alert.alert("Lỗi", response.message || "Không thể check-in");
              }
            } catch (error: any) {
              console.error("Check-in error:", error);
              if (error.message?.includes("Location") || error.message?.includes("Geolocation")) {
                Alert.alert(
                  "Lỗi vị trí",
                  "Không thể lấy vị trí của bạn. Vui lòng bật GPS và cho phép ứng dụng truy cập vị trí."
                );
              } else {
                Alert.alert("Lỗi", error.message || "Không thể check-in");
              }
            } finally {
              setCheckingInItemId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Plan not found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Sort days
  const sortedDays = plan.items_by_day
    ? Object.keys(plan.items_by_day).sort((a, b) => Number(a) - Number(b))
    : [];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header Image Background */}
      <View style={styles.headerImageContainer}>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1548625361-e88c60eb83fe",
          }} // Placeholder
          style={styles.headerImage}
        />
        <View style={styles.headerOverlay} />

        {/* Navbar */}
        <View style={[styles.navbar, { marginTop: insets.top }]}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.navActions}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleDeletePlan}
            >
              <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleOpenShareModal}
            >
              <Ionicons name="people-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton}>
              <Ionicons name="create-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title & Info */}
        <View style={styles.headerContent}>
          <View style={styles.badgeContainer}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{plan.status || "Planned"}</Text>
            </View>
            {plan.is_public && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              >
                <Ionicons
                  name="globe-outline"
                  size={12}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.statusText}>Public</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{plan.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.metaText}>
                {new Date(plan.start_date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.metaText}>{plan.number_of_days} Days</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons
                name="people-outline"
                size={16}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.metaText}>
                {plan.number_of_people} People
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Itinerary Section */}
        <Text style={styles.sectionTitle}>Itinerary</Text>

        {sortedDays.length > 0 ? (
          sortedDays.map((dayKey) => {
            const items = plan.items_by_day![dayKey];
            return (
              <View key={dayKey} style={styles.dayContainer}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayNumberContainer}>
                    <Text style={styles.dayNumber}>Day {dayKey}</Text>
                  </View>
                  <View style={styles.dayLine} />
                </View>

                <View style={styles.timelineContainer}>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineItems}>
                    {items.map((item: PlanItem, index) => (
                      <TouchableOpacity
                        key={item.id || index}
                        style={styles.timelineItem}
                        onLongPress={() => handleDeleteItem(item.id)}
                        delayLongPress={500}
                      >
                        <View style={styles.timelineDot} />
                        <View style={styles.itemCard}>
                          <Image
                            source={{
                              uri:
                                item.site.cover_image ||
                                item.site.image ||
                                "https://via.placeholder.com/100",
                            }}
                            style={styles.itemImage}
                          />
                          <View style={styles.itemContent}>
                            <Text style={styles.itemName}>
                              {item.site.name}
                            </Text>
                            {item.site.address && (
                              <Text
                                style={styles.itemAddress}
                                numberOfLines={1}
                              >
                                {item.site.address}
                              </Text>
                            )}
                            <View style={styles.itemFooter}>
                              {(item.estimated_time || item.arrival_time) && (
                                <View style={styles.itemTimeInfo}>
                                  <Ionicons
                                    name="time-outline"
                                    size={14}
                                    color={COLORS.accent}
                                  />
                                  <Text style={styles.itemTime}>
                                    {formatTimeValue(item.estimated_time || item.arrival_time)}
                                  </Text>
                                </View>
                              )}
                              {item.rest_duration && (
                                <View style={styles.itemTimeInfo}>
                                  <Ionicons
                                    name="hourglass-outline"
                                    size={14}
                                    color={COLORS.accent}
                                  />
                                  <Text style={styles.itemTime}>
                                    {formatTimeValue(item.rest_duration)}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {item.note && (
                              <Text style={styles.itemNote} numberOfLines={1}>
                                {item.note}
                              </Text>
                            )}
                          </View>
                          <View style={styles.itemActions}>
                            <TouchableOpacity
                              onPress={() => handleCheckIn(item.id, item.site.name)}
                              style={styles.checkInButton}
                              disabled={checkingInItemId === item.id}
                            >
                              {checkingInItemId === item.id ? (
                                <ActivityIndicator size="small" color={COLORS.accent} />
                              ) : (
                                <Ionicons
                                  name="checkmark-circle-outline"
                                  size={20}
                                  color={COLORS.accent}
                                />
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleOpenEditItem(item)}
                              style={{ padding: 4 }}
                            >
                              <Ionicons
                                name="create-outline"
                                size={18}
                                color={COLORS.primary}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteItem(item.id)}
                              style={{ padding: 4 }}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color={COLORS.textTertiary}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.addSmallButton}
                      onPress={() => openAddModal(Number(dayKey))}
                    >
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                      <Text style={styles.addSmallButtonText}>Add Stop</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="edit-road"
              size={48}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyStateText}>
              No items added to this plan yet.
            </Text>
            <TouchableOpacity
              style={styles.addItemsButton}
              onPress={() => openAddModal(1)}
            >
              <Text style={styles.addItemsButtonText}>
                Add Destination to Day 1
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Add Next Day Button */}
        {sortedDays.length > 0 && plan.number_of_days && sortedDays.length < plan.number_of_days && (
          <TouchableOpacity
            style={styles.addNextDayButton}
            onPress={() => openAddModal(sortedDays.length + 1)}
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
            <Text style={styles.addNextDayButtonText}>
              Thêm địa điểm cho Ngày {sortedDays.length + 1}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Site Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Destination</Text>
            <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "all" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("all")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "all" && styles.activeTabText,
                ]}
              >
                All Sites
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "favorites" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("favorites")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "favorites" && styles.activeTabText,
                ]}
              >
                My Favorites
              </Text>
            </TouchableOpacity>
          </View>

          {isLoadingSites || isLoadingFavorites ? (
            <ActivityIndicator
              size="large"
              color={COLORS.accent}
              style={{ marginTop: 20 }}
            />
          ) : (
            <FlatList
              data={activeTab === "all" ? sites : favorites}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.siteItem}
                  onPress={() => handleAddItem(item.id)}
                  disabled={addingItem}
                >
                  <Image
                    source={{
                      uri: item.coverImage || "https://via.placeholder.com/60",
                    }}
                    style={styles.siteItemImage}
                  />
                  <View style={styles.siteItemContent}>
                    <Text style={styles.siteItemName}>{item.name}</Text>
                    <Text style={styles.siteItemAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                  <Ionicons
                    name="add-circle-outline"
                    size={24}
                    color={COLORS.accent}
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Time Input Modal */}
      <Modal
        visible={showTimeInputModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTimeInputModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thiết lập thời gian</Text>
            <TouchableOpacity onPress={() => setShowTimeInputModal(false)}>
              <Text style={styles.modalClose}>Hủy</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.timeInputLabel}>
              Thêm địa điểm - Ngày {selectedDay}
            </Text>
            <Text style={styles.timeInputDescription}>
              Vui lòng chọn giờ dự kiến và thời gian nghỉ (tối thiểu 1 giờ).
            </Text>

            {/* Route Calculation Info */}
            {calculatingRoute ? (
              <View style={styles.routeInfoContainer}>
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
                <Text style={styles.routeInfoText}>Đang tính toán lộ trình...</Text>
              </View>
            ) : routeInfo ? (
              <View style={styles.routeInfoContainer}>
                <Ionicons name="car-outline" size={20} color={COLORS.textPrimary} />
                <Text style={styles.routeInfoText}>{routeInfo}</Text>
              </View>
            ) : null}

            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputFieldLabel}>Giờ dự kiến</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={openTimePicker}
              >
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={COLORS.primary}
                />
                <Text style={styles.timePickerButtonText}>{estimatedTime}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputFieldLabel}>Thời gian nghỉ</Text>
              <Text style={styles.durationValueText}>
                {formatDuration(restDuration)}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={60}
                maximumValue={240}
                step={15}
                value={restDuration}
                onValueChange={setRestDuration}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.accent}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>1 giờ</Text>
                <Text style={styles.sliderLabelText}>4 giờ</Text>
              </View>
            </View>

            <View style={styles.noteInputContainer}>
              <Text style={styles.timeInputFieldLabel}>Ghi chú (không bắt buộc)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Nhập ghi chú cho địa điểm này..."
                placeholderTextColor={COLORS.textTertiary}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => addItemToItinerary(selectedSiteId)}
              disabled={addingItem}
            >
              {addingItem ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Thêm vào lịch trình
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        visible={showEditItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditItemModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chỉnh sửa địa điểm</Text>
            <TouchableOpacity onPress={() => setShowEditItemModal(false)}>
              <Text style={styles.modalClose}>Hủy</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {editingItem && (
              <Text style={[styles.timeInputLabel, { marginBottom: 16 }]}>
                {editingItem.site.name}
              </Text>
            )}

            {/* Estimated Time */}
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputFieldLabel}>Giờ dự kiến</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={openEditTimePicker}
              >
                <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                <Text style={styles.timePickerButtonText}>{editEstimatedTime}</Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Rest Duration */}
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputFieldLabel}>Thời gian nghỉ</Text>
              <Text style={styles.durationValueText}>{formatDuration(editRestDuration)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={60}
                maximumValue={240}
                step={15}
                value={editRestDuration}
                onValueChange={setEditRestDuration}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.accent}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>1 giờ</Text>
                <Text style={styles.sliderLabelText}>4 giờ</Text>
              </View>
            </View>

            {/* Note */}
            <View style={styles.noteInputContainer}>
              <Text style={styles.timeInputFieldLabel}>Ghi chú</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Nhập ghi chú..."
                placeholderTextColor={COLORS.textTertiary}
                value={editNote}
                onChangeText={setEditNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleSaveEditItem}
              disabled={savingEdit}
            >
              {savingEdit ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text style={styles.confirmButtonText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Time Picker */}
      {showEditTimePicker && (
        <DateTimePicker
          value={editTempTime}
          mode="time"
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleEditTimeChange}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
        />
      )}

      {/* Share/Participants Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chia sẻ kế hoạch</Text>
            <TouchableOpacity onPress={() => setShowShareModal(false)}>
              <Text style={styles.modalClose}>Đóng</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Invite Section */}
            <View style={styles.inviteSection}>
              <Text style={styles.shareSectionTitle}>Thêm thành viên</Text>
              <TextInput
                style={styles.emailInput}
                placeholder="Nhập email hoặc ID người dùng"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Role Selection */}
              <View style={styles.roleSelection}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    inviteRole === "viewer" && styles.roleButtonActive,
                  ]}
                  onPress={() => setInviteRole("viewer")}
                >
                  <Ionicons
                    name="eye-outline"
                    size={20}
                    color={inviteRole === "viewer" ? "#fff" : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      inviteRole === "viewer" && styles.roleButtonTextActive,
                    ]}
                  >
                    Xem
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    inviteRole === "editor" && styles.roleButtonActive,
                  ]}
                  onPress={() => setInviteRole("editor")}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={inviteRole === "editor" ? "#fff" : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      inviteRole === "editor" && styles.roleButtonTextActive,
                    ]}
                  >
                    Chỉnh sửa
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleInviteParticipant}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={20} color="#fff" />
                    <Text style={styles.inviteButtonText}>Gửi lời mời</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Participants List */}
            <View style={styles.participantsSection}>
              <Text style={styles.shareSectionTitle}>Thành viên ({participants.length + (plan?.owner ? 1 : 0)})</Text>

              {loadingParticipants ? (
                <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
              ) : (
                <>
                  {/* Show plan owner first */}
                  {plan?.owner && (
                    <View style={styles.participantItem}>
                      <View style={styles.participantAvatar}>
                        {plan.owner.avatar_url ? (
                          <Image
                            source={{ uri: plan.owner.avatar_url }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <Ionicons name="person" size={24} color={COLORS.textSecondary} />
                        )}
                      </View>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>{plan.owner.full_name}</Text>
                        <Text style={styles.participantRole}>Chủ sở hữu</Text>
                      </View>
                      <View style={styles.ownerBadge}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                      </View>
                    </View>
                  )}

                  {/* Show other participants */}
                  {participants.length === 0 ? (
                    <Text style={styles.emptyParticipantsText}>
                      Chưa có thành viên nào khác
                    </Text>
                  ) : (
                    participants.map((participant) => (
                      <View key={participant.id} style={styles.participantItem}>
                        <View style={styles.participantAvatar}>
                          {participant.userAvatar ? (
                            <Image
                              source={{ uri: participant.userAvatar }}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <Ionicons name="person" size={24} color={COLORS.textSecondary} />
                          )}
                        </View>
                        <View style={styles.participantInfo}>
                          <Text style={styles.participantName}>{participant.userName}</Text>
                          <Text style={styles.participantRole}>
                            {participant.role === "owner"
                              ? "Chủ sở hữu"
                              : participant.role === "editor"
                                ? "Chỉnh sửa"
                                : "Xem"}
                          </Text>
                        </View>
                        {participant.role === "owner" && (
                          <View style={styles.ownerBadge}>
                            <Ionicons name="star" size={16} color="#FFD700" />
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  headerImageContainer: {
    height: 300,
    width: "100%",
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  navbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    zIndex: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  navActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  headerContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.accent, // Yellow
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    fontFamily: TYPOGRAPHY.fontFamily.display,
    marginBottom: SPACING.sm,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: SPACING.md,
  },
  content: {
    flex: 1,
    marginTop: -20, // Overlap header
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  dayContainer: {
    marginBottom: SPACING.lg,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  dayNumberContainer: {
    backgroundColor: COLORS.primary, // Dark
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  dayNumber: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  timelineContainer: {
    paddingHorizontal: SPACING.lg,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 36, // Adjust based on layout
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.border,
  },
  timelineItems: {
    gap: SPACING.md,
    paddingLeft: 12, // Space for line
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    position: "absolute",
    left: -19, // Center on line
    zIndex: 1,
  },
  itemCard: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginLeft: 12,
    ...SHADOWS.small,
    alignItems: "center",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundSoft,
  },
  itemContent: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  itemAddress: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 4,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  itemTimeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.accentSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.primary,
  },
  itemNote: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontStyle: "italic",
    maxWidth: 100,
  },
  itemActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  checkInButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyStateText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  addItemsButton: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  addItemsButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  addSmallButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginLeft: 40,
    gap: 4,
  },
  addSmallButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  addNextDayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.accentSubtle,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
    gap: SPACING.sm,
  },
  addNextDayButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.accent,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 40, // Add padding to push content down
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: 16,
    color: COLORS.primary,
  },
  siteItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  siteItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSoft,
  },
  siteItemContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  siteItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  siteItemAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  timeInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  timeInputDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  routeInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.accentSubtle,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  routeInfoText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flex: 1,
  },
  timeInputContainer: {
    marginBottom: SPACING.md,
  },
  timeInputFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  timeInputHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
    fontStyle: "italic",
  },
  timePickerButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timePickerButtonText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    flex: 1,
    textAlign: "center",
    letterSpacing: 2,
  },
  durationValueText: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginVertical: SPACING.md,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noteInputContainer: {
    marginBottom: SPACING.md,
  },
  noteInput: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
    maxHeight: 120,
  },
  confirmButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.lg,
    ...SHADOWS.small,
  },
  confirmButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  // Share/Participants Modal Styles
  inviteSection: {
    marginBottom: SPACING.xl,
  },
  shareSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emailInput: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  roleSelection: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  roleButtonTextActive: {
    color: "#fff",
  },
  inviteButton: {
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  participantsSection: {
    marginTop: SPACING.md,
  },
  emptyParticipantsText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: SPACING.lg,
    fontStyle: "italic",
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  participantRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  ownerBadge: {
    padding: SPACING.xs,
  },
});

export default PlanDetailScreen;
