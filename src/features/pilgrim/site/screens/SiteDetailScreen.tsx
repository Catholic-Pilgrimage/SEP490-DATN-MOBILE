import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { FullMapModal } from "../../../../components/map/FullMapModal";
import {
  MapPin,
  VietmapView,
  VietmapViewRef,
} from "../../../../components/map/VietmapView";
import { GuestLoginModal } from "../../../../components/ui/GuestLoginModal";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useFavorites } from "../../../../hooks/useFavorites";
import { useI18n } from "../../../../hooks/useI18n";
import {
  useSiteDetail,
  useSiteEvents,
  useSiteMassSchedules,
  useSiteMedia,
  useSiteNearbyPlaces,
  useSiteReviews,
} from "../../../../hooks/useSites";
import { pilgrimSiteApi } from "../../../../services/api/pilgrim";
import { DayOfWeek } from "../../../../types";
import { SiteReview } from "../../../../types/pilgrim";
import { getApiErrorMessage } from "../../../../utils/apiError";
import {
  AddToPlanModal,
  NearbyPlaceCard,
  QuickActionButton,
  SOSModal,
} from "../components";

// ============================================
// GRADIENT THEME FOR EVENT CARDS (Pilgrim side)
// ============================================

interface GradientTheme {
  colors: [string, string];
  icon: keyof typeof MaterialIcons.glyphMap;
}

const CATEGORY_GRADIENTS: Record<string, GradientTheme> = {
  "Lễ Trọng / Tuần Thánh":  { colors: ["#4A1942", "#B8860B"], icon: "church" },
  "Thánh Lễ Bí tích":       { colors: ["#4A1942", "#B8860B"], icon: "church" },
  "Rước kiệu / Cung nghinh":{ colors: ["#4A1942", "#B8860B"], icon: "church" },
  "Chầu lượt / Tuần chầu":  { colors: ["#4A1942", "#B8860B"], icon: "church" },
  "Lễ Bổn mạng":            { colors: ["#5D4037", "#E67E22"], icon: "groups" },
  "Hội chợ / Lễ hội":       { colors: ["#5D4037", "#E67E22"], icon: "groups" },
  "Văn nghệ / Thánh ca":    { colors: ["#5D4037", "#E67E22"], icon: "groups" },
  "Đại hội / Hội thao":     { colors: ["#5D4037", "#E67E22"], icon: "groups" },
  "Tĩnh tâm":               { colors: ["#1A535C", "#4ECDC4"], icon: "auto-stories" },
  "Sa mạc / Cắm trại":      { colors: ["#1A535C", "#4ECDC4"], icon: "auto-stories" },
  "Khóa học / Giáo lý":     { colors: ["#1A535C", "#4ECDC4"], icon: "auto-stories" },
  "Hành hương":              { colors: ["#6B2737", "#E88D97"], icon: "volunteer-activism" },
  "Bác ái / Từ thiện":       { colors: ["#6B2737", "#E88D97"], icon: "volunteer-activism" },
};

const DEFAULT_EVENT_GRADIENT: GradientTheme = { colors: ["#3D2000", "#C7A94E"], icon: "event" };

const getEventGradient = (description?: string): GradientTheme => {
  if (!description) return DEFAULT_EVENT_GRADIENT;
  const match = description.match(/^\[(.+?)\]/);
  if (match) return CATEGORY_GRADIENTS[match[1]] || DEFAULT_EVENT_GRADIENT;
  return DEFAULT_EVENT_GRADIENT;
};

const HERO_HEIGHT = Dimensions.get("window").height * 0.45;
const REVIEW_PREVIEW_LIMIT = 3;

const formatReviewDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getInitials = (name?: string) => {
  if (!name?.trim()) return "KG";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
};

