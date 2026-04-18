import { StyleSheet } from "react-native";
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
    SPACING,
} from "../../../../../constants/theme.constants";

export const styles = StyleSheet.create({
  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  calendarNavButton: {
    padding: SPACING.sm,
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  calendarDaysHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING.md,
  },
  calendarDayHeaderText: {
    width: 40,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  calendarDaySelected: {
    backgroundColor: "#D4AF37",
    borderRadius: 20,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: "#D4AF37",
    borderRadius: 20,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  calendarDayTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },
  calendarDayTextToday: {
    color: "#D4AF37",
    fontWeight: "700",
  },
  calendarDayTextDisabled: {
    color: "#D1D5DB",
  },
});
