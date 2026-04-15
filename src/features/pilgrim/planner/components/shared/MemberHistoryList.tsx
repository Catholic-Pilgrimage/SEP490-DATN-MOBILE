import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../../../../constants/theme.constants";
import type { PlannerProgressMember } from "../../../../../types/pilgrim/planner.types";

interface MemberHistoryListProps {
  allItems: any[];
  history: NonNullable<PlannerProgressMember["history"]>;
}

const buildItemMeta = (
  item: any,
  t: (key: string, options?: any) => string,
) => {
  const time = item?.arrival_time || item?.estimated_time;
  const dayNo = item?.leg_number ?? item?.day_number;
  const parts: string[] = [];

  const formatTimeToHourMinute = (value?: string) => {
    if (!value) return "";
    const match = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return String(value);
    const hour = match[1].padStart(2, "0");
    const minute = match[2];
    return `${hour}:${minute}`;
  };

  if (time) {
    parts.push(formatTimeToHourMinute(time));
  }

  if (typeof dayNo === "number" && Number.isFinite(dayNo)) {
    parts.push(
      t("planner.day", {
        defaultValue: "Ngày {{count}}",
        count: dayNo,
      }),
    );
  }

  return parts.join(" • ");
};

const formatCheckinDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${hh}:${mm} ${dd}/${mo}/${yyyy}`;
};

export default function MemberHistoryList({
  allItems,
  history,
}: MemberHistoryListProps) {
  const { t } = useTranslation();
  return (
    <>
      {allItems.map((item) => {
        const hist = history.find(
          (h) => String(h.planner_item_id) === String(item.id),
        );

        let statusText = t("planner.statusNotCheckedIn");
        let color = COLORS.textSecondary;
        let icon: keyof typeof Ionicons.glyphMap = "ellipse-outline";

        if (hist) {
          if (hist.status === "checked_in") {
            statusText = t("planner.statusCheckedIn");
            color = COLORS.success;
            icon = "checkmark-circle";
          } else if (
            hist.status === "skipped_by_planner" ||
            hist.status === "skipped"
          ) {
            statusText = t("planner.statusSkipped");
            color = COLORS.warning;
            icon = "play-skip-forward-circle";
          } else if (hist.status === "missed") {
            statusText = t("planner.statusMissed");
            color = COLORS.danger;
            icon = "close-circle";
          } else {
            statusText = hist.status;
          }
        }

        const imgUri =
          item.site?.cover_image || "https://via.placeholder.com/100";
        const itemMeta = buildItemMeta(item, t);
        const skipReason = (
          hist?.skip_reason ||
          (hist as any)?.reason ||
          (hist as any)?.skipReason
        )
          ?.toString()
          .trim();
        const shouldShowSkipReason =
          !!skipReason &&
          (hist?.status === "skipped_by_planner" || hist?.status === "skipped");
        const checkedInDateText =
          hist?.status === "checked_in"
            ? formatCheckinDateTime(
                hist?.checkin_date ||
                  (hist as any)?.checked_in_at ||
                  (hist as any)?.checkinDate,
              )
            : "";
        const skippedDateText =
          hist?.status === "skipped_by_planner" || hist?.status === "skipped"
            ? formatCheckinDateTime(
                (hist as any)?.skipped_at ||
                  (hist as any)?.skippedAt ||
                  (hist as any)?.skip_date,
              )
            : "";

        return (
          <View key={item.id} style={styles.historyItem}>
            <Image source={{ uri: imgUri }} style={styles.historyImg} />
            <View style={styles.historyBody}>
              <Text style={styles.historySiteName} numberOfLines={1}>
                {item.site?.name || t("planner.members.siteNameDefault")}
              </Text>
              {itemMeta ? (
                <Text style={styles.historyMetaText} numberOfLines={1}>
                  {itemMeta}
                </Text>
              ) : null}
              <View style={styles.historyStatusRow}>
                <Ionicons name={icon} size={14} color={color} />
                <Text style={[styles.historyStatusText, { color }]}>
                  {statusText}
                </Text>
                {checkedInDateText ? (
                  <Text style={styles.checkinDateText}>
                    • {checkedInDateText}
                  </Text>
                ) : null}
                {skippedDateText ? (
                  <Text style={styles.skippedDateText}>
                    • {skippedDateText}
                  </Text>
                ) : null}
              </View>
              {shouldShowSkipReason ? (
                <Text style={styles.skipReasonText} numberOfLines={2}>
                  {t("planner.members.skipReasonLabel", {
                    defaultValue: "Lý do:",
                  })}{" "}
                  {skipReason}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 8,
    borderRadius: 8,
  },
  historyImg: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
  },
  historyBody: {
    flex: 1,
    marginLeft: 10,
  },
  historySiteName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  historyStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  historyMetaText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  checkinDateText: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "500",
  },
  skippedDateText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "500",
  },
  skipReasonText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 15,
    color: "#B45309",
    fontWeight: "500",
  },
});
