import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Types
interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasShift: boolean;
}

interface Assignment {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  location: string;
  imageUrl: string;
}

interface ShiftRequest {
  id: string;
  dateRange: string;
  status: "pending" | "approved" | "rejected";
  note: string;
}

// Mock data
const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];

const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: "1",
    time: "09:00 AM",
    title: "Basilica of St. Francis",
    subtitle: "12 Pilgrims from Boston",
    location: "Assisi, Italy",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBYnMtxBciqVevgccfMftglrUG2FLUkBiT-xY7kFbJyqu9iY33xZ7jdMxerjTu0T4so0mMINDo2MCGtDZZeWezBWAEQQPfG97xNBg68FTcb6vNYC539gsHeEQMVcfy1-BuS1AUijv-Ct6TKIx4odKsvvTm-BRL8nzSVUPZCBy9qaRJOB6U-Qs8gPJmFWOCcyFHwWH2eymBSKBFtg84m26Sovb1MyNo7S1GA-pDj7nHJXkU8SaEGThX4gvixPN3oJg8JSO2hVECVneE",
  },
  {
    id: "2",
    time: "02:00 PM",
    title: "Walking Tour: Old City",
    subtitle: "Private Family Group",
    location: "City Center",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCSe73MDmLQcV2s-25R57Guix7gW281LzQHo3Sx-q6WKeofjzY4NIQhnVHtIEuDhBJ4ulfHIzKRD6Y12W10oyUXNH1-WwylH3n5zAMPWDgGSC6PQHs6KB9IOWSPObqPfDeXzdcLPusa5TIMV6oOK5lC1q4XOFA97fZ7npNTJuAts__XB4PJeyPrfPFF2-217RUQ2dftAMPHGe3ec694AvObWHpgtSAMYjuh13q15pZltvlsA3OskRkjthLluR3K3XjDVZcaWf3WtFw",
  },
];

const MOCK_SHIFT_REQUESTS: ShiftRequest[] = [
  {
    id: "1",
    dateRange: "Nov 01 - Nov 05",
    status: "pending",
    note: "Requested 2 days ago",
  },
  {
    id: "2",
    dateRange: "Oct 25 - Oct 28",
    status: "approved",
    note: "Approved by Admin",
  },
  {
    id: "3",
    dateRange: "Oct 12 - Oct 14",
    status: "rejected",
    note: "Capacity full",
  },
];

// Generate calendar days for a month
const generateCalendarDays = (
  year: number,
  month: number,
  selectedDate: number,
): CalendarDay[] => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days: CalendarDay[] = [];

  // Empty slots before first day
  for (let i = 0; i < firstDay; i++) {
    days.push({
      date: 0,
      isCurrentMonth: false,
      isToday: false,
      hasShift: false,
    });
  }

  // Days in month
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday =
      today.getDate() === i &&
      today.getMonth() === month &&
      today.getFullYear() === year;
    const hasShift = [5, 9, 15, 20, 25].includes(i); // Mock shift days
    days.push({ date: i, isCurrentMonth: true, isToday, hasShift });
  }

  return days;
};

// Assignment Card Component
const AssignmentCard: React.FC<{
  assignment: Assignment;
  onPress: () => void;
}> = ({ assignment, onPress }) => (
  <TouchableOpacity
    style={styles.assignmentCard}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.assignmentContent}>
      <Image
        source={{ uri: assignment.imageUrl }}
        style={styles.assignmentImage}
      />
      <View style={styles.assignmentInfo}>
        <View style={styles.assignmentTimeRow}>
          <MaterialIcons
            name="schedule"
            size={14}
            color={GUIDE_COLORS.primary}
          />
          <Text style={styles.assignmentTime}>{assignment.time}</Text>
        </View>
        <Text style={styles.assignmentTitle} numberOfLines={1}>
          {assignment.title}
        </Text>
        <Text style={styles.assignmentSubtitle} numberOfLines={1}>
          {assignment.subtitle}
        </Text>
      </View>
    </View>
    <View style={styles.assignmentFooter}>
      <View style={styles.assignmentLocation}>
        <MaterialIcons
          name="location-on"
          size={14}
          color={GUIDE_COLORS.gray400}
        />
        <Text style={styles.assignmentLocationText}>{assignment.location}</Text>
      </View>
      <TouchableOpacity style={styles.viewDetailsButton}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <MaterialIcons
          name="arrow-forward"
          size={16}
          color={GUIDE_COLORS.primary}
        />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

