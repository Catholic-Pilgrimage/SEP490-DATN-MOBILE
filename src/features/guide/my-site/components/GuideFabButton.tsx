/**
 * Shared floating action button for My Site tabs (schedules, events/media via parent).
 * Applies safe-area bottom inset so the FAB sits above the home indicator / nav bar.
 *
 * - Use `hideOnKeyboard` on screens where a TextInput and the FAB share the same view
 *   so the FAB is not covered by the keyboard or “floating” oddly with KeyboardAvoidingView.
 * - Root is `Animated.createAnimatedComponent(TouchableOpacity)` so `style` accepts
 *   `useAnimatedStyle` from react-native-reanimated (shared values / layout animations).
 * - Default press feedback: spring scale 1 → 0.92 → 1 (Material-like); `activeOpacity` is 1
 *   so feedback is not doubled. Pass your own `style` with transform to override.
 */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Insets,
  Keyboard,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUIDE_SPACING, GUIDE_TYPOGRAPHY } from "../../../../constants/guide.constants";
import { PREMIUM_COLORS } from "../constants";

/** TouchableOpacity that accepts Reanimated animated styles on `style`. */
const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

/**
 * Kích thước FAB mặc định cho My Site (mọi tab dùng chung — tránh 56 vs 60 lệch nhau).
 */
export const GUIDE_FAB_SIZE = 60;

/**
 * Khoảng cách từ cạnh phải vùng nội dung tab đến FAB (0 = sát mép phải khung list, trong padding ngang của MySite).
 */
export const GUIDE_FAB_RIGHT_INSET = 0;

/**
 * Phần offset đáy **thêm** vào safe-area — để 0 để FAB sát đáy vùng nội dung (thấy rõ khác lg 16px cũ).
 * Dùng chung với thanh chọn batch (MediaTab) và {@link getFabScrollBottomInset}.
 */
export const GUIDE_FAB_BOTTOM_INSET = 0;

/**
 * Offset `bottom` (px) cho FAB / action bar absolute — luôn dùng cùng công thức với scroll padding.
 */
export function getFabBottomOffset(insetsBottom: number): number {
  return GUIDE_FAB_BOTTOM_INSET + insetsBottom;
}

/**
 * Chỉ thêm khoảng trống **cuối** khi scroll để FAB không đè nội dung (không thu hẹp card).
 * Khớp {@link getFabBottomOffset} + chiều cao FAB + buffer nhỏ.
 */
export function getFabScrollBottomInset(
  fabSize: number,
  insetsBottom: number,
): number {
  const fromBottom = getFabBottomOffset(insetsBottom);
  return fabSize + fromBottom + GUIDE_SPACING.xs;
}

/** @deprecated Dùng {@link getFabScrollBottomInset} nếu chỉ cần padding đáy. */
export function getFabListContentInset(
  fabSize: number,
  insetsBottom: number,
): { paddingBottom: number; paddingEnd: number } {
  return {
    paddingBottom: getFabScrollBottomInset(fabSize, insetsBottom),
    paddingEnd: GUIDE_SPACING.md + fabSize + GUIDE_SPACING.xs,
  };
}

export type GuideFabHitSlop = number | { top?: number; bottom?: number; left?: number; right?: number };

export interface GuideFabButtonProps {
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  /** Outer size (width = height). Default {@link GUIDE_FAB_SIZE} (60). */
  size?: number;
  iconSize?: number;
  /**
   * Merged into the absolutely positioned root.
   * Supports Reanimated `useAnimatedStyle` output (via AnimatedTouchableOpacity).
   */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children?: React.ReactNode;
  /**
   * When true, FAB is hidden (opacity 0, no touches) while the keyboard is visible.
   * Use on screens with search fields / inputs above the tab area. Default false.
   */
  hideOnKeyboard?: boolean;
  /**
   * Expands the touch target without changing visual size.
   * If omitted: symmetric 10px when `size < 48`, otherwise no extra slop.
   * Pass `0` or `null` to disable auto hit slop.
   */
  hitSlop?: GuideFabHitSlop | null;
  /**
   * Material “extended” FAB: icon + label, pill shape (`borderRadius: 16`), width from content.
   * Use on empty states for a stronger primary action.
   */
  label?: string;
}

function normalizeHitSlop(
  size: number,
  hitSlop: GuideFabHitSlop | null | undefined,
): Insets | undefined {
  if (hitSlop === null) return undefined;
  if (hitSlop !== undefined) {
    if (typeof hitSlop === "number") {
      const h = hitSlop;
      return { top: h, bottom: h, left: h, right: h };
    }
    return hitSlop;
  }
  if (size < 48) {
    return { top: 10, bottom: 10, left: 10, right: 10 };
  }
  return undefined;
}

export const GuideFabButton: React.FC<GuideFabButtonProps> = ({
  onPress,
  onPressIn,
  onPressOut,
  size = GUIDE_FAB_SIZE,
  iconSize = 28,
  style,
  accessibilityLabel = "Thêm mới",
  children,
  hideOnKeyboard = false,
  hitSlop: hitSlopProp,
  label,
}) => {
  const insets = useSafeAreaInsets();
  const bottom = getFabBottomOffset(insets.bottom);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scale = useSharedValue(1);

  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92);
    onPressIn?.();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    onPressOut?.();
  };

  const resolvedHitSlop = useMemo(
    () => normalizeHitSlop(size, hitSlopProp),
    [size, hitSlopProp],
  );

  const isExtended = Boolean(label?.trim());

  useEffect(() => {
    if (!hideOnKeyboard) return;

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const subHide = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [hideOnKeyboard]);

  const hiddenByKeyboard = hideOnKeyboard && keyboardVisible;

  useEffect(() => {
    if (hiddenByKeyboard) {
      scale.value = 1;
    }
  }, [hiddenByKeyboard, scale]);

  return (
    <AnimatedTouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={resolvedHitSlop}
      style={[
        styles.root,
        isExtended
          ? {
              minWidth: size,
              height: size,
              borderRadius: 16,
              paddingHorizontal: GUIDE_SPACING.lg,
              flexDirection: "row",
              alignItems: "center",
              gap: GUIDE_SPACING.sm,
            }
          : {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
        { bottom },
        hiddenByKeyboard && styles.hiddenWhenKeyboard,
        pressAnimatedStyle,
        style,
      ]}
    >
      {isExtended ? (
        <>
          {children ?? (
            <MaterialIcons name="add" size={iconSize} color="#FFFFFF" />
          )}
          <Text style={styles.extendedLabel} numberOfLines={1}>
            {label}
          </Text>
        </>
      ) : (
        children ?? <MaterialIcons name="add" size={iconSize} color="#FFFFFF" />
      )}
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    right: GUIDE_FAB_RIGHT_INSET,
    zIndex: 20,
    backgroundColor: PREMIUM_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  hiddenWhenKeyboard: {
    opacity: 0,
    pointerEvents: "none",
  },
  extendedLabel: {
    color: "#FFFFFF",
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    maxWidth: 220,
  },
});
