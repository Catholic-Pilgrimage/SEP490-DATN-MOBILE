import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GUIDE_KEYS } from '../../../../constants/queryKeys';
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from '../../../../constants/guide.constants';
import { getShiftSubmissionDetail } from '../../../../services/api/guide';
import type { GuideReviewerInfo } from '../../../../types/guide/review-tracking.types';
import { Shift, ShiftSubmission } from '../../../../types/guide/shiftSubmission.types';
import {
  formatGuideReviewDateTime,
  getGuideReviewerName,
  isUuidLike,
  pickFirstNonEmpty,
} from '../../utils/reviewTracking';

interface ShiftSubmissionDetailModalProps {
  visible: boolean;
  submission: ShiftSubmission | null;
  onClose: () => void;
  onEdit: (submission: ShiftSubmission) => void;
  onCancel: (id: string) => void;
}

type ApproverShape = GuideReviewerInfo;

type ShiftSubmissionDetailLike = ShiftSubmission & {
  approved_by_name?: string | null;
  approved_by_full_name?: string | null;
  approver_name?: string | null;
  approver_full_name?: string | null;
  approved_by_user?: ApproverShape | null;
  approver?: ApproverShape | null;
  approvedBy?: ApproverShape | null;
  reviewer?: ApproverShape | null;
};

const STATUS_CONFIG: Record<
  string,
  {
    color: string;
    background: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
  }
> = {
  pending: {
    color: '#B45309',
    background: '#FFF7E8',
    icon: 'schedule',
    label: 'Chờ duyệt',
  },
  approved: {
    color: '#27AE60',
    background: '#E8F5E9',
    icon: 'check-circle',
    label: 'Đã duyệt',
  },
  rejected: {
    color: '#E74C3C',
    background: '#FDECEC',
    icon: 'cancel',
    label: 'Từ chối',
  },
  completed: {
    color: '#2980B9',
    background: '#EAF4FD',
    icon: 'task-alt',
    label: 'Hoàn thành',
  },
  default: {
    color: GUIDE_COLORS.creamLabel,
    background: GUIDE_COLORS.creamElevated,
    icon: 'info-outline',
    label: 'Không xác định',
  },
};

const DAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const formatShortDate = (dateString?: string | null) => {
  if (!dateString) return null;

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateOnly = (dateString?: string | null) => {
  const shortDate = formatShortDate(dateString);
  if (!shortDate) return null;

  const parsed = new Date(dateString as string);
  if (Number.isNaN(parsed.getTime())) return shortDate;

  const weekday = parsed.toLocaleDateString('vi-VN', { weekday: 'long' });
  return `${weekday}, ${shortDate}`;
};

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return null;

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;

  const datePart = formatShortDate(dateString);
  const timePart = parsed.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return datePart ? `${datePart} • ${timePart}` : timePart;
};

const getDayName = (day: number) => DAY_LABELS[day] ?? `Thứ ${day}`;

const getRegistrationDateLabel = (submission: ShiftSubmissionDetailLike) => {
  const createdAt = formatDateTime(submission.createdAt ?? submission.created_at);
  if (createdAt) return createdAt;

  const firstShiftCreatedAt = formatDateTime(
    submission.shifts?.find((shift) => shift.created_at)?.created_at,
  );
  if (firstShiftCreatedAt) return firstShiftCreatedAt;

  const weekStartDate = formatDateOnly(submission.week_start_date);
  if (weekStartDate) return weekStartDate;

  return 'Chưa có dữ liệu';
};

const getApproverName = (submission: ShiftSubmissionDetailLike) => {
  const resolvedName = pickFirstNonEmpty(
    getGuideReviewerName(submission.reviewer, submission.reviewed_by),
    submission.approved_by_name,
    submission.approved_by_full_name,
    submission.approver_name,
    submission.approver_full_name,
    submission.approved_by_user?.full_name,
    submission.approved_by_user?.fullName,
    submission.approved_by_user?.display_name,
    submission.approved_by_user?.displayName,
    submission.approved_by_user?.name,
    submission.approver?.full_name,
    submission.approver?.fullName,
    submission.approver?.display_name,
    submission.approver?.displayName,
    submission.approver?.name,
    submission.approvedBy?.full_name,
    submission.approvedBy?.fullName,
    submission.approvedBy?.display_name,
    submission.approvedBy?.displayName,
    submission.approvedBy?.name,
  );

  if (resolvedName) return resolvedName;
  if (submission.reviewed_by && !isUuidLike(submission.reviewed_by)) return submission.reviewed_by;
  if (submission.approved_by && !isUuidLike(submission.approved_by)) return submission.approved_by;

  return null;
};

