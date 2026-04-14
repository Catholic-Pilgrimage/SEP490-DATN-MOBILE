import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../../../constants/theme.constants";
import {
    SwapItemPreview,
    SwapPreviewResult,
    SwapRouteSegment,
} from "../../hooks/useSwapPreview";
import { formatDurationLocalized } from "../../utils/siteScheduleHelper";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SwapPreviewModalProps {
  visible: boolean;
  loading: boolean;
  error: string | null;
  confirmError?: string | null;
  result: SwapPreviewResult | null;
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
  t: (key: string, options?: any) => string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SwapPreviewModal(props: SwapPreviewModalProps) {
  const {
    visible,
    loading,
    error,
    confirmError,
    result,
    onClose,
    onConfirm,
    confirming,
    t,
  } = props;
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t("planner.swapPreviewTitle")}</Text>
            <Text style={styles.subtitle}>
              {t("planner.swapPreviewSubtitle")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.cancelHeaderText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Loading ── */}
        {loading && (
          <View style={styles.centeredContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                {t("planner.loadingNewRoute")}
              </Text>
              <Text style={styles.loadingSubtext}>{t("planner.waitAMoment")}</Text>
            </View>
          </View>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <View style={styles.centeredContainer}>
            <Ionicons name="alert-circle" size={48} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Preview Content ── */}
        {!loading && !error && result && (
          <>
            <ScrollView
              contentContainerStyle={{
                padding: 16,
                paddingBottom: Math.max(insets.bottom, 16) + 90,
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* ── Before Card ── */}
              <SectionLabel
                icon="list-outline"
                label={t("planner.currentOrder")}
                color="#6B7280"
              />
              <View style={styles.orderCard}>
                {result.beforeItems.map((item, idx) => (
                  <React.Fragment key={`before-${item.id}`}>
                    <ItemRow item={item} timeKey="oldTime" dimmed />
                    {idx < result.beforeItems.length - 1 && (
                      <View style={styles.connector}>
                        <View style={styles.connectorDot} />
                        <View style={styles.connectorLine} />
                        <View style={styles.connectorDot} />
                      </View>
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* ── Arrow Divider ── */}
              <View style={styles.arrowDivider}>
                <View style={styles.arrowLine} />
                <View style={styles.arrowCircle}>
                  <Ionicons name="swap-vertical" size={20} color="#fff" />
                </View>
                <View style={styles.arrowLine} />
              </View>

              {/* ── After Card ── */}
              <SectionLabel
                icon="checkmark-circle-outline"
                label={t("planner.newOrder")}
                color="#059669"
              />
              <View style={[styles.orderCard, styles.afterCard]}>
                {result.afterItems.map((item, idx) => (
                  <React.Fragment key={`after-${item.id}`}>
                    <ItemRow item={item} timeKey="newTime" showWarning />
                    {idx < result.routes.length && (
                      <RouteSegmentRow route={result.routes[idx]} t={t} />
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* ── Warnings ── */}
              {result.warnings.length > 0 && (
                <View style={styles.warningsCard}>
                  <View style={styles.warningsHeader}>
                    <Ionicons
                      name={result.isBlocked ? "close-circle" : "warning"}
                      size={18}
                      color={result.isBlocked ? "#DC2626" : "#D97706"}
                    />
                    <Text
                      style={[
                        styles.warningsTitle,
                        { color: result.isBlocked ? "#DC2626" : "#92400E" },
                      ]}
                    >
                      {result.isBlocked ? t("planner.cannotSwapOrder") : t("common.note")}
                    </Text>
                  </View>
                  {result.warnings.map((w, i) => (
                    <Text key={i} style={styles.warningText}>
                      • {w}
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* ── Bottom Buttons ── */}
            <View
              style={[
                styles.bottomBar,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              {Boolean(confirmError) && (
                <View style={styles.confirmErrorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.confirmErrorText}>{confirmError}</Text>
                </View>
              )}
              <View style={styles.bottomActionsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={confirming}
                >
                  <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (result.isBlocked || confirming) &&
                      styles.confirmButtonDisabled,
                  ]}
                  onPress={onConfirm}
                  disabled={result.isBlocked || confirming}
                >
                  {confirming ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          result.isBlocked ? "close-circle" : "checkmark-circle"
                        }
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.confirmButtonText}>
                        {result.isBlocked ? t("planner.cannotSwapOrder") : t("planner.swapConfirmAction")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel(props: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Ionicons name={props.icon as any} size={16} color={props.color} />
      <Text style={[styles.sectionLabelText, { color: props.color }]}>
        {props.label}
      </Text>
    </View>
  );
}

function ItemRow(props: {
  item: SwapItemPreview;
  timeKey: "oldTime" | "newTime";
  dimmed?: boolean;
  showWarning?: boolean;
}) {
  const { item, timeKey, dimmed, showWarning } = props;
  const time = timeKey === "oldTime" ? item.oldTime : item.newTime;
  const timeChanged = item.oldTime !== item.newTime;

  return (
    <View style={[styles.itemRow, dimmed && styles.itemRowDimmed]}>
      <View style={styles.itemInfo}>
        <Text
          style={[styles.itemName, dimmed && { color: "#9CA3AF" }]}
          numberOfLines={1}
        >
          {item.siteName}
        </Text>
        {showWarning && item.warning && (
          <View
            style={[styles.warningBadge, item.isError && styles.errorBadge]}
          >
            <Ionicons
              name={item.isError ? "close-circle" : "information-circle"}
              size={12}
              color={item.isError ? "#DC2626" : "#D97706"}
            />
            <Text
              style={[
                styles.warningBadgeText,
                item.isError && { color: "#DC2626" },
              ]}
              numberOfLines={1}
            >
              {item.warning}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.timeContainer}>
        {showWarning && timeChanged && (
          <Text style={styles.oldTimeStrike}>{item.oldTime}</Text>
        )}
        <Text
          style={[
            styles.timeText,
            dimmed && { color: "#9CA3AF" },
            showWarning && timeChanged && styles.timeTextHighlight,
            showWarning && item.isError && { color: "#DC2626" },
          ]}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

function RouteSegmentRow(props: { route: SwapRouteSegment, t: (key: string, options?: any) => string }) {
  const { route, t } = props;
  const distText =
    route.distanceKm < 1
      ? `${Math.round(route.distanceKm * 1000)} m`
      : `${route.distanceKm.toFixed(1)} km`;

  return (
    <View style={styles.routeRow}>
      <View style={styles.routeConnector}>
        <View style={styles.routeConnectorLine} />
      </View>
      <View style={styles.routeInfo}>
        <Ionicons name="car-outline" size={14} color="#6B7280" />
        <Text style={styles.routeText}>
          {formatDurationLocalized(route.durationMin, t)} • {distText}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  cancelHeaderText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // ── Loading ──
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  loadingSubtext: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  // ── Error ──
  errorText: {
    fontSize: 15,
    color: "#DC2626",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  closeButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  // ── Section Label ──
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabelText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Order Card ──
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 4,
  },
  afterCard: {
    borderColor: "rgba(5, 150, 105, 0.3)",
    backgroundColor: "rgba(5, 150, 105, 0.02)",
  },

  // ── Item Row ──
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  itemRowDimmed: {
    opacity: 0.6,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  timeContainer: {
    alignItems: "flex-end",
  },
  oldTimeStrike: {
    fontSize: 11,
    color: "#D1D5DB",
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  timeTextHighlight: {
    color: "#059669",
  },

  // ── Warning Badge ──
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    backgroundColor: "rgba(217, 119, 6, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  errorBadge: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  warningBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },

  // ── Connector (before card) ──
  connector: {
    alignItems: "center",
    paddingVertical: 2,
    marginLeft: 20,
  },
  connectorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  connectorLine: {
    width: 1,
    height: 8,
    backgroundColor: "#D1D5DB",
  },

  // ── Route Segment ──
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    gap: 10,
  },
  routeConnector: {
    width: 20,
    alignItems: "center",
  },
  routeConnectorLine: {
    width: 2,
    height: 32,
    backgroundColor: "rgba(5, 150, 105, 0.25)",
    borderRadius: 1,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(107, 114, 128, 0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  routeText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  // ── Arrow Divider ──
  arrowDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
    gap: 8,
  },
  arrowLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  // ── Warnings Card ──
  warningsCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.2)",
    gap: 6,
  },
  warningsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  warningsTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  warningText: {
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
    paddingLeft: 4,
  },

  // ── Bottom Bar ──
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  confirmErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
    marginBottom: 10,
  },
  confirmErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#B91C1C",
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },
  confirmButton: {
    flex: 2,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