const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const Q1 = lat1 * Math.PI / 180;
  const Q2 = lat2 * Math.PI / 180;
  const dQ = (lat2 - lat1) * Math.PI / 180;
  const dL = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dQ / 2) * Math.sin(dQ / 2) +
            Math.cos(Q1) * Math.cos(Q2) *
            Math.sin(dL / 2) * Math.sin(dL / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const normalizeReviewErrorMessage = (error: unknown, t: any) => {
  const message = getApiErrorMessage(
    error,
    t("siteDetail.reviewSaveError", { defaultValue: "Không thể lưu đánh giá lúc này." }),
  );

  if (/check in at this site before you can leave a review/i.test(message)) {
    return t("siteDetail.reviewCheckInRequired", { 
      defaultValue: "Bạn cần check-in tại địa điểm này trước khi để lại đánh giá." 
    });
  }

  return message;
};

export const SiteDetailScreen = ({ navigation, route }: any) => {
  const { siteId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isGuest } = useAuth();
  const { t } = useI18n();
  const { confirm, ConfirmModal } = useConfirm();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSOSModalVisible, setSOSModalVisible] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const [showAddToPlan, setShowAddToPlan] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [reviewKeyboardHeight, setReviewKeyboardHeight] = useState(0);
  const mapRef = useRef<VietmapViewRef>(null);

  // -- Fetch Data Hooks --
  const {
    site,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useSiteDetail(siteId, { autoFetch: true });

  // Centralized favorites
  const { isFavorite, toggleFavorite: toggleFav } = useFavorites();

  const {
    media,
    isLoading: isLoadingMedia,
    refetch: refetchMedia,
  } = useSiteMedia(siteId, {
    autoFetch: true,
    params: { limit: 10, type: "image" },
  });

  const {
    schedules,
    isLoading: isLoadingSchedules,
    refetch: refetchSchedules,
  } = useSiteMassSchedules(siteId, { autoFetch: true });

  const {
    events,
    isLoading: isLoadingEvents,
    refetch: refetchEvents,
  } = useSiteEvents(siteId, {
    autoFetch: true,
    params: { upcoming: "true", limit: 5 },
  });

  const {
    places,
    isLoading: isLoadingPlaces,
    refetch: refetchPlaces,
  } = useSiteNearbyPlaces(siteId, { autoFetch: true, params: { limit: 3 } });
  const {
    reviews,
    summary: reviewSummary,
    isLoading: isLoadingReviews,
    refetch: refetchReviews,
  } = useSiteReviews(siteId, {
    autoFetch: true,
    params: { limit: 50, sort: "newest" },
  });

  const isLoading =
    isLoadingDetail ||
    isLoadingMedia ||
    isLoadingSchedules ||
    isLoadingEvents ||
    isLoadingPlaces ||
    isLoadingReviews;

  const handleRefresh = () => {
    refetchDetail();
    refetchMedia();
    refetchSchedules();
    refetchEvents();
    refetchPlaces();
    refetchReviews();
  };

  const handleBack = () => navigation.goBack();
  const handleShare = () => {};
  const handleBookmark = () => {
    if (!isAuthenticated || isGuest) {
      setShowGuestLogin(true);
      return;
    }
    toggleFav(siteId);
  };
  const handleAddToPlan = () => {
    if (!isAuthenticated || isGuest) {
      setShowGuestLogin(true);
      return;
    }
    setShowAddToPlan(true);
  };

  const handleNavigateClick = () => {
    if (!site?.latitude || !site?.longitude) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${site.latitude},${site.longitude}`,
      android: `google.navigation:q=${site.latitude},${site.longitude}`
    });
    if (url) {
      Linking.openURL(url).catch(err => console.error("Error opening maps", err));
    }
  };

  const handleCallClick = () => {
    if (!site?.contactInfo?.phone) return;
    Linking.openURL(`tel:${site.contactInfo.phone}`).catch(err => console.error("Error opening phone", err));
  };

  // -- Data Processing --

  // Format mass schedules for display
  const formattedSchedules = useMemo(() => {
    if (!schedules || schedules.length === 0)
      return { sunday: undefined, others: [] };

    // Helper to format days
    const formatDays = (days: DayOfWeek[]) => {
      const sundayStr = t("siteDetail.sunday", { defaultValue: "Chúa Nhật" });
      const weekdaysStr = t("siteDetail.weekdays", { defaultValue: "Ngày thường" });
      const saturdayStr = t("siteDetail.saturday", { defaultValue: "Thứ Bảy" });
      const DAY_ABBR: Record<number, string> = {
        0: t("siteDetail.sunAbbr", { defaultValue: "CN" }),
        1: t("siteDetail.monAbbr", { defaultValue: "T2" }),
        2: t("siteDetail.tueAbbr", { defaultValue: "T3" }),
        3: t("siteDetail.wedAbbr", { defaultValue: "T4" }),
        4: t("siteDetail.thuAbbr", { defaultValue: "T5" }),
        5: t("siteDetail.friAbbr", { defaultValue: "T6" }),
        6: t("siteDetail.satAbbr", { defaultValue: "T7" }),
      };

      if (days.includes(0) && days.length === 1) return sundayStr;
      if (days.length === 6 && !days.includes(0)) return weekdaysStr;
      if (days.includes(6) && days.length === 1) return saturdayStr;

      return days.map((d) => DAY_ABBR[d]).join(", ");
    };

    // Group by days
    const grouped = new Map<string, string[]>();

    schedules.forEach((schedule) => {
      const daysKey = formatDays(schedule.days_of_week);
      const timeStr = schedule.time.substring(0, 5); // HH:MM
      const noteStr = schedule.note ? ` (${schedule.note})` : "";
      const fullTimeStr = `${timeStr}${noteStr}`;

      if (grouped.has(daysKey)) {
        grouped.get(daysKey)?.push(fullTimeStr);
      } else {
        grouped.set(daysKey, [fullTimeStr]);
      }
    });

    // Convert to array
    const result = Array.from(grouped.entries()).map(([day, times]) => ({
      day,
      times: times.sort(),
    }));

    const sundayStr = t("siteDetail.sunday", { defaultValue: "Chúa Nhật" });
    const sunAbbr = t("siteDetail.sunAbbr", { defaultValue: "CN" });

    return {
      sunday: result.find((s) => s.day === sundayStr || s.day === sunAbbr),
      others: result.filter((s) => s.day !== sundayStr && s.day !== sunAbbr),
    };
  }, [schedules, t]);

  // Combine site images and media gallery for hero section slider
  const heroImages = useMemo(() => {
    const images = site?.images || [];
    const mediaImages = media
      .filter((m) => m.type === "image")
      .map((m) => m.url);

    // Add cover image if exists
    const allImages = site?.coverImage
      ? [site.coverImage, ...images, ...mediaImages]
      : [...images, ...mediaImages];

    // Remove duplicates and limit to 5
    return [...new Set(allImages)].slice(0, 5);
  }, [site, media]);

  // Fallback if no images
  const displayImages =
    heroImages.length > 0
      ? heroImages
      : [
          "https://images.unsplash.com/photo-1548625361-e88c60eb83fe?q=80&w=1000&auto=format&fit=crop",
        ];

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates?.height || 0;
      setReviewKeyboardHeight(Math.max(height - insets.bottom, 0));
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setReviewKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const myReview = useMemo(
    () => reviews.find((review) => review.userId === user?.id),
    [reviews, user?.id],
  );
  const displayedReviews = useMemo(
    () => reviews.slice(0, REVIEW_PREVIEW_LIMIT),
    [reviews],
  );
  const averageRating =
    reviewSummary?.avgRating || site?.rating || 0;
  const totalReviews =
    reviewSummary?.totalReviews || site?.reviewCount || reviews.length;

  const openReviewModal = (review?: SiteReview) => {
    if (!isAuthenticated || isGuest) {
      setShowGuestLogin(true);
      return;
    }

    setReviewRating(review?.rating || myReview?.rating || 5);
    setReviewText(review?.feedback || review?.content || myReview?.feedback || myReview?.content || "");
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    if (isSavingReview || isDeletingReview) return;
    Keyboard.dismiss();
    setReviewKeyboardHeight(0);
    setShowReviewModal(false);
    setReviewRating(myReview?.rating || 5);
    setReviewText(myReview?.feedback || myReview?.content || "");
  };

  const showReviewToast = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    closeSheetFirst = false,
  ) => {
    if (closeSheetFirst) {
      Keyboard.dismiss();
      setReviewKeyboardHeight(0);
      setShowReviewModal(false);
    }

    const show = () =>
      Toast.show({
        type,
        text1: title,
        text2: message,
        topOffset: insets.top + 12,
        visibilityTime: 4200,
      });

    if (closeSheetFirst) {
      setTimeout(show, 150);
      return;
    }

    show();
  };

  const handleSubmitReview = async () => {
    const trimmed = reviewText.trim();
    if (!trimmed) {
      showReviewToast("info", t("common.info", { defaultValue: "Thông báo" }), t("siteDetail.reviewContentRequired", { defaultValue: "Vui lòng nhập nội dung đánh giá." }));
      return;
    }

    if (!siteId) return;

    try {
      setIsSavingReview(true);
      const payload = {
        rating: reviewRating,
        feedback: trimmed,
      };

      const response = myReview
        ? await pilgrimSiteApi.updateSiteReview(siteId, myReview.id, payload)
        : await pilgrimSiteApi.addReview(siteId, payload);

      setShowReviewModal(false);
      Keyboard.dismiss();
      setReviewKeyboardHeight(0);

      showReviewToast(
        "success",
        t("common.success", { defaultValue: "Thành công" }),
        response.message ||
          (myReview ? t("siteDetail.reviewUpdated", { defaultValue: "Đã cập nhật đánh giá của bạn." }) : t("siteDetail.reviewCreated", { defaultValue: "Đã gửi đánh giá của bạn." })),
        false,
      );

      await Promise.all([
        Promise.resolve(refetchReviews()),
        Promise.resolve(refetchDetail()),
      ]);
    } catch (error: any) {
      showReviewToast(
        "error",
        t("common.error", { defaultValue: "Có lỗi xảy ra" }),
        normalizeReviewErrorMessage(error, t),
        true,
      );
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview || !siteId) return;

    const confirmed = await confirm({
      type: "danger",
      iconName: "trash-outline",
      title: t("siteDetail.deleteReviewTitle", { defaultValue: "Xóa đánh giá" }),
      message: t("siteDetail.deleteReviewMessage", { defaultValue: "Bạn có chắc muốn xóa đánh giá này không?" }),
      confirmText: t("common.delete", { defaultValue: "Xóa" }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) return;

    try {
      setIsDeletingReview(true);
      const response = await pilgrimSiteApi.deleteSiteReview(siteId, myReview.id);

      setShowReviewModal(false);
      Keyboard.dismiss();
      setReviewKeyboardHeight(0);
      setReviewText("");
      setReviewRating(5);

      showReviewToast(
        "success",
        t("common.success", { defaultValue: "Thành công" }),
        response.message || t("siteDetail.reviewDeleted", { defaultValue: "Đã xóa đánh giá của bạn." }),
        false,
      );

      await Promise.all([
        Promise.resolve(refetchReviews()),
        Promise.resolve(refetchDetail()),
      ]);
    } catch (error: any) {
      showReviewToast(
        "error",
        t("common.error", { defaultValue: "Có lỗi xảy ra" }),
        getApiErrorMessage(error, t("siteDetail.reviewDeleteError", { defaultValue: "Không thể xóa đánh giá lúc này." })),
        true,
      );
    } finally {
      setIsDeletingReview(false);
    }
  };

  const renderStars = (rating: number, size = 16) => (
    <View style={styles.reviewStarsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? "star" : "star-outline"}
          size={size}
          color={COLORS.accent}
        />
      ))}
    </View>
  );

  const reviewSection = (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.reviewHeaderBlock}>
          <Text style={styles.sectionTitle}>{t("siteDetail.reviews", { defaultValue: "Đánh giá" })}</Text>
          <Text style={styles.reviewSectionSubtitle}>
            {t("siteDetail.reviewsSubtitle", { defaultValue: "Cảm nhận thực tế từ khách hành hương" })}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.writeReviewButton,
            myReview && styles.writeReviewButtonSecondary,
          ]}
          onPress={() => openReviewModal(myReview)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={myReview ? "create-outline" : "chatbubble-ellipses-outline"}
            size={16}
            color={myReview ? COLORS.primary : "#fff"}
          />
          <Text
            style={[
              styles.writeReviewText,
              myReview
                ? styles.writeReviewTextSecondary
                : styles.writeReviewTextPrimary,
            ]}
          >
            {myReview ? t("siteDetail.editReview", { defaultValue: "Chỉnh sửa" }) : t("siteDetail.writeReview", { defaultValue: "Viết đánh giá" })}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reviewSummaryCard}>
        <View style={styles.reviewSummaryMain}>
          <Text style={styles.reviewAverageText}>
            {averageRating ? averageRating.toFixed(1) : "0.0"}
          </Text>
          {renderStars(Math.round(averageRating), 18)}
          <Text style={styles.reviewCountText}>{t("siteDetail.reviewCount", { count: totalReviews, defaultValue: "{{count}} đánh giá" })}</Text>
        </View>

        <View style={styles.reviewDistribution}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count =
              reviewSummary?.ratingDistribution?.[String(star)] || 0;
            const ratio = totalReviews > 0 ? count / totalReviews : 0;

            return (
              <View key={star} style={styles.reviewDistributionRow}>
                <Text style={styles.reviewDistributionLabel}>{star}</Text>
                <Ionicons name="star" size={12} color={COLORS.accent} />
                <View style={styles.reviewDistributionTrack}>
                  <View
                    style={[
                      styles.reviewDistributionFill,
                      {
                        width: `${Math.max(ratio * 100, count > 0 ? 6 : 0)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.reviewDistributionCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {isLoadingReviews ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("siteDetail.loadingReviews", { defaultValue: "Đang tải đánh giá..." })}</Text>
        </View>
      ) : displayedReviews.length > 0 ? (
        <View style={styles.reviewList}>
          {displayedReviews.map((review) => {
            const isOwnReview = review.userId === user?.id;

            return (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewUserRow}>
                    {review.userAvatar ? (
                      <Image
                        source={{ uri: review.userAvatar }}
                        style={styles.reviewAvatar}
                      />
                    ) : (
                      <View style={styles.reviewAvatarFallback}>
                        <Text style={styles.reviewAvatarFallbackText}>
                          {getInitials(review.userName)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.reviewUserMeta}>
                      <View style={styles.reviewNameRow}>
                        <Text style={styles.reviewUserName}>
                          {review.userName}
                        </Text>
                        {isOwnReview ? (
                          <View style={styles.myReviewChip}>
                            <Text style={styles.myReviewChipText}>
                              {t("siteDetail.yourReviewBadge", { defaultValue: "Của bạn" })}
                            </Text>
                          </View>
                        ) : null}
                        {review.verifiedVisit ? (
                          <View style={styles.verifiedVisitChip}>
                            <Text style={styles.verifiedVisitChipText}>
                              {t("siteDetail.verifiedVisit", { defaultValue: "Đã ghé thăm" })}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {renderStars(review.rating, 15)}
                      <Text style={styles.reviewDateText}>
                        {formatReviewDate(review.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {isOwnReview ? (
                    <TouchableOpacity
                      style={styles.editOwnReviewButton}
                      onPress={() => openReviewModal(review)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color={COLORS.primary}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.reviewContentText}>{review.content}</Text>

                {review.reply?.content ? (
                  <View style={styles.reviewReplyCard}>
                    <View style={styles.reviewReplyHeader}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={14}
                        color={COLORS.primary}
                      />
                      <View style={styles.reviewReplyTitleGroup}>
                        <Text style={styles.reviewReplyTitle}>
                          {review.reply.replier?.fullName
                            ? t("siteDetail.replyFrom", { name: review.reply.replier.fullName, defaultValue: "Phản hồi từ {{name}}" })
                            : t("siteDetail.replyFromGuide", { defaultValue: "Phản hồi từ hướng dẫn viên" })}
                        </Text>
                        <View style={styles.reviewReplyBadge}>
                          <Text style={styles.reviewReplyBadgeText}>
                            {t("siteDetail.localGuideBadge", { defaultValue: "Hướng dẫn viên địa phương" })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.reviewReplyContent}>
                      {review.reply.content}
                    </Text>
                    <Text style={styles.reviewReplyMeta}>
                      {review.reply.replier?.fullName
                        ? formatReviewDate(review.reply.createdAt)
                        : (review.reply.replier?.fullName || "Local Guide") +
                          (review.reply.createdAt
                            ? ` • ${formatReviewDate(review.reply.createdAt)}`
                            : "")}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {totalReviews > displayedReviews.length ? (
            <Text style={styles.moreReviewsText}>
              {t("siteDetail.moreReviews", { count: totalReviews - displayedReviews.length, defaultValue: "+{{count}} đánh giá khác sẽ hiển thị ở bước tiếp theo" })}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t("siteDetail.noReviews", { defaultValue: "Chưa có đánh giá nào cho địa điểm này." })}
          </Text>
          <TouchableOpacity
            style={styles.emptyReviewCta}
            onPress={() => openReviewModal()}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyReviewCtaText}>
              {t("siteDetail.writeFirstReview", { defaultValue: "Viết đánh giá đầu tiên" })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isLoading && !site) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!site) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{t('siteDetail.notFound', { defaultValue: 'Không tìm thấy thông tin địa điểm' })}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>{t('siteDetail.back', { defaultValue: 'Quay lại' })}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={COLORS.white}
          />
        }
      >
        {/* Hero Section */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          {/* Background Image */}
          <Image
            source={{
              uri: displayImages[activeImageIndex] || displayImages[0],
            }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.9)"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top Header */}
          <View
            style={[styles.heroHeader, { paddingTop: insets.top + SPACING.sm }]}
          >
            <TouchableOpacity style={styles.heroButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroHeaderRight}>
              <TouchableOpacity style={styles.heroButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroButton}
                onPress={handleBookmark}
              >
                <Ionicons
                  name={isFavorite(siteId) ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite(siteId) ? COLORS.danger : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Ionicons name="business" size={12} color={COLORS.textPrimary} />
                <Text style={styles.typeBadgeText}>
                  {site.type === "church" ? t('siteDetail.typeChurch', { defaultValue: 'Nhà thờ' }) : site.type}
                </Text>
              </View>

              {(() => {
                let timeText = '';
                const oh = site.openingHours as any;
                if (!oh) return null;

                if (typeof oh === 'object' && oh.open && oh.close) {
                  timeText = `${oh.open} - ${oh.close}`;
                } else if (typeof oh === 'string') {
                  timeText = oh;
                } else if (typeof oh === 'object' && Object.keys(oh).length > 0) {
                  // e.g. { "monday": "06:00 - 18:00" }
                  const val = Object.values(oh)[0] as string;
                  if (typeof val === 'string') timeText = val;
                }

                if (!timeText) return null;

                return (
                  <View style={styles.timeBadge}>
                    <Ionicons name="time" size={12} color={COLORS.white} />
                    <Text style={styles.timeBadgeText}>{timeText}</Text>
                  </View>
                );
              })()}
            </View>
            <Text style={styles.heroTitle}>{site.name}</Text>

            {/* Patron Saint in Hero */}
            {site.patronSaint && (
              <View style={styles.patronSaintBadge}>
                <Ionicons name="star" size={14} color={COLORS.accent} />
                <Text style={styles.patronSaintText}>{site.patronSaint}</Text>
              </View>
            )}

            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={COLORS.accent} />
              <Text style={styles.locationText} numberOfLines={1}>
                {site.address}
                {(site.province || site.district) &&
                  `, ${site.district || ""} ${site.province || ""}`}
              </Text>
            </View>

            {/* Pagination Dots */}
            {displayImages.length > 1 && (
              <View style={styles.paginationDots}>
                {displayImages.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setActiveImageIndex(index)}
                  >
                    <View
                      style={[
                        styles.dot,
                        index === activeImageIndex
                          ? styles.activeDot
                          : styles.inactiveDot,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Quick Actions Card */}
          <View style={styles.quickActionsCard}>
            <QuickActionButton icon="navigate" label={t('siteDetail.navigate', { defaultValue: 'Dẫn đường' })} onPress={handleNavigateClick} />
            {site.contactInfo?.phone && (
              <QuickActionButton icon="call" label={t('siteDetail.call', { defaultValue: 'Gọi điện' })} onPress={handleCallClick} />
            )}
            {site.contactInfo?.website && (
              <QuickActionButton icon="globe-outline" label={t('siteDetail.website', { defaultValue: 'Website' })} />
            )}
            <QuickActionButton
              icon="alert-circle-outline"
              label={t('siteDetail.support', { defaultValue: 'Hỗ trợ' })}
              onPress={() => setSOSModalVisible(true)}
            />
          </View>

          {/* Key Information Card - Only show provided info */}
          {/* We only show this card if there's information to show. 
              Currently minimal info is Opening Hours as Patron Saint moved to Hero 
              and Contact Info is redundant. */}
          {(site.openingHours?.open || site.openingHours?.close) && (
            <View style={styles.infoCard}>
              {/* Opening Hours */}
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={styles.infoIconContainer}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={COLORS.accent}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('siteDetail.openingHours', { defaultValue: 'Giờ mở cửa' })}</Text>
                  <Text style={styles.infoValue}>
                    {site.openingHours?.open
                      ? site.openingHours.open.slice(0, 5)
                      : "--"}{" "}
                    -{" "}
                    {site.openingHours?.close
                      ? site.openingHours.close.slice(0, 5)
                      : "--"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('siteDetail.about', { defaultValue: 'Giới thiệu' })}</Text>
            <Text
              style={styles.descriptionText}
              numberOfLines={isDescriptionExpanded ? undefined : 4}
            >
              {site.description || t('siteDetail.noDescription', { defaultValue: 'Chưa có thông tin mô tả.' })}
            </Text>

            {site.description && site.description.length > 150 && (
              <TouchableOpacity
                style={styles.readMoreButton}
                onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                <Text style={styles.readMoreText}>
                  {isDescriptionExpanded ? t('siteDetail.collapse', { defaultValue: 'Thu gọn' }) : t('siteDetail.readMore', { defaultValue: 'Đọc thêm' })}
                </Text>
                <Ionicons
                  name={isDescriptionExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={COLORS.accent}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* History Section - Only if distinct from description */}
          {site.history && site.history !== site.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('siteDetail.history', { defaultValue: 'Lịch sử hình thành' })}</Text>
              <Text style={styles.descriptionText}>{site.history}</Text>
            </View>
          )}

          {/* Photos & Videos Gallery - Only show if we have media */}
          {media && media.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('siteDetail.media', { defaultValue: 'Hình ảnh & Video' })}</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>{t('siteDetail.seeAll', { defaultValue: 'Xem tất cả' })}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryScroll}
              >
                {media.map((item, index) => (
                  <TouchableOpacity
                    key={item.id || index}
                    style={styles.galleryItem}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                    {item.type === "video" && (
                      <View style={styles.playButtonOverlay}>
                        <View style={styles.playButton}>
                          <Ionicons name="play" size={20} color="#fff" />
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Mass Schedule */}
          {/* Mass Schedule - Premium Redesign */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="calendar" size={24} color={COLORS.white} />
              </View>
              <Text style={styles.sectionTitlePremium}>{t('siteDetail.liturgySchedule', { defaultValue: 'Lịch Phụng Vụ' })}</Text>
            </View>

            {formattedSchedules.sunday ||
            formattedSchedules.others.length > 0 ? (
              <View style={styles.premiumScheduleWrapper}>
                {/* Sunday Special Card */}
                {formattedSchedules.sunday && (
                  <View style={styles.sundayCard}>
                    <LinearGradient
                      colors={[COLORS.accent, "#f5d35a"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.sundayHeader}
                    >
                      <Ionicons name="sunny" size={20} color={COLORS.primary} />
                      <Text style={styles.sundayTitle}>
                        {t('siteDetail.sundaySpecial', { defaultValue: 'Chúa Nhật / Lễ Trọng' })}
                      </Text>
                    </LinearGradient>
                    <View style={styles.sundayTimesContainer}>
                      {formattedSchedules.sunday.times.map((time, index) => (
                        <View key={index} style={styles.sundayTimeChip}>
                          <Text style={styles.sundayTimeText}>{time}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Weekdays Grid */}
                {formattedSchedules.others.length > 0 && (
                  <View style={styles.weekdayContainer}>
                    {formattedSchedules.others.map(
                      (schedule: any, index: number) => (
                        <View key={index} style={styles.weekdayRow}>
                          <View style={styles.weekdayLabelContainer}>
                            <Text style={styles.weekdayLabel}>
                              {schedule.day}
                            </Text>
                          </View>
                          <View style={styles.weekdayTimesScroll}>
                            {schedule.times.map(
                              (time: string, tIndex: number) => (
                                <View
                                  key={tIndex}
                                  style={styles.weekdayTimeChip}
                                >
                                  <Text style={styles.weekdayTimeText}>
                                    {time}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        </View>
                      ),
                    )}
                  </View>
                )}

                <TouchableOpacity style={styles.viewFullScheduleButton}>
                  <Text style={styles.viewFullScheduleText}>
                    {t('siteDetail.viewFullSchedule', { defaultValue: 'XEM CHI TIẾT LỊCH LỄ' })}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={COLORS.accent}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('siteDetail.updatingSchedule', { defaultValue: 'Đang cập nhật lịch lễ...' })}</Text>
              </View>
            )}
          </View>

          {/* Upcoming Events - Premium Carousel Redesign */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: COLORS.accent },
                ]}
              >
                <Ionicons name="ticket" size={24} color={COLORS.white} />
              </View>
              <Text style={styles.sectionTitlePremium}>{t('siteDetail.upcomingEvents', { defaultValue: 'Sự kiện sắp tới' })}</Text>
            </View>

            {events && events.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsScrollContent}
                decelerationRate="fast"
                snapToInterval={280 + SPACING.md}
              >
                {events.map((event) => {
                  // Clean date parsing for display
                  const eventDate = new Date(event.start_date);
                  const day = eventDate.getDate();
                  const locale = t('siteDetail.monthLocale', { defaultValue: 'vi-VN' });
                  const monthStr = eventDate.toLocaleDateString(locale, { month: 'short' }).toUpperCase();

                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.largeEventCard}
                      activeOpacity={0.9}
                    >
                      {/* Banner or Gradient Fallback */}
                      {event.banner_url ? (
                        <Image
                          source={{ uri: event.banner_url }}
                          style={styles.eventCardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={getEventGradient(event.description).colors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.eventCardImage}
                        >
                          <MaterialIcons
                            name={getEventGradient(event.description).icon}
                            size={48}
                            color="rgba(255,255,255,0.15)"
                            style={{ position: "absolute", top: "35%", alignSelf: "center" }}
                          />
                        </LinearGradient>
                      )}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.8)"]}
                        style={styles.eventCardOverlay}
                      />

                      {/* Date Badge */}
                      <View style={styles.eventDateBadge}>
                        <Text style={styles.eventDateDay}>{day}</Text>
                        <Text style={styles.eventDateMonth}>{monthStr}</Text>
                      </View>

                      {/* Content */}
                      <View style={styles.eventCardContent}>
                        <Text style={styles.eventCardTitle} numberOfLines={2}>
                          {event.name}
                        </Text>
                        <View style={styles.eventCardFooter}>
                          <Ionicons
                            name="location-outline"
                            size={14}
                            color={COLORS.accent}
                          />
                          <Text
                            style={styles.eventCardLocation}
                            numberOfLines={1}
                          >
                            {site.name}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('siteDetail.noUpcomingEvents', { defaultValue: 'Chưa có sự kiện sắp tới.' })}</Text>
              </View>
            )}
          </View>

          {false && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.reviewHeaderBlock}>
                <Text style={styles.sectionTitle}>{t("siteDetail.reviews", { defaultValue: "Đánh giá" })}</Text>
                <Text style={styles.reviewSectionSubtitle}>
                  {t("siteDetail.reviewsSubtitle", { defaultValue: "Cảm nhận thực tế từ khách hành hương" })}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.writeReviewButton,
                  myReview && styles.writeReviewButtonSecondary,
                ]}
                onPress={() => openReviewModal(myReview)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={myReview ? "create-outline" : "chatbubble-ellipses-outline"}
                  size={16}
                  color={myReview ? COLORS.primary : "#fff"}
                />
                <Text
                  style={[
                    styles.writeReviewText,
                    myReview
                      ? styles.writeReviewTextSecondary
                      : styles.writeReviewTextPrimary,
                  ]}
                >
                  {myReview ? t("siteDetail.editReview", { defaultValue: "Chỉnh sửa" }) : t("siteDetail.writeReview", { defaultValue: "Viết đánh giá" })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reviewSummaryCard}>
              <View style={styles.reviewSummaryMain}>
                <Text style={styles.reviewAverageText}>
                  {averageRating ? averageRating.toFixed(1) : "0.0"}
                </Text>
                {renderStars(Math.round(averageRating), 18)}
                <Text style={styles.reviewCountText}>
                  {t("siteDetail.reviewCount", { count: totalReviews, defaultValue: "{{count}} đánh giá" })}
                </Text>
              </View>

              <View style={styles.reviewDistribution}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count =
                    reviewSummary?.ratingDistribution?.[String(star)] || 0;
                  const ratio = totalReviews > 0 ? count / totalReviews : 0;

                  return (
                    <View key={star} style={styles.reviewDistributionRow}>
                      <Text style={styles.reviewDistributionLabel}>{star}</Text>
                      <Ionicons name="star" size={12} color={COLORS.accent} />
                      <View style={styles.reviewDistributionTrack}>
                        <View
                          style={[
                            styles.reviewDistributionFill,
                            {
                              width: `${Math.max(
                                ratio * 100,
                                count > 0 ? 6 : 0,
                              )}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.reviewDistributionCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {isLoadingReviews ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t("siteDetail.loadingReviews", { defaultValue: "Đang tải đánh giá..." })}</Text>
              </View>
            ) : displayedReviews.length > 0 ? (
              <View style={styles.reviewList}>
                {displayedReviews.map((review) => {
                  const isOwnReview = review.userId === user?.id;

                  return (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewCardHeader}>
                        <View style={styles.reviewUserRow}>
                          {review.userAvatar ? (
                            <Image
                              source={{ uri: review.userAvatar }}
                              style={styles.reviewAvatar}
                            />
                          ) : (
                            <View style={styles.reviewAvatarFallback}>
                              <Text style={styles.reviewAvatarFallbackText}>
                                {getInitials(review.userName)}
                              </Text>
                            </View>
                          )}

                          <View style={styles.reviewUserMeta}>
                            <View style={styles.reviewNameRow}>
                              <Text style={styles.reviewUserName}>
                                {review.userName}
                              </Text>
                              {isOwnReview ? (
                                <View style={styles.myReviewChip}>
                                  <Text style={styles.myReviewChipText}>
                                    {t("siteDetail.yourReviewBadge", { defaultValue: "Của bạn" })}
                                  </Text>
                                </View>
                              ) : null}
                              {review.verifiedVisit ? (
                                <View style={styles.verifiedVisitChip}>
                                  <Text style={styles.verifiedVisitChipText}>
                                    {t("siteDetail.verifiedVisit", { defaultValue: "Đã ghé thăm" })}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            {renderStars(review.rating, 15)}
                            <Text style={styles.reviewDateText}>
                              {formatReviewDate(review.createdAt)}
                            </Text>
                          </View>
                        </View>

                        {isOwnReview ? (
                          <TouchableOpacity
                            style={styles.editOwnReviewButton}
                            onPress={() => openReviewModal(review)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="create-outline"
                              size={16}
                              color={COLORS.primary}
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <Text style={styles.reviewContentText}>{review.content}</Text>

                      {review.reply?.content ? (
                        <View style={styles.reviewReplyCard}>
                          <View style={styles.reviewReplyHeader}>
                            <Ionicons
                              name="chatbubble-ellipses-outline"
                              size={14}
                              color={COLORS.primary}
                            />
                            <View style={styles.reviewReplyTitleGroup}>
                              <Text style={styles.reviewReplyTitle}>
                                {review.reply.replier?.fullName
                                  ? t("siteDetail.replyFrom", { name: review.reply.replier.fullName, defaultValue: "Phản hồi từ {{name}}" })
                                  : t("siteDetail.replyFromGuide", { defaultValue: "Phản hồi từ hướng dẫn viên" })}
                              </Text>
                              <View style={styles.reviewReplyBadge}>
                                <Text style={styles.reviewReplyBadgeText}>
                                  {t("siteDetail.localGuideBadge", { defaultValue: "Hướng dẫn viên địa phương" })}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Text style={styles.reviewReplyContent}>
                            {review.reply.content}
                          </Text>
                          <Text style={styles.reviewReplyMeta}>
                            {review.reply.replier?.fullName
                              ? formatReviewDate(review.reply.createdAt)
                              : (review.reply.replier?.fullName || "Local Guide") +
                                (review.reply.createdAt
                                  ? ` • ${formatReviewDate(review.reply.createdAt)}`
                                  : "")}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                {totalReviews > displayedReviews.length ? (
                  <Text style={styles.moreReviewsText}>
                    {t("siteDetail.moreReviews", { count: totalReviews - displayedReviews.length, defaultValue: "+{{count}} đánh giá khác sẽ hiển thị ở bước tiếp theo" })}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {t("siteDetail.noReviews", { defaultValue: "Chưa có đánh giá nào cho địa điểm này." })}
                </Text>
                <TouchableOpacity
                  style={styles.emptyReviewCta}
                  onPress={() => openReviewModal()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyReviewCtaText}>
                    {t("siteDetail.writeFirstReview", { defaultValue: "Viết đánh giá đầu tiên" })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          )}

          {/* Around the Sanctuary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('siteDetail.aroundSite', { defaultValue: 'Xung quanh nhà thờ' })}</Text>
            <View style={styles.mapCard}>
              {/* Vietmap */}
              {site.latitude && site.longitude ? (
                <View style={styles.mapPlaceholder}>
                  <VietmapView
                    ref={mapRef}
                    initialRegion={{
                      latitude: site.latitude,
                      longitude: site.longitude,
                      zoom: 15,
                    }}
                    pins={[
                      // Site pin - Red color like guide
                      {
                        id: site.id,
                        latitude: site.latitude,
                        longitude: site.longitude,
                        title: site.name,
                        subtitle: [site.address, site.district, site.province]
                          .filter(Boolean)
                          .join(", "),
                        color: "#DC2626", // Red color for main site
                        icon: "⛪",
                        markerType: "site",
                      } as MapPin,
                      // Nearby places pins - with category colors matching guide
                      ...((places || [])
                        .filter((p) => p.latitude && p.longitude)
                        .map((place) => {
                          // Category config matching guide's LocationsTab
                          const categoryConfig: Record<
                            string,
                            {
                              color: string;
                              emoji: string;
                              markerType: "restaurant" | "hotel" | "media";
                            }
                          > = {
                            food: {
                              color: "#F97316",
                              emoji: "🍜",
                              markerType: "restaurant",
                            },
                            restaurant: {
                              color: "#F97316",
                              emoji: "🍜",
                              markerType: "restaurant",
                            },
                            lodging: {
                              color: "#2563EB",
                              emoji: "🏨",
                              markerType: "hotel",
                            },
                            hotel: {
                              color: "#2563EB",
                              emoji: "🏨",
                              markerType: "hotel",
                            },
                            medical: {
                              color: "#10B981",
                              emoji: "🏥",
                              markerType: "media",
                            },
                            media: {
                              color: "#10B981",
                              emoji: "🏥",
                              markerType: "media",
                            },
                          };
                          const config =
                            categoryConfig[place.category] ||
                            categoryConfig.food;

                          return {
                            id: place.id,
                            latitude: place.latitude,
                            longitude: place.longitude,
                            title: place.name,
                            subtitle: place.address,
                            color: config.color,
                            icon: config.emoji,
                            markerType: config.markerType,
                          };
                        }) as MapPin[]),
                    ]}
                    showUserLocation
                    style={styles.mapImage}
                  />
                  <TouchableOpacity
                    style={styles.fullMapButton}
                    onPress={() => setShowFullMap(true)}
                  >
                    <Ionicons name="expand" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.mapPlaceholder, styles.mapNoLocation]}>
                  <Ionicons
                    name="map-outline"
                    size={36}
                    color={COLORS.textTertiary}
                  />
                  <Text style={styles.mapNoLocationText}>
                    {t('siteDetail.noLocationData', { defaultValue: 'Chưa có dữ liệu vị trí' })}
                  </Text>
                </View>
              )}

              {/* Nearby Places List */}
              {places && places.length > 0 ? (
                places.map((place, index) => {
                  let distanceStr = "0 m";
                  if (site.latitude && site.longitude && place.latitude && place.longitude) {
                    const distMeters = calculateDistanceMeters(site.latitude, site.longitude, place.latitude, place.longitude);
                    if (distMeters < 1000) {
                      distanceStr = `${Math.round(distMeters)} m`;
                    } else {
                      distanceStr = `${(distMeters / 1000).toFixed(1)} km`;
                    }
                  } else if (place.distance_meters) {
                    distanceStr = place.distance_meters < 1000 
                      ? `${Math.round(place.distance_meters)} m` 
                      : `${(place.distance_meters / 1000).toFixed(1)} km`;
                  }

                  return (
                    <NearbyPlaceCard
                      key={place.id || index}
                      name={place.name}
                      address={place.address}
                      distance={distanceStr}
                      type={
                        place.category === "food" || place.category === "restaurant"
                          ? "restaurant"
                          : place.category === "lodging" || place.category === "hotel"
                            ? "hotel"
                            : place.category === "medical" || place.category === "media"
                              ? "media"
                              : "other"
                      }
                      onDirections={() => {
                        if (place.latitude && place.longitude && mapRef.current) {
                          mapRef.current.flyTo(
                            place.latitude,
                            place.longitude,
                            15,
                          );
                          mapRef.current.selectPin(place.id);
                        }
                      }}
                    />
                  );
                })
              ) : (
                <View style={{ padding: SPACING.md }}>
                  <Text style={{ color: COLORS.textSecondary }}>
                    {t('siteDetail.noNearbyPlaces', { defaultValue: 'Không có địa điểm lân cận nào.' })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {reviewSection}

          {/* Bottom Spacing for floating bar */}
          <View style={{ height: 132 + insets.bottom }} />
        </View>
      </ScrollView>

      {/* Floating Bottom Bar - Add to Plan */}
      <LinearGradient
        colors={["transparent", "rgba(246,243,235,0.95)", COLORS.background]}
        style={[styles.floatingBarGradient, { paddingBottom: insets.bottom + SPACING.sm }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.addToPlanBtn}
          onPress={handleAddToPlan}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.accent, COLORS.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addToPlanBtnGradient}
          >
            <Ionicons name="calendar" size={20} color="#fff" />
            <Text style={styles.addToPlanBtnText}>{t('siteDetail.addToPlan', { defaultValue: 'Thêm vào lịch trình' })}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* SOS Modal */}
      {site && (
        <SOSModal
          visible={isSOSModalVisible}
          onClose={() => setSOSModalVisible(false)}
          siteId={site.id}
          siteName={site.name}
          siteLocation={
            site.latitude && site.longitude
              ? { latitude: site.latitude, longitude: site.longitude }
              : undefined
          }
        />
      )}

      {site.latitude && site.longitude && (
        <FullMapModal
          visible={showFullMap}
          onClose={() => setShowFullMap(false)}
          pins={[
            {
              id: site.id,
              latitude: site.latitude,
              longitude: site.longitude,
              title: site.name,
              subtitle: [site.address, site.district, site.province]
                .filter(Boolean)
                .join(", "),
              color: "#DC2626",
              icon: "⛪",
              markerType: "site",
            },
            ...(places || [])
              .filter((p) => p.latitude && p.longitude)
              .map((place) => {
                const catCfg: Record<
                  string,
                  {
                    color: string;
                    emoji: string;
                    markerType: "restaurant" | "hotel" | "media";
                  }
                > =
                  {
                    food: {
                      color: "#F97316",
                      emoji: "🍜",
                      markerType: "restaurant",
                    },
                    restaurant: {
                      color: "#F97316",
                      emoji: "🍜",
                      markerType: "restaurant",
                    },
                    lodging: {
                      color: "#2563EB",
                      emoji: "🏨",
                      markerType: "hotel",
                    },
                    hotel: {
                      color: "#2563EB",
                      emoji: "🏨",
                      markerType: "hotel",
                    },
                    medical: {
                      color: "#10B981",
                      emoji: "🏥",
                      markerType: "media",
                    },
                    media: {
                      color: "#10B981",
                      emoji: "🏥",
                      markerType: "media",
                    },
                  };
                const cfg = catCfg[place.category] || catCfg.food;
                return {
                  id: place.id,
                  latitude: place.latitude,
                  longitude: place.longitude,
                  title: place.name,
                  subtitle: place.address,
                  color: cfg.color,
                  icon: cfg.emoji,
                  markerType: cfg.markerType,
                };
              }),
          ]}
          initialRegion={{
            latitude: site.latitude,
            longitude: site.longitude,
            zoom: 15,
          }}
        />
      )}

      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent
        onRequestClose={closeReviewModal}
      >
        <View style={styles.reviewModalBackdrop}>
          <TouchableOpacity
            style={styles.reviewModalDismissArea}
            activeOpacity={1}
            onPress={closeReviewModal}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
            style={[
              styles.reviewModalKeyboardWrap,
              Platform.OS === "android" && reviewKeyboardHeight > 0
                ? { marginBottom: reviewKeyboardHeight }
                : null,
            ]}
          >
            <SafeAreaView edges={["bottom"]} style={styles.reviewModalSafeArea}>
            <View style={styles.reviewModalSheet}>
              <KeyboardAwareScrollView
                enableOnAndroid
                extraScrollHeight={24}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.reviewModalScrollContent}
              >
              <View style={styles.reviewModalHandle} />
              <View style={styles.reviewModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewModalTitle}>
                    {myReview ? t("siteDetail.editReviewModalTitle", { defaultValue: "Chỉnh sửa đánh giá" }) : t("siteDetail.reviewModalTitle", { defaultValue: "Viết đánh giá" })}
                  </Text>
                  <Text style={styles.reviewModalSubtitle}>{site.name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.reviewModalCloseButton}
                  onPress={closeReviewModal}
                >
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.reviewInputLabel}>{t("siteDetail.yourRating", { defaultValue: "Đánh giá của bạn" })}</Text>
              <View style={styles.reviewInputStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    style={styles.reviewStarButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={star <= reviewRating ? "star" : "star-outline"}
                      size={30}
                      color={COLORS.accent}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.reviewInputLabel}>{t("siteDetail.reviewContent", { defaultValue: "Nội dung đánh giá" })}</Text>
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                placeholder={t("siteDetail.reviewPlaceholder", { 
                  defaultValue: "Chia sẻ cảm nhận của bạn về địa điểm này..." 
                })}
                placeholderTextColor={COLORS.textTertiary}
                style={styles.reviewInput}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.reviewInputCounter}>{reviewText.length}/1000</Text>

              <View style={styles.reviewModalActions}>
                {myReview ? (
                  <TouchableOpacity
                    style={styles.reviewDeleteButton}
                    onPress={() => void handleDeleteReview()}
                    disabled={isDeletingReview || isSavingReview}
                    activeOpacity={0.85}
                  >
                    {isDeletingReview ? (
                      <ActivityIndicator size="small" color={COLORS.danger} />
                    ) : (
                      <>
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={COLORS.danger}
                        />
                        <Text style={styles.reviewDeleteButtonText}>{t("siteDetail.deleteReview", { defaultValue: "Xóa" })}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.reviewSubmitButton}
                  onPress={() => void handleSubmitReview()}
                  disabled={isSavingReview || isDeletingReview}
                  activeOpacity={0.85}
                >
                  {isSavingReview ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="paper-plane-outline"
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.reviewSubmitButtonText}>
                        {myReview ? t("siteDetail.updateReview", { defaultValue: "Cập nhật đánh giá" }) : t("siteDetail.submitReview", { defaultValue: "Gửi đánh giá" })}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              </KeyboardAwareScrollView>
            </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
          
          {/* Internal Toast for Modal visibility on some Android versions */}
          <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0 }}>
             <Toast />
          </View>
        </View>
      </Modal>

      <GuestLoginModal
        visible={showGuestLogin}
        onClose={() => setShowGuestLogin(false)}
      />

      {site && (
        <AddToPlanModal
          visible={showAddToPlan}
          onClose={() => setShowAddToPlan(false)}
          siteId={site.id}
          siteName={site.name}
          siteCoverImage={site.coverImage}
          navigation={navigation}
        />
      )}

      <ConfirmModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.body,
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section
  heroContainer: {
    position: "relative",
    width: "100%",
  },
  heroHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    zIndex: 10,
  },
  heroHeaderRight: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flexWrap: "wrap",
    marginBottom: SPACING.xs,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 165, 114, 0.9)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(39, 174, 96, 0.9)", // Vibrant green for visibility
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  timeBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  typeBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: "#fff",
    marginBottom: SPACING.xs,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: "rgba(255,255,255,0.9)",
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 1,
  },
  patronSaintBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: SPACING.xs,
  },
  patronSaintText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  paginationDots: {
    flexDirection: "row",
    gap: 8,
    marginTop: SPACING.lg,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.5)",
  },

  // Content Container
  contentContainer: {
    marginTop: -SPACING.xl,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.md,
  },

  // Quick Actions Card
  quickActionsCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: -SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: "space-around",
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(201, 165, 114, 0.1)", // Light accent
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
  },

  // Empty State
  emptyContainer: {
    padding: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface0,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },

  // Section
  section: {
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.accent,
  },

  // Description
  descriptionText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  readMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    gap: 2,
  },
  readMoreText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.accent,
  },

  // Reviews
  reviewHeaderBlock: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  reviewSectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  writeReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accentDark,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  writeReviewButtonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  writeReviewText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  writeReviewTextPrimary: {
    color: "#fff",
  },
  writeReviewTextSecondary: {
    color: COLORS.primary,
  },
  reviewSummaryCard: {
    backgroundColor: "#FFF8E8",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.22)",
    ...SHADOWS.small,
  },
  reviewSummaryMain: {
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  reviewAverageText: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "800",
    color: COLORS.primary,
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  reviewCountText: {
    marginTop: 6,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  reviewDistribution: {
    gap: 8,
  },
  reviewDistributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewDistributionLabel: {
    width: 12,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  reviewDistributionTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(201, 165, 114, 0.14)",
    overflow: "hidden",
  },
  reviewDistributionFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  reviewDistributionCount: {
    width: 24,
    textAlign: "right",
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  reviewList: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  reviewCard: {
    backgroundColor: COLORS.surface0,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(26, 40, 69, 0.06)",
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  reviewUserRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    flex: 1,
  },
  reviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  reviewAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201, 165, 114, 0.16)",
  },
  reviewAvatarFallbackText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.accentDark,
  },
  reviewUserMeta: {
    flex: 1,
  },
  reviewNameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  reviewUserName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  myReviewChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(25, 55, 109, 0.08)",
  },
  myReviewChipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  verifiedVisitChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  verifiedVisitChipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: "#15803D",
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  reviewDateText: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textTertiary,
  },
  editOwnReviewButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(25, 55, 109, 0.06)",
  },
  reviewContentText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  reviewReplyCard: {
    marginTop: SPACING.md,
    backgroundColor: "#FFF9EF",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.32)",
  },
  reviewReplyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 6,
  },
  reviewReplyTitleGroup: {
    flex: 1,
    gap: 6,
  },
  reviewReplyTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  reviewReplyBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(212, 175, 55, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.28)",
  },
  reviewReplyBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
  },
  reviewReplyContent: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 21,
    color: COLORS.textPrimary,
  },
  reviewReplyMeta: {
    marginTop: 6,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textTertiary,
  },
  moreReviewsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  emptyReviewCta: {
    marginTop: SPACING.md,
    alignSelf: "center",
    backgroundColor: COLORS.accentDark,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  emptyReviewCtaText: {
    color: "#fff",
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  reviewModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  reviewModalDismissArea: {
    flex: 1,
  },
  reviewModalKeyboardWrap: {
    justifyContent: "flex-end",
  },
  reviewModalSafeArea: {
    backgroundColor: COLORS.background,
  },
  reviewModalSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  reviewModalScrollContent: {
    paddingBottom: SPACING.md,
  },
  reviewModalHandle: {
    alignSelf: "center",
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.md,
  },
  reviewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  reviewModalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  reviewModalSubtitle: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  reviewModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  reviewInputLabel: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  reviewInputStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  reviewStarButton: {
    paddingVertical: 4,
  },
  reviewInput: {
    minHeight: 140,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
  },
  reviewInputCounter: {
    marginTop: SPACING.xs,
    alignSelf: "flex-end",
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textTertiary,
  },
  reviewModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  reviewDeleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: BORDER_RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.14)",
    flexDirection: "row",
    gap: 6,
  },
  reviewDeleteButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.danger,
  },
  reviewSubmitButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: BORDER_RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentDark,
    flexDirection: "row",
    gap: 8,
  },
  reviewSubmitButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: "#fff",
  },

  // Gallery
  galleryScroll: {
    gap: SPACING.md,
  },
  galleryItem: {
    width: 240,
    height: 144,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    position: "relative",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },

  // Premium Section styles
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitlePremium: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: "800", // Extra bold
    color: COLORS.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Premium Schedule Styles
  premiumScheduleWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  sundayCard: {
    backgroundColor: COLORS.surface0,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.3)", // Light accent border
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  sundayHeader: {
    flexDirection: "row",
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sundayTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "bold",
    color: COLORS.primary,
    textTransform: "uppercase",
  },
  sundayTimesContainer: {
    padding: SPACING.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  sundayTimeChip: {
    backgroundColor: COLORS.primary, // Contrast with white bg
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  sundayTimeText: {
    color: COLORS.accent, // Gold text on Navy bg
    fontWeight: "bold",
    fontSize: TYPOGRAPHY.fontSize.md,
  },

  // Weekday styles
  weekdayContainer: {
    gap: 12,
  },
  weekdayRow: {
    flexDirection: "column",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  weekdayLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  weekdayLabel: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "700",
    color: COLORS.primary,
  },
  weekdayTimesScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  weekdayTimeChip: {
    backgroundColor: COLORS.surface1, // Slightly off-white
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  weekdayTimeText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },

  viewFullScheduleButton: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.sm,
    gap: 8,
  },
  viewFullScheduleText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "bold",
    color: COLORS.accent,
    letterSpacing: 1,
  },

  // Premium Events Styles
  eventsScrollContent: {
    paddingRight: SPACING.lg,
    gap: SPACING.md,
  },
  largeEventCard: {
    width: 280,
    height: 180,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary, // Fallback
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.medium,
    marginRight: 4, // for shadow
  },
  eventCardImage: {
    width: "100%",
    height: "100%",
  },
  eventCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  eventDateBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: 6,
    alignItems: "center",
    minWidth: 50,
    ...SHADOWS.small,
  },
  eventDateDay: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: "900",
    color: COLORS.primary,
    lineHeight: 24,
  },
  eventDateMonth: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },
  eventCardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
  },
  eventCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  eventCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventCardLocation: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accent,
    fontWeight: "600",
    flex: 1,
  },

  // Map
  mapCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  mapPlaceholder: {
    height: 280,
    backgroundColor: COLORS.backgroundDark,
    position: "relative",
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
  },
  mapNoLocation: {
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
  },
  mapNoLocationText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textTertiary,
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  fullMapButton: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 8,
    ...SHADOWS.small,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.medium,
    gap: SPACING.sm,
  },
  viewMapText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  mapPin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -32,
    marginLeft: -16,
  },

  // Floating Bottom Bar
  floatingBarGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    zIndex: 10,
    elevation: 10,
  },
  addToPlanBtn: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    ...SHADOWS.large,
  },
  addToPlanBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: SPACING.sm,
  },
  addToPlanBtnText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: "#fff",
    letterSpacing: 0.3,
  },
});

export default SiteDetailScreen;
