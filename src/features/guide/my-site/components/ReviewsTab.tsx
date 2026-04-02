import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useTranslation } from "react-i18next";
import { guideReviewApi } from "../../../../services/api/guide";
import { Review } from "../../../../types/guide";
import { getApiErrorMessage } from "../../../../utils/apiError";
import { PREMIUM_COLORS } from "../constants";

interface ReviewsTabProps {
  focusReviewId?: string;
  autoOpenReply?: boolean;
}

const PAGE_LIMIT = 50;

const formatDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name?: string) => {
  if (!name?.trim()) return "KG";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
};

const renderStars = (rating: number) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= rating ? "star" : "star-outline"}
        size={14}
        color={PREMIUM_COLORS.gold}
      />
    ))}
  </View>
);

const ReviewsTab: React.FC<ReviewsTabProps> = ({
  focusReviewId,
  autoOpenReply = false,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList<Review>>(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyKeyboardLift, setReplyKeyboardLift] = useState(0);
  const [consumedAutoOpenId, setConsumedAutoOpenId] = useState<string | null>(
    null,
  );
  const { confirm, ConfirmModal } = useConfirm();
  const insets = useSafeAreaInsets();

  const reviewsQuery = useQuery({
    queryKey: GUIDE_KEYS.reviews.list({ page: 1, limit: PAGE_LIMIT }),
    queryFn: async () => {
      const response = await guideReviewApi.getReviews({
        page: 1,
        limit: PAGE_LIMIT,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Không thể tải danh sách đánh giá.");
      }

      return response.data;
    },
  });

  const reviews = useMemo(() => reviewsQuery.data?.data ?? [], [reviewsQuery.data]);
  const totalItems = reviewsQuery.data?.pagination?.totalItems ?? reviews.length;

  const openReplyModal = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.response || "");
    setReplyModalVisible(true);
  };

  const closeReplyModal = () => {
    Keyboard.dismiss();
    setReplyKeyboardLift(0);
    setReplyModalVisible(false);
    setSelectedReview(null);
    setReplyText("");
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      const keyboardHeight = Math.max((event.endCoordinates?.height || 0) - insets.bottom, 0);
      const nextLift = Math.min(Math.round(keyboardHeight * 0.38), 120);
      setReplyKeyboardLift(nextLift);
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setReplyKeyboardLift(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const invalidateReviewQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.reviews.all() });
  };

  const submitReplyMutation = useMutation({
    mutationFn: async (payload: { review: Review; response: string }) => {
      const target = {
        reviewId: payload.review.id,
        targetType: payload.review.targetType,
        nearbyPlaceId: payload.review.nearbyPlaceId,
      };

      if (payload.review.response?.trim()) {
        return guideReviewApi.updateReply(target, { content: payload.response });
      }

      return guideReviewApi.createReply(target, { content: payload.response });
    },
    onSuccess: async (response, variables) => {
      await invalidateReviewQueries();
      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2:
          response.message ||
          (variables.review.response?.trim()
            ? "Đã cập nhật phản hồi."
            : "Đã gửi phản hồi."),
      });
      closeReplyModal();
    },
    onError: (error) => {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: getApiErrorMessage(error, "Không thể lưu phản hồi."),
      });
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (review: Review) => {
      return guideReviewApi.deleteReply({
        reviewId: review.id,
        targetType: review.targetType,
        nearbyPlaceId: review.nearbyPlaceId,
      });
    },
    onSuccess: async (response) => {
      await invalidateReviewQueries();
      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: response.message || "Đã xóa phản hồi.",
      });
      closeReplyModal();
    },
    onError: (error) => {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: getApiErrorMessage(error, "Không thể xóa phản hồi."),
      });
    },
  });

  const highlightedReviewIndex = useMemo(
    () => reviews.findIndex((review) => review.id === focusReviewId),
    [focusReviewId, reviews],
  );

  useEffect(() => {
    if (highlightedReviewIndex < 0) return;

    flatListRef.current?.scrollToIndex({
      index: highlightedReviewIndex,
      animated: true,
      viewPosition: 0.2,
    });
  }, [highlightedReviewIndex]);

  useEffect(() => {
    if (!autoOpenReply || !focusReviewId || !reviews.length) return;
    if (consumedAutoOpenId === focusReviewId) return;

    const matchedReview = reviews.find((review) => review.id === focusReviewId);
    if (!matchedReview) return;

    openReplyModal(matchedReview);
    setConsumedAutoOpenId(focusReviewId);
  }, [autoOpenReply, consumedAutoOpenId, focusReviewId, reviews]);

  useEffect(() => {
    setConsumedAutoOpenId(null);
  }, [autoOpenReply, focusReviewId]);

  const handleSubmitReply = () => {
    if (!selectedReview) return;

    const trimmed = replyText.trim();
    if (!trimmed) {
      Toast.show({
        type: "info",
        text1: t("common.notice", { defaultValue: "Thông báo" }),
        text2: "Vui lòng nhập nội dung phản hồi.",
      });
      return;
    }

    submitReplyMutation.mutate({
      review: selectedReview,
      response: trimmed,
    });
  };

  const handleDeleteReply = async () => {
    if (!selectedReview?.response?.trim()) return;

    const confirmed = await confirm({
      type: "danger",
      iconName: "trash-outline",
      title: "Xóa phản hồi",
      message: "Bạn có chắc muốn xóa phản hồi này không?",
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
    });

    if (!confirmed) return;
    deleteReplyMutation.mutate(selectedReview);
  };

  const renderItem = ({ item }: { item: Review }) => {
    const isHighlighted = item.id === focusReviewId;
    const hasResponse = Boolean(item.response?.trim());
    const targetLabel =
      item.targetType === "nearby_place"
        ? item.nearbyPlaceName || "Địa điểm lân cận"
        : item.siteName || "Địa điểm chính";

    return (
      <View
        style={[
          styles.reviewCard,
          isHighlighted && styles.reviewCardHighlighted,
        ]}
      >
        <View style={styles.reviewHeader}>
          <View style={styles.avatarWrap}>
            {item.pilgrimAvatar ? (
              <Image source={{ uri: item.pilgrimAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {getInitials(item.pilgrimName)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.reviewBody}>
            <View style={styles.reviewMetaTop}>
              <View style={styles.reviewMetaMain}>
                <Text style={styles.pilgrimName}>{item.pilgrimName}</Text>
                {renderStars(item.rating)}
              </View>
              <View
                style={[
                  styles.statusChip,
                  hasResponse ? styles.statusChipDone : styles.statusChipPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    hasResponse
                      ? styles.statusChipTextDone
                      : styles.statusChipTextPending,
                  ]}
                >
                  {hasResponse ? "Đã phản hồi" : "Chưa phản hồi"}
                </Text>
              </View>
            </View>

            <View style={styles.targetRow}>
              <MaterialIcons
                name={
                  item.targetType === "nearby_place" ? "place" : "church"
                }
                size={14}
                color={GUIDE_COLORS.primaryDark}
              />
              <Text style={styles.targetText} numberOfLines={1}>
                {targetLabel}
              </Text>
            </View>

            <Text style={styles.reviewContent}>{item.content}</Text>

            <Text style={styles.reviewTime}>{formatDateTime(item.createdAt)}</Text>

            {hasResponse && (
              <View style={styles.responseBox}>
                <View style={styles.responseHeader}>
                  <View style={styles.responseHeaderMain}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={14}
                    color={PREMIUM_COLORS.goldDark}
                  />
                  <Text style={styles.responseTitle}>Phản hồi của bạn</Text>
                </View>
                  <TouchableOpacity
                    style={styles.responseEditButton}
                    onPress={() => openReplyModal(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="create-outline"
                      size={15}
                      color={PREMIUM_COLORS.goldDark}
                    />
                    <Text style={styles.responseEditButtonText}>Chỉnh sửa</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.responseText}>{item.response}</Text>
                <View style={styles.responseFooter}>
                  <View />
                  <TouchableOpacity
                    style={styles.responseEditButton}
                    onPress={() => openReplyModal(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="create-outline"
                      size={15}
                      color={PREMIUM_COLORS.goldDark}
                    />
                    <Text style={styles.responseEditButtonText}>Chỉnh sửa</Text>
                  </TouchableOpacity>
                </View>
                {item.responseUpdatedAt ? (
                  <Text style={styles.responseTime}>
                    Cập nhật {formatDateTime(item.responseUpdatedAt)}
                  </Text>
                ) : null}
              </View>
            )}

            <View
              style={[
                styles.actionRow,
                hasResponse && styles.actionRowHidden,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  hasResponse
                    ? styles.actionButtonSecondary
                    : styles.actionButtonPrimary,
                ]}
                onPress={() => openReplyModal(item)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={hasResponse ? "create-outline" : "chatbubble-outline"}
                  size={16}
                  color={hasResponse ? PREMIUM_COLORS.sapphire : "#FFF"}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    hasResponse
                      ? styles.actionButtonTextSecondary
                      : styles.actionButtonTextPrimary,
                  ]}
                >
                  {hasResponse ? "Chỉnh sửa phản hồi" : "Phản hồi"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (reviewsQuery.isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={GUIDE_COLORS.primary} />
        <Text style={styles.centerText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (reviewsQuery.isError) {
    return (
      <View style={styles.centerState}>
        <Ionicons
          name="alert-circle-outline"
          size={34}
          color={GUIDE_COLORS.error}
        />
        <Text style={styles.centerTitle}>Không tải được đánh giá</Text>
        <Text style={styles.centerText}>
          {reviewsQuery.error instanceof Error
            ? reviewsQuery.error.message
            : "Vui lòng thử lại sau."}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => void reviewsQuery.refetch()}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={reviews}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.2,
            });
          }, 250);
        }}
        refreshControl={
          <RefreshControl
            refreshing={reviewsQuery.isRefetching}
            onRefresh={() => void reviewsQuery.refetch()}
            colors={[GUIDE_COLORS.primary]}
            tintColor={GUIDE_COLORS.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{t("reviews.title")}</Text>
            <Text style={styles.listSubtitle}>
              {totalItems} đánh giá đang hiển thị
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centerState}>
            <Ionicons
              name="chatbubbles-outline"
              size={40}
              color={GUIDE_COLORS.gray300}
            />
            <Text style={styles.centerTitle}>{t("reviews.noReviews")}</Text>
            <Text style={styles.centerText}>
              Chưa có đánh giá nào cho địa điểm bạn đang quản lý.
            </Text>
          </View>
        }
        renderItem={renderItem}
      />

      <Modal
        visible={replyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeReplyModal}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={closeReplyModal}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={[
              styles.modalKeyboardWrap,
              Platform.OS === "android" && replyKeyboardLift > 0
                ? { marginBottom: replyKeyboardLift }
                : null,
            ]}
          >
            <SafeAreaView edges={["bottom"]} style={styles.modalSafeArea}>
              <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {selectedReview?.response?.trim()
                      ? "Chỉnh sửa phản hồi"
                      : "Phản hồi đánh giá"}
                  </Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {selectedReview?.pilgrimName || ""}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={closeReplyModal}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={GUIDE_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
              {selectedReview ? (
                <View style={styles.modalReviewPreview}>
                  <Text style={styles.modalReviewTarget} numberOfLines={1}>
                    {selectedReview.targetType === "nearby_place"
                      ? selectedReview.nearbyPlaceName || "Địa điểm lân cận"
                      : selectedReview.siteName || "Địa điểm chính"}
                  </Text>
                  <Text style={styles.modalReviewContent} numberOfLines={4}>
                    {selectedReview.content}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Nội dung phản hồi</Text>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Nhập phản hồi dành cho khách hành hương..."
                placeholderTextColor={GUIDE_COLORS.textMuted}
                style={styles.replyInput}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />

              <Text style={styles.inputCounter}>{replyText.length}/1000</Text>
              </ScrollView>

              <View style={styles.modalFooter}>
                <View style={styles.modalActionRow}>
                {selectedReview?.response?.trim() ? (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => void handleDeleteReply()}
                    disabled={deleteReplyMutation.isPending}
                    activeOpacity={0.8}
                  >
                    {deleteReplyMutation.isPending ? (
                      <ActivityIndicator size="small" color={GUIDE_COLORS.error} />
                    ) : (
                      <>
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={GUIDE_COLORS.error}
                        />
                        <Text style={styles.deleteButtonText}>Xóa phản hồi</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitReply}
                  disabled={submitReplyMutation.isPending}
                  activeOpacity={0.85}
                >
                  {submitReplyMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="paper-plane-outline"
                        size={16}
                        color="#FFF"
                      />
                      <Text style={styles.submitButtonText}>
                        {selectedReview?.response?.trim()
                          ? "Cập nhật phản hồi"
                          : "Gửi phản hồi"}
                      </Text>
                    </>
                    )}
                </TouchableOpacity>
                </View>
              </View>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ConfirmModal />
    </>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: GUIDE_SPACING.xxl,
  },
  listHeader: {
    paddingTop: GUIDE_SPACING.xs,
    paddingBottom: GUIDE_SPACING.md,
  },
  listTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXXL,
    fontWeight: "800",
    color: PREMIUM_COLORS.charcoal,
  },
  listSubtitle: {
    marginTop: GUIDE_SPACING.xs,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textSecondary,
  },
  reviewCard: {
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    padding: GUIDE_SPACING.lg,
    marginBottom: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.sm,
  },
  reviewCardHighlighted: {
    borderColor: GUIDE_COLORS.primary,
    backgroundColor: "#FFF9E9",
  },
  reviewHeader: {
    flexDirection: "row",
    gap: GUIDE_SPACING.md,
  },
  avatarWrap: {
    paddingTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PREMIUM_COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: PREMIUM_COLORS.goldDark,
  },
  reviewBody: {
    flex: 1,
  },
  reviewMetaTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: GUIDE_SPACING.sm,
  },
  reviewMetaMain: {
    flex: 1,
  },
  pilgrimName: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  statusChip: {
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1,
  },
  statusChipPending: {
    backgroundColor: GUIDE_COLORS.warningLight,
    borderColor: "#F9D37A",
  },
  statusChipDone: {
    backgroundColor: GUIDE_COLORS.successLight,
    borderColor: "#7DD3A3",
  },
  statusChipText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: "700",
  },
  statusChipTextPending: {
    color: "#9A6700",
  },
  statusChipTextDone: {
    color: GUIDE_COLORS.successDark,
  },
  targetRow: {
    marginTop: GUIDE_SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetText: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: PREMIUM_COLORS.brown,
    fontWeight: "600",
  },
  reviewContent: {
    marginTop: GUIDE_SPACING.sm,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    lineHeight: 21,
    color: GUIDE_COLORS.textPrimary,
  },
  reviewTime: {
    marginTop: GUIDE_SPACING.sm,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textMuted,
  },
  responseBox: {
    marginTop: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: "#FFFCF4",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.18)",
    padding: GUIDE_SPACING.md,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: GUIDE_SPACING.xs,
  },
  responseHeaderMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  responseTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "700",
    color: PREMIUM_COLORS.goldDark,
  },
  responseText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    lineHeight: 21,
    color: GUIDE_COLORS.textPrimary,
  },
  responseTime: {
    marginTop: GUIDE_SPACING.xs,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textMuted,
  },
  responseFooter: {
    display: "none",
    marginTop: GUIDE_SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: GUIDE_SPACING.sm,
  },
  responseEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    paddingHorizontal: GUIDE_SPACING.sm + 2,
    paddingVertical: GUIDE_SPACING.xs + 2,
    backgroundColor: PREMIUM_COLORS.goldLight,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.24)",
  },
  responseEditButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: "700",
    color: PREMIUM_COLORS.goldDark,
  },
  actionRow: {
    marginTop: GUIDE_SPACING.md,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionRowHidden: {
    display: "none",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
  },
  actionButtonPrimary: {
    backgroundColor: PREMIUM_COLORS.goldDark,
  },
  actionButtonSecondary: {
    backgroundColor: PREMIUM_COLORS.goldLight,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.24)",
  },
  actionButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "700",
  },
  actionButtonTextPrimary: {
    color: "#FFF",
  },
  actionButtonTextSecondary: {
    color: PREMIUM_COLORS.goldDark,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingVertical: GUIDE_SPACING.xxxl,
  },
  centerTitle: {
    marginTop: GUIDE_SPACING.md,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    textAlign: "center",
  },
  centerText: {
    marginTop: GUIDE_SPACING.sm,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: GUIDE_SPACING.lg,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: PREMIUM_COLORS.goldDark,
  },
  retryButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "700",
    color: "#FFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(28, 23, 18, 0.36)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalKeyboardWrap: {
    justifyContent: "flex-end",
  },
  modalSafeArea: {
    backgroundColor: GUIDE_COLORS.creamPanel,
  },
  modalSheet: {
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.xxl,
    borderTopRightRadius: GUIDE_BORDER_RADIUS.xxl,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.sm,
    maxHeight: "82%",
  },
  modalBody: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: GUIDE_SPACING.md,
  },
  modalFooter: {
    paddingTop: GUIDE_SPACING.md,
    paddingBottom: GUIDE_SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.creamBorder,
  },
  modalHandle: {
    alignSelf: "center",
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: GUIDE_COLORS.creamHandle,
    marginBottom: GUIDE_SPACING.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
  },
  modalTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXL,
    fontWeight: "800",
    color: PREMIUM_COLORS.charcoal,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textSecondary,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GUIDE_COLORS.surface,
  },
  modalReviewPreview: {
    marginTop: GUIDE_SPACING.lg,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  modalReviewTarget: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "700",
    color: PREMIUM_COLORS.goldDark,
    marginBottom: GUIDE_SPACING.xs,
  },
  modalReviewContent: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    lineHeight: 20,
    color: GUIDE_COLORS.textPrimary,
  },
  inputLabel: {
    marginTop: GUIDE_SPACING.lg,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "700",
    color: PREMIUM_COLORS.brown,
    marginBottom: GUIDE_SPACING.sm,
  },
  replyInput: {
    minHeight: 140,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    backgroundColor: "#FFF",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.md,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textPrimary,
  },
  inputCounter: {
    alignSelf: "flex-end",
    marginTop: GUIDE_SPACING.xs,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textMuted,
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: GUIDE_SPACING.md,
  },
  deleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.errorLight,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  deleteButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "700",
    color: GUIDE_COLORS.error,
  },
  submitButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: PREMIUM_COLORS.goldDark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "700",
    color: "#FFF",
  },
});

export default ReviewsTab;
