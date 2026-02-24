/**
 * Calendar Layout Utility
 * 
 * Calculates responsive dimensions for the MonthCalendar component
 * to fit perfectly on different screen sizes without scrolling.
 * 
 * Layout breakdown (top to bottom):
 *   - StatusBar + SafeArea top inset
 *   - ShiftsScreen header (title + subtitle)
 *   - Segmented control (tabs)
 *   - Calendar card (margin + padding + content)
 *     - Month header (nav arrows + label)
 *     - Weekday row (T2..CN)
 *     - 5-6 week rows (the grid)
 *     - Legend row
 *   - Bottom Tab Bar + SafeArea bottom inset
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// FIXED LAYOUT HEIGHTS (approximate)
// ============================================

const LAYOUT = {
    /** Status bar height */
    statusBar: Platform.OS === 'android' ? 24 : 44,
    /** SafeArea top (approximate, actual varies) */
    safeAreaTop: Platform.OS === 'android' ? 0 : 47,
    /** ShiftsScreen header (title + subtitle) */
    screenHeader: 64,
    /** Segmented control */
    segmentControl: 52,
    /** Bottom tab bar height */
    bottomTabBar: Platform.OS === 'android' ? 60 : 80,
    /** Calendar card: vertical margins + border radius area */
    calendarCardVerticalPadding: 8,
    /** Month header (< Tháng X, YYYY >) */
    calendarMonthHeader: 44,
    /** Weekday header row (T2 T3 T4...) */
    calendarWeekdayRow: 28,
    /** Legend row at bottom */
    calendarLegend: 22,
    /** Extra spacing/margins */
    calendarExtraSpacing: 12,
};

// ============================================
// CALCULATIONS
// ============================================

/** Total fixed height consumed by everything except the grid rows */
const FIXED_HEIGHT =
    LAYOUT.statusBar +
    LAYOUT.safeAreaTop +
    LAYOUT.screenHeader +
    LAYOUT.segmentControl +
    LAYOUT.bottomTabBar +
    LAYOUT.calendarCardVerticalPadding +
    LAYOUT.calendarMonthHeader +
    LAYOUT.calendarWeekdayRow +
    LAYOUT.calendarLegend +
    LAYOUT.calendarExtraSpacing;

/** Available height for the calendar grid (all week rows combined) */
const AVAILABLE_GRID_HEIGHT = SCREEN_HEIGHT - FIXED_HEIGHT;

/**
 * Calculate the optimal cell height based on screen size.
 * Most months need 5 rows, some need 6.
 * We optimize for 6 rows to never clip.
 */
const MAX_ROWS = 6;
const RAW_CELL_HEIGHT = Math.floor(AVAILABLE_GRID_HEIGHT / MAX_ROWS);

/** Clamp cell height to reasonable bounds */
const MIN_CELL_HEIGHT = 52;
const MAX_CELL_HEIGHT = 80;
const CELL_HEIGHT = Math.max(MIN_CELL_HEIGHT, Math.min(MAX_CELL_HEIGHT, RAW_CELL_HEIGHT));

/** Calendar card horizontal margin */
const CARD_MARGIN_H = 16;
/** Calendar card internal horizontal padding */
const CARD_PADDING_H = 8;
/** Cell width = (screenWidth - card margins - card padding) / 7 */
const CELL_WIDTH = Math.floor((SCREEN_WIDTH - CARD_MARGIN_H * 2 - CARD_PADDING_H * 2) / 7);

// ============================================
// RESPONSIVE FONT SIZES
// ============================================

const scaleFactor = SCREEN_WIDTH / 390; // Based on iPhone 14 width

const roundFont = (size: number) =>
    PixelRatio.roundToNearestPixel(size * Math.min(scaleFactor, 1.3));

const CALENDAR_FONTS = {
    /** Month label "Tháng 2, 2026" */
    monthLabel: roundFont(16),
    /** Weekday labels "T2, T3, ..." */
    weekday: roundFont(11),
    /** Day number in cell */
    dateNumber: roundFont(12),
    /** Shift count badge "2 ca" */
    shiftBadge: roundFont(8),
    /** Event pill text */
    eventPill: roundFont(7),
    /** Legend text */
    legend: roundFont(10),
    /** "Hôm nay" button */
    todayBtn: roundFont(10),
    /** "+thêm" more indicator */
    moreText: roundFont(7),
};

// ============================================
// DATE CIRCLE SIZE (responsive)
// ============================================

const DATE_CIRCLE_SIZE = CELL_HEIGHT <= 56 ? 22 : CELL_HEIGHT <= 66 ? 24 : 26;

// ============================================
// SCREEN SIZE INFO
// ============================================

type ScreenCategory = 'compact' | 'standard' | 'large' | 'tablet';

const getScreenCategory = (): ScreenCategory => {
    if (SCREEN_HEIGHT < 700) return 'compact';    // iPhone SE, small Android
    if (SCREEN_HEIGHT < 850) return 'standard';    // iPhone 12/13/14
    if (SCREEN_HEIGHT < 1000) return 'large';       // iPhone Pro Max, large Android
    return 'tablet';
};

// ============================================
// EXPORTS
// ============================================

export const CALENDAR_LAYOUT = {
    /** Calculated cell height */
    cellHeight: CELL_HEIGHT,
    /** Calculated cell width */
    cellWidth: CELL_WIDTH,
    /** Date number circle size */
    dateCircleSize: DATE_CIRCLE_SIZE,
    /** Card horizontal margin */
    cardMarginH: CARD_MARGIN_H,
    /** Card internal padding */
    cardPaddingH: CARD_PADDING_H,
    /** All font sizes */
    fonts: CALENDAR_FONTS,
    /** Screen dimensions */
    screen: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        category: getScreenCategory(),
    },
    /** Max grid rows */
    maxRows: MAX_ROWS,
    /** Available grid height */
    availableGridHeight: AVAILABLE_GRID_HEIGHT,
    /** Whether content fits without event pills (compact screens) */
    showEventPills: CELL_HEIGHT >= 58,
    /** Whether to show "more" text (needs more vertical space) */
    showMoreText: CELL_HEIGHT >= 64,
};

export default CALENDAR_LAYOUT;
