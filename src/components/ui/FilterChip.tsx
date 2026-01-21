import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme.constants';
import { responsive, moderateScale, getSpacing } from '../../utils/responsive';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onPress }) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: getSpacing(SPACING.lg),
    paddingVertical: getSpacing(SPACING.sm) + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.accentMetallic,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.accentMetallic,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chipSelected: {
    backgroundColor: COLORS.accentMetallic,
    borderColor: COLORS.accentMetallic,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  text: {
    fontSize: responsive({
      small: TYPOGRAPHY.fontSize.sm,
      medium: TYPOGRAPHY.fontSize.md,
      tablet: TYPOGRAPHY.fontSize.lg,
      default: TYPOGRAPHY.fontSize.md,
    }),
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textChampagne,
    letterSpacing: 0.3,
  },
  textSelected: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 0.5,
  },
});
