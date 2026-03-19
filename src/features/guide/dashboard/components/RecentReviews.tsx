/**
 * RecentReviews Component
 * Displays recent reviews with AI Summary feature
 * Part of the Dashboard "Command Center" redesign
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SPACING
} from "../../../../constants/guide.constants";
import { useI18n } from "../../../../hooks/useI18n";
import { getFontSize, getSpacing } from "../../../../utils/responsive";

// Premium Colors
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F5E6B8",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  aiPurple: "#8B5CF6",
  aiPurpleDark: "#7C3AED",
};

interface Review {
  id: string;
  pilgrimName: string;
  pilgrimAvatar?: string;
  rating: number;
  content: string;
  createdAt: string;
  isReplied: boolean;
}

interface RecentReviewsProps {
  reviews: Review[];
  onReply?: (reviewId: string) => void;
  onViewAll?: () => void;
  onAISummary?: () => void;
}

// Star Rating Component
const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? "star" : star - 0.5 <= rating ? "star-half" : "star-outline"}
          size={size}
          color={PREMIUM_COLORS.gold}
        />
      ))}
    </View>
  );
};

// Review Card Component
const ReviewCard: React.FC<{
  review: Review;
  onReply?: () => void;
}> = ({ review, onReply }) => {
  const { t } = useI18n();

  const timeAgo = React.useMemo(() => {
    const now = new Date();
    const created = new Date(review.createdAt);
    const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return t("reviews.timeAgo.justNow");
    if (diffHours < 24) return t("reviews.timeAgo.hoursAgo", { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t("reviews.timeAgo.daysAgo", { count: diffDays });
  }, [review.createdAt, t]);

  return (
    <View style={styles.reviewCard}>
      {/* Header */}
      <View style={styles.reviewHeader}>
        <View style={styles.pilgrimInfo}>
          {review.pilgrimAvatar ? (
            <Image source={{ uri: review.pilgrimAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {review.pilgrimName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.pilgrimName}>{review.pilgrimName}</Text>
            <StarRating rating={review.rating} />
          </View>
        </View>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>

      {/* Content */}
      <Text style={styles.reviewContent} numberOfLines={3}>
        {review.content}
      </Text>

      {/* Actions */}
      <View style={styles.reviewActions}>
        {review.isReplied ? (
          <View style={styles.repliedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={PREMIUM_COLORS.gold} />
            <Text style={styles.repliedText}>{t("reviews.replied")}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.replyButton} onPress={onReply}>
            <Ionicons name="chatbubble-outline" size={16} color={PREMIUM_COLORS.gold} />
            <Text style={styles.replyButtonText}>{t("reviews.reply")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const RecentReviews: React.FC<RecentReviewsProps> = ({
  reviews,
  onReply,
  onViewAll,
  onAISummary,
}) => {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionLabel}>{t("reviews.sectionLabel")}</Text>
          <Text style={styles.sectionTitle}>{t("reviews.title")}</Text>
        </View>
        <View style={styles.headerActions}>
          {/* AI Summary Button */}
          {onAISummary && (
            <TouchableOpacity style={styles.aiButton} onPress={onAISummary}>
              <LinearGradient
                colors={[PREMIUM_COLORS.aiPurple, PREMIUM_COLORS.aiPurpleDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiButtonGradient}
              >
                <Text style={styles.aiIcon}>✨</Text>
                <Text style={styles.aiButtonText}>{t("reviews.aiSummary")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {onViewAll && (
            <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
              <Ionicons name="chevron-forward" size={16} color={PREMIUM_COLORS.gold} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reviews Horizontal Scroll */}
      {reviews.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reviewsScroll}
        >
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onReply={() => onReply?.(review.id)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={40} color={GUIDE_COLORS.gray300} />
          <Text style={styles.emptyText}>{t("reviews.noReviews")}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: getSpacing(GUIDE_SPACING.xl),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: getSpacing(GUIDE_SPACING.lg),
    marginBottom: getSpacing(GUIDE_SPACING.md),
  },
  sectionLabel: {
    fontSize: getFontSize(12),
    fontWeight: "700",
    color: PREMIUM_COLORS.gold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: getFontSize(20),
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: getSpacing(GUIDE_SPACING.md),
  },
  aiButton: {
    borderRadius: GUIDE_BORDER_RADIUS.full,
    overflow: "hidden",
  },
  aiButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  aiIcon: {
    fontSize: 14,
  },
  aiButtonText: {
    fontSize: getFontSize(11),
    fontWeight: "700",
    color: "#FFF",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: getFontSize(13),
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },
  reviewsScroll: {
    paddingLeft: getSpacing(GUIDE_SPACING.lg),
    paddingRight: getSpacing(GUIDE_SPACING.sm), // Less padding on right to hint more content
    gap: getSpacing(GUIDE_SPACING.md),
  },
  reviewCard: {
    width: 280,
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: getSpacing(GUIDE_SPACING.md),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: getSpacing(GUIDE_SPACING.sm),
  },
  pilgrimInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: getSpacing(GUIDE_SPACING.sm),
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PREMIUM_COLORS.goldLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: PREMIUM_COLORS.gold,
  },
  pilgrimName: {
    fontSize: getFontSize(14),
    fontWeight: "600",
    color: PREMIUM_COLORS.charcoal,
    marginBottom: 2,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  timeAgo: {
    fontSize: getFontSize(11),
    color: GUIDE_COLORS.textMuted,
  },
  reviewContent: {
    fontSize: getFontSize(13),
    color: GUIDE_COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: getSpacing(GUIDE_SPACING.sm),
  },
  reviewActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  repliedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  repliedText: {
    fontSize: getFontSize(12),
    color: PREMIUM_COLORS.gold,
    fontWeight: "500",
  },
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PREMIUM_COLORS.goldLight,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  replyButtonText: {
    fontSize: getFontSize(12),
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: getSpacing(GUIDE_SPACING.xxl),
    marginHorizontal: getSpacing(GUIDE_SPACING.lg),
    backgroundColor: PREMIUM_COLORS.warmGray,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  emptyText: {
    fontSize: getFontSize(14),
    color: GUIDE_COLORS.textMuted,
    marginTop: getSpacing(GUIDE_SPACING.sm),
  },
});

export default RecentReviews;