// Shift Request Item Component
const ShiftRequestItem: React.FC<{ request: ShiftRequest }> = ({ request }) => {
  const getStatusStyle = () => {
    switch (request.status) {
      case "approved":
        return {
          iconBg: GUIDE_COLORS.primaryMuted,
          iconColor: GUIDE_COLORS.primary,
          icon: "check-circle" as const,
          badgeStyle: styles.badgeApproved,
          badgeText: "Approved",
        };
      case "rejected":
        return {
          iconBg: GUIDE_COLORS.errorLight,
          iconColor: GUIDE_COLORS.error,
          icon: "cancel" as const,
          badgeStyle: styles.badgeRejected,
          badgeText: "Rejected",
        };
      default:
        return {
          iconBg: GUIDE_COLORS.gray100,
          iconColor: GUIDE_COLORS.gray400,
          icon: "schedule" as const,
          badgeStyle: styles.badgePending,
          badgeText: "Pending",
        };
    }
  };

  const statusStyle = getStatusStyle();
  const isRejected = request.status === "rejected";

  return (
    <View style={styles.requestItem}>
      <View style={styles.requestLeft}>
        <View
          style={[styles.requestIcon, { backgroundColor: statusStyle.iconBg }]}
        >
          <MaterialIcons
            name={statusStyle.icon}
            size={20}
            color={statusStyle.iconColor}
          />
        </View>
        <View
          style={[styles.requestInfo, isRejected && styles.requestInfoRejected]}
        >
          <Text
            style={[
              styles.requestDateRange,
              isRejected && styles.requestDateRangeRejected,
            ]}
          >
            {request.dateRange}
          </Text>
          <Text style={styles.requestNote}>{request.note}</Text>
        </View>
      </View>
      <View style={[styles.badge, statusStyle.badgeStyle]}>
        <Text
          style={[
            styles.badgeText,
            request.status === "approved" && styles.badgeTextApproved,
          ]}
        >
          {statusStyle.badgeText}
        </Text>
      </View>
    </View>
  );
};