export const ShiftSubmissionDetailModal: React.FC<ShiftSubmissionDetailModalProps> = ({
  visible,
  submission,
  onClose,
  onEdit,
  onCancel,
}) => {
  const { t, i18n } = useTranslation();
  const reviewLocale = i18n.language?.startsWith('en') ? 'en-US' : 'vi-VN';
  const submissionId = submission?.id ?? '';

  const { data: detailResponse } = useQuery({
    queryKey: GUIDE_KEYS.shiftSubmissions.detail(submissionId),
    queryFn: () => getShiftSubmissionDetail(submissionId),
    enabled: visible && !!submissionId,
  });

  const effectiveSubmission = ((detailResponse?.data ?? submission) || null) as ShiftSubmissionDetailLike | null;
  if (!effectiveSubmission) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStartDate = new Date(effectiveSubmission.week_start_date);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);
  const canCancel = effectiveSubmission.status === 'pending';
  const canEdit =
    ['pending', 'rejected', 'approved'].includes(effectiveSubmission.status) &&
    weekEndDate.getTime() >= today.getTime();
  const editButtonText =
    effectiveSubmission.status === 'approved'
      ? 'Điều chỉnh lịch'
      : 'Chỉnh sửa đăng ký';
  const statusConfig = STATUS_CONFIG[effectiveSubmission.status] ?? STATUS_CONFIG.default;
  const registrationCode =
    effectiveSubmission.code || effectiveSubmission.id.slice(0, 8).toUpperCase();
  const registrationDateLabel = getRegistrationDateLabel(effectiveSubmission);
  const approverName = getApproverName(effectiveSubmission);
  const approvedAtLabel =
    formatGuideReviewDateTime(
      effectiveSubmission.reviewed_at ?? effectiveSubmission.approved_at,
    ) || 'Chưa có dữ liệu';
  const localizedApprovedAtLabel =
    formatGuideReviewDateTime(
      effectiveSubmission.reviewed_at ?? effectiveSubmission.approved_at,
      reviewLocale,
    ) || t('common.noData');
  const sortedShifts = [...(effectiveSubmission.shifts ?? [])].sort((a, b) =>
    a.day_of_week === b.day_of_week
      ? a.start_time.localeCompare(b.start_time)
      : a.day_of_week - b.day_of_week,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.outsideTouch} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.dragIndicator} />

          <View style={styles.header}>
            <Text style={styles.title}>Chi tiết đăng ký</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name='close' size={24} color={GUIDE_COLORS.creamLabel} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.topMetaRow}>
              <View style={styles.codeChip}>
                <MaterialIcons name='badge' size={16} color={GUIDE_COLORS.primaryDark} />
                <Text style={styles.codeChipText}>Mã đăng ký: {registrationCode}</Text>
              </View>
              {canEdit ? (
                <TouchableOpacity
                  style={styles.inlineEditButton}
                  onPress={() => {
                    onClose();
                    onEdit(effectiveSubmission as ShiftSubmission);
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name='edit' size={16} color='#1D4ED8' />
                  <Text style={styles.inlineEditButtonText}>{editButtonText}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.statusSection}>
              <View style={[styles.statusIconBg, { backgroundColor: statusConfig.background }]}>
                <MaterialIcons name={statusConfig.icon} size={32} color={statusConfig.color} />
              </View>
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              <Text style={styles.submissionDate}>Đăng ký ngày {registrationDateLabel}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Danh sách ca làm việc</Text>
              <Text style={styles.weekInfo}>
                Tuần bắt đầu: {formatShortDate(effectiveSubmission.week_start_date) || 'Chưa có dữ liệu'}
              </Text>

              <View style={styles.divider} />

              {sortedShifts.length > 0 ? (
                sortedShifts.map((shift: Shift) => (
                  <View
                    key={`${shift.id}-${shift.day_of_week}-${shift.start_time}-${shift.end_time}`}
                    style={styles.shiftItem}
                  >
                    <View style={styles.iconContainer}>
                      <MaterialIcons name='schedule' size={20} color={GUIDE_COLORS.primary} />
                    </View>
                    <View style={styles.shiftDetails}>
                      <Text style={styles.shiftDay}>{getDayName(shift.day_of_week)}</Text>
                      <Text style={styles.shiftTime}>
                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Không có ca làm việc nào.</Text>
              )}
            </View>

            {(effectiveSubmission.change_reason ||
              effectiveSubmission.rejection_reason ||
              approverName ||
              effectiveSubmission.reviewed_at ||
              effectiveSubmission.approved_at) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('reviewTracking.detailsTitle')}</Text>

                {approverName ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('reviewTracking.reviewer')}:</Text>
                    <Text style={styles.detailValue}>{approverName}</Text>
                  </View>
                ) : null}

                {effectiveSubmission?.reviewed_at || effectiveSubmission?.approved_at ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('reviewTracking.reviewedAt')}:</Text>
                    <Text style={styles.detailValue}>{localizedApprovedAtLabel}</Text>
                  </View>
                ) : null}

                {effectiveSubmission?.change_reason ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteTitle}>{t('reviewTracking.changeNote')}:</Text>
                    <Text style={styles.noteContent}>{effectiveSubmission?.change_reason}</Text>
                  </View>
                ) : null}

                {effectiveSubmission?.rejection_reason ? (
                  <View style={[styles.noteBox, styles.errorBox]}>
                    <Text style={[styles.noteTitle, styles.errorTitle]}>
                      {t('reviewTracking.rejectionReason')}:
                    </Text>
                    <Text style={styles.noteContent}>{effectiveSubmission?.rejection_reason}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {false && (effectiveSubmission?.change_reason ||
              effectiveSubmission?.rejection_reason ||
              approverName ||
              effectiveSubmission?.reviewed_at ||
              effectiveSubmission?.approved_at) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Chi tiết xét duyệt</Text>

                {approverName ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Người kiểm duyệt:</Text>
                    <Text style={styles.detailValue}>{approverName}</Text>
                  </View>
                ) : null}

                {effectiveSubmission?.reviewed_at || effectiveSubmission?.approved_at ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Thời gian xử lý:</Text>
                    <Text style={styles.detailValue}>{approvedAtLabel}</Text>
                  </View>
                ) : null}

                {effectiveSubmission?.change_reason ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteTitle}>Ghi chú thay đổi:</Text>
                    <Text style={styles.noteContent}>{effectiveSubmission?.change_reason}</Text>
                  </View>
                ) : null}

                {effectiveSubmission?.rejection_reason ? (
                  <View style={[styles.noteBox, styles.errorBox]}>
                    <Text style={[styles.noteTitle, styles.errorTitle]}>Lý do từ chối:</Text>
                    <Text style={styles.noteContent}>{effectiveSubmission?.rejection_reason}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>

          {canCancel ? (
            <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    onCancel(effectiveSubmission.id);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Hủy đăng ký</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.56)',
    justifyContent: 'flex-end',
  },
  outsideTouch: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: GUIDE_COLORS.creamBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    paddingBottom: 20,
    ...GUIDE_SHADOWS.xl,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: GUIDE_COLORS.creamHandle,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.creamBorder,
  },
  title: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXL,
    fontWeight: 'bold',
    color: GUIDE_COLORS.creamInk,
  },
  closeButton: {
    padding: 8,
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  scrollContent: {
    padding: GUIDE_SPACING.lg,
    paddingBottom: 40,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.lg,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.primaryMuted,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primaryBorder,
  },
  codeChipText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: '700',
    color: GUIDE_COLORS.primaryDark,
  },
  inlineEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GUIDE_SPACING.xs,
    minHeight: 40,
    paddingHorizontal: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: '#EAF2FF',
    borderWidth: 1,
    borderColor: '#B9D2FF',
  },
  inlineEditButtonText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: GUIDE_SPACING.xl,
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    paddingVertical: GUIDE_SPACING.xl,
    paddingHorizontal: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.sm,
  },
  statusIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: GUIDE_SPACING.md,
  },
  statusLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXL,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  submissionDate: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamLabel,
    textAlign: 'center',
  },
  card: {
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    padding: GUIDE_SPACING.lg,
    marginBottom: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.sm,
  },
  cardTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: '700',
    color: GUIDE_COLORS.creamInk,
    marginBottom: 4,
  },
  weekInfo: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamLabel,
    marginBottom: GUIDE_SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: GUIDE_COLORS.creamBorder,
    marginBottom: GUIDE_SPACING.md,
  },
  shiftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GUIDE_COLORS.creamPanel,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  shiftDetails: {
    flex: 1,
  },
  shiftDay: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: '700',
    color: GUIDE_COLORS.creamInk,
  },
  shiftTime: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
  },
  emptyText: {
    fontStyle: 'italic',
    color: GUIDE_COLORS.creamMuted,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: GUIDE_SPACING.md,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamLabel,
    flexShrink: 0,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamInk,
    fontWeight: '500',
  },
  noteBox: {
    backgroundColor: GUIDE_COLORS.creamElevated,
    padding: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    marginTop: 8,
  },
  errorBox: {
    backgroundColor: GUIDE_COLORS.errorLight,
    borderColor: '#FECACA',
  },
  noteTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: '700',
    marginBottom: 4,
    color: GUIDE_COLORS.creamLabel,
  },
  errorTitle: {
    color: GUIDE_COLORS.error,
  },
  noteContent: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamInk,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: GUIDE_SPACING.md,
    padding: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.creamBorder,
    backgroundColor: GUIDE_COLORS.creamPanel,
  },
  footerSafeArea: {
    backgroundColor: GUIDE_COLORS.creamPanel,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: GUIDE_COLORS.errorLight,
    paddingVertical: 14,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: GUIDE_COLORS.error,
    fontWeight: 'bold',
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
  },
});
