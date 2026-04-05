import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../constants/guide.constants";
import type { GuideReviewerInfo } from "../../../types/guide/review-tracking.types";
import {
  formatGuideReviewDateTime,
  getGuideReviewerEmail,
  getGuideReviewerName,
} from "../utils/reviewTracking";

interface ReviewTrackingInfoProps {
  reviewer?: GuideReviewerInfo | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  compact?: boolean;
  showEmail?: boolean;
  title?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const ReviewTrackingInfo: React.FC<ReviewTrackingInfoProps> = ({
  reviewer,
  reviewedBy,
  reviewedAt,
  compact = false,
  showEmail = false,
  title,
  containerStyle,
}) => {
  const { t, i18n } = useTranslation();
  const reviewLocale = i18n.language?.startsWith("en") ? "en-US" : "vi-VN";
  const reviewerName = getGuideReviewerName(reviewer, reviewedBy);
  const reviewerEmail = showEmail ? getGuideReviewerEmail(reviewer) : null;
  const reviewedAtLabel = formatGuideReviewDateTime(reviewedAt, reviewLocale);
  const resolvedTitle = title ?? t("reviewTracking.title");

  if (!reviewerName && !reviewerEmail && !reviewedAtLabel) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        containerStyle,
      ]}
    >
      {!compact ? (
        <View style={styles.header}>
          <MaterialIcons
            name="verified-user"
            size={16}
            color={GUIDE_COLORS.primaryDark}
          />
          <Text style={styles.title}>{resolvedTitle}</Text>
        </View>
      ) : null}

      {reviewerName || reviewerEmail ? (
        <View style={styles.detailRow}>
          <MaterialIcons
            name="person-outline"
            size={15}
            color={GUIDE_COLORS.primaryDark}
          />
          <View style={styles.detailContent}>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>{t("reviewTracking.reviewer")}: </Text>
              {reviewerName ?? t("reviewTracking.managerFallback")}
            </Text>
            {reviewerEmail ? (
              <Text style={styles.detailMeta}>{reviewerEmail}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {reviewedAtLabel ? (
        <View style={styles.detailRow}>
          <MaterialIcons
            name="schedule"
            size={15}
            color={GUIDE_COLORS.creamLabel}
          />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>{t("reviewTracking.reviewedAt")}: </Text>
            {reviewedAtLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    padding: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.sm,
  },
  containerCompact: {
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.sm + 2,
    marginBottom: 0,
    gap: GUIDE_SPACING.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
  },
  title: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.creamInk,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GUIDE_SPACING.xs,
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.creamInk,
  },
  detailText: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    lineHeight: 20,
    color: GUIDE_COLORS.creamLabel,
  },
  detailMeta: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamMuted,
  },
});

export default ReviewTrackingInfo;