// Main Schedule Screen
const ScheduleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(5);

  const calendarDays = useMemo(
    () => generateCalendarDays(currentYear, currentMonth, selectedDate),
    [currentYear, currentMonth, selectedDate],
  );

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const goToPrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  }, [currentMonth]);

  const handleDatePress = (date: number) => {
    if (date > 0) {
      setSelectedDate(date);
    }
  };

  const handleProfilePress = () => {
    // TODO: Navigate to profile
  };

  const handleAssignmentPress = (id: string) => {
    // TODO: Navigate to assignment detail
  };

  const handleHistoryPress = () => {
    // TODO: Navigate to shift history
  };

  const handleSubmitAvailability = () => {
    // TODO: Open availability submission
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={GUIDE_COLORS.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleProfilePress}
        >
          <MaterialIcons
            name="account-circle"
            size={28}
            color={GUIDE_COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar Section */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarCard}>
            {/* Month Navigator */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                style={styles.monthNavButton}
                onPress={goToPrevMonth}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={24}
                  color={GUIDE_COLORS.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity
                style={styles.monthNavButton}
                onPress={goToNextMonth}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={GUIDE_COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Days of Week */}
            <View style={styles.daysOfWeek}>
              {DAYS_OF_WEEK.map((day, index) => (
                <View key={index} style={styles.dayOfWeekItem}>
                  <Text style={styles.dayOfWeekText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.calendarDayContainer}
                  onPress={() => handleDatePress(day.date)}
                  disabled={!day.isCurrentMonth}
                >
                  {day.date > 0 ? (
                    <View
                      style={[
                        styles.calendarDay,
                        day.date === selectedDate && styles.calendarDaySelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          !day.isCurrentMonth && styles.calendarDayTextMuted,
                          day.date === selectedDate &&
                          styles.calendarDayTextSelected,
                        ]}
                      >
                        {day.date}
                      </Text>
                      {day.hasShift && day.date !== selectedDate && (
                        <View style={styles.shiftIndicator} />
                      )}
                    </View>
                  ) : (
                    <View style={styles.calendarDayEmpty} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Today's Assignments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Assignments</Text>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>Oct {selectedDate}</Text>
            </View>
          </View>
          <View style={styles.assignmentsList}>
            {MOCK_ASSIGNMENTS.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onPress={() => handleAssignmentPress(assignment.id)}
              />
            ))}
          </View>
        </View>

        {/* Shift Requests Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Shift Requests</Text>
            <TouchableOpacity onPress={handleHistoryPress}>
              <Text style={styles.historyText}>History</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.requestsCard}>
            {MOCK_SHIFT_REQUESTS.map((request, index) => (
              <React.Fragment key={request.id}>
                <ShiftRequestItem request={request} />
                {index < MOCK_SHIFT_REQUESTS.length - 1 && (
                  <View style={styles.requestDivider} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Submit Availability Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitAvailability}
          >
            <MaterialIcons
              name="add-circle"
              size={20}
              color={GUIDE_COLORS.surface}
            />
            <Text style={styles.submitButtonText}>Submit Availability</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: GUIDE_SPACING.xxl,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingVertical: GUIDE_SPACING.lg,
    backgroundColor: GUIDE_COLORS.background,
    borderBottomWidth: 0.5,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  headerTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeHeading,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  profileButton: {
    padding: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },

  // Calendar
  calendarContainer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
  },
  calendarCard: {
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.xxl,
    padding: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.md,
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
    paddingHorizontal: GUIDE_SPACING.sm,
  },
  monthNavButton: {
    padding: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  monthTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.textPrimary,
  },
  daysOfWeek: {
    flexDirection: "row",
    marginBottom: GUIDE_SPACING.sm,
  },
  dayOfWeekItem: {
    flex: 1,
    alignItems: "center",
  },
  dayOfWeekText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.gray400,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayContainer: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  calendarDay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  calendarDaySelected: {
    backgroundColor: GUIDE_COLORS.primary,
    ...GUIDE_SHADOWS.md,
  },
  calendarDayEmpty: {
    flex: 1,
  },
  calendarDayText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textPrimary,
  },
  calendarDayTextMuted: {
    color: GUIDE_COLORS.gray400,
  },
  calendarDayTextSelected: {
    color: GUIDE_COLORS.surface,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
  },
  shiftIndicator: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.primary,
  },

  // Sections
  section: {
    paddingHorizontal: GUIDE_SPACING.xl,
    marginTop: GUIDE_SPACING.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
    gap: GUIDE_SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
  },
  sectionTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXL,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
  },
  dateBadge: {
    backgroundColor: GUIDE_COLORS.gray100,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  dateBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textSecondary,
  },
  historyText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.primary,
  },

  // Assignments
  assignmentsList: {
    gap: GUIDE_SPACING.lg,
  },
  assignmentCard: {
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    padding: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    ...GUIDE_SHADOWS.sm,
  },
  assignmentContent: {
    flexDirection: "row",
    gap: GUIDE_SPACING.lg,
  },
  assignmentImage: {
    width: 80,
    height: 80,
    borderRadius: GUIDE_BORDER_RADIUS.md,
  },
  assignmentInfo: {
    flex: 1,
    justifyContent: "center",
  },
  assignmentTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    marginBottom: GUIDE_SPACING.xs,
  },
  assignmentTime: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.primary,
  },
  assignmentTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    lineHeight: GUIDE_TYPOGRAPHY.fontSizeLG * GUIDE_TYPOGRAPHY.lineHeightTight,
  },
  assignmentSubtitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textSecondary,
    marginTop: GUIDE_SPACING.xs,
  },
  assignmentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.borderLight,
  },
  assignmentLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
  },
  assignmentLocationText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.gray400,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
  },
  viewDetailsText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.primary,
  },

  // Shift Requests
  requestsCard: {
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.xxl,
    padding: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.sm,
  },
  requestItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.sm,
  },
  requestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
  },
  requestInfo: {
    gap: 2,
  },
  requestInfoRejected: {
    opacity: 0.6,
  },
  requestDateRange: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
  },
  requestDateRangeRejected: {
    textDecorationLine: "line-through",
  },
  requestNote: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.gray400,
  },
  requestDivider: {
    height: 1,
    backgroundColor: GUIDE_COLORS.gray100,
    marginVertical: GUIDE_SPACING.sm,
  },

  // Badges
  badge: {
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  badgePending: {
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
    backgroundColor: "transparent",
  },
  badgeApproved: {
    backgroundColor: GUIDE_COLORS.primary,
    ...GUIDE_SHADOWS.sm,
  },
  badgeRejected: {
    backgroundColor: GUIDE_COLORS.errorLight,
  },
  badgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: GUIDE_COLORS.textSecondary,
  },
  badgeTextApproved: {
    color: GUIDE_COLORS.surface,
  },

  // Submit Button
  submitButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.textPrimary,
    paddingVertical: GUIDE_SPACING.lg,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    marginTop: GUIDE_SPACING.xl,
    ...GUIDE_SHADOWS.lg,
  },
  submitButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.surface,
  },
});

export default ScheduleScreen;
