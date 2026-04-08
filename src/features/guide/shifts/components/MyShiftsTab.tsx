import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { useConfirm } from "../../../../hooks/useConfirm";
import {
  deleteShiftSubmission,
  getShiftSubmissions,
} from "../../../../services/api/guide";
import { ShiftSubmission } from "../../../../types/guide/shiftSubmission.types";
import { MyShiftCard } from "./MyShiftCard";
import { ShiftRegistrationModal } from "./ShiftRegistrationModal";
import { ShiftSubmissionDetailModal } from "./ShiftSubmissionDetailModal";

export const MyShiftsTab: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { confirm, ConfirmModal } = useConfirm();
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "history"
  >("all");
  const [selectedSubmission, setSelectedSubmission] =
    useState<ShiftSubmission | null>(null);
  const [editingWeekStartDate, setEditingWeekStartDate] = useState<
    string | null
  >(null);

  const showInfoDialog = useCallback(
    async (
      title: string,
      message: string,
      type: "info" | "warning" = "info",
    ) => {
      await confirm({
        type,
        title,
        message,
        confirmText: t('common.done'),
        showCancel: false,
      });
    },
    [confirm, t],
  );

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: GUIDE_KEYS.shiftSubmissions.all,
    queryFn: () => getShiftSubmissions(),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShiftSubmission(id),
    onSuccess: () => {
      void showInfoDialog(t('common.success'), t('shifts.reg_toast_success_delete'));
      queryClient.invalidateQueries({
        queryKey: GUIDE_KEYS.shiftSubmissions.all,
      });
      setSelectedSubmission(null);
    },
    onError: (error: any) => {
      void showInfoDialog(
        t('common.error'),
        error?.message || t('shifts.reg_error_cancel_failed'),
        "warning",
      );
    },
  });

  const handleCancel = useCallback(
    async (id: string) => {
      const confirmed = await confirm({
        type: "danger",
        title: t('common.confirm'),
        message: t('shifts.reg_toast_confirm_delete_msg'),
        confirmText: t('shifts.details_cancel_registration'),
        cancelText: t('common.cancel'),
      });

      if (confirmed) {
        deleteMutation.mutate(id);
      }
    },
    [confirm, deleteMutation, t],
  );

  const filteredList = useMemo(() => {
    const submissions = response?.data ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return submissions.filter((submission) => {
      const weekStart = new Date(submission.week_start_date);
      const isPast = weekStart < today;

      if (filter === "all") return true;

      if (filter === "history") {
        return (
          isPast ||
          submission.status === "rejected" ||
          submission.status === "completed"
        );
      }

      if (filter === "approved") {
        return submission.status === "approved" && !isPast;
      }

      if (filter === "pending") {
        return submission.status === "pending";
      }

      return true;
    });
  }, [response?.data, filter]);

  const renderFilterChip = (key: typeof filter, label: string) => (
    <TouchableOpacity
      style={[styles.filterChip, filter === key && styles.filterChipActive]}
      onPress={() => setFilter(key)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterChipText,
          filter === key && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
          style={{ flexGrow: 0 }}
        >
          {renderFilterChip("all", t('shifts.filter_all'))}
          {renderFilterChip("pending", t('shifts.filter_pending'))}
          {renderFilterChip("approved", t('shifts.filter_approved'))}
          {renderFilterChip("history", t('shifts.filter_history'))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={GUIDE_COLORS.primary}
          style={{ marginTop: 40 }}
        />
      ) : filteredList.length > 0 ? (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MyShiftCard
              submission={item}
              onCancel={handleCancel}
              onPress={setSelectedSubmission}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBg}>
            <MaterialIcons
              name="assignment"
              size={48}
              color={GUIDE_COLORS.primary}
            />
          </View>
          <Text style={styles.emptyText}>{t('shifts.empty_no_registrations')}</Text>
          <Text style={styles.emptySubText}>
            {filter === "all"
              ? t('shifts.empty_desc_all')
              : t('shifts.empty_desc_filtered')}
          </Text>
        </View>
      )}

      <ShiftSubmissionDetailModal
        visible={!!selectedSubmission}
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        onEdit={(submission) => {
          setSelectedSubmission(null);
          setEditingWeekStartDate(submission.week_start_date);
        }}
        onCancel={(id) => {
          void handleCancel(id);
          setSelectedSubmission(null);
        }}
      />
      {editingWeekStartDate ? (
        <ShiftRegistrationModal
          visible={!!editingWeekStartDate}
          weekStartDate={editingWeekStartDate}
          onClose={() => setEditingWeekStartDate(null)}
        />
      ) : null}
      <ConfirmModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: "transparent",
    ...GUIDE_SHADOWS.sm,
  },
  filterChipActive: {
    backgroundColor: GUIDE_COLORS.primary,
    transform: [{ scale: 1.05 }],
  },
  filterChipText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textSecondary,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: GUIDE_COLORS.textDark,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GUIDE_COLORS.primaryLight + "40",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: GUIDE_SPACING.lg,
  },
  emptyText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: "bold",
    color: GUIDE_COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});

export default MyShiftsTab;
