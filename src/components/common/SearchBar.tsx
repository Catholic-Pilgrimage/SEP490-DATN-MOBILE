import React from 'react';
import { Text as RNText, StyleSheet, TextInput, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme.constants';
import { responsive, moderateScale, getSpacing } from '../../utils/responsive';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Tìm kiếm địa điểm...',
  value,
  onChangeText,
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <View style={styles.iconContainer}>
        <RNText style={styles.icon}>🔍</RNText>
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface1,
    borderRadius: moderateScale(BORDER_RADIUS.md),
    paddingHorizontal: getSpacing(SPACING.md),
    paddingVertical: getSpacing(SPACING.sm) + 2,
    height: responsive({
      small: moderateScale(44),
      medium: moderateScale(48),
      tablet: moderateScale(56),
      default: moderateScale(48),
    }),
    ...SHADOWS.subtle,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  containerFocused: {
    borderColor: COLORS.accent,
    ...SHADOWS.small,
  },
  iconContainer: {
    marginRight: getSpacing(SPACING.sm) + 2,
  },
  icon: {
    fontSize: responsive({
      small: moderateScale(16),
      medium: moderateScale(18),
      tablet: moderateScale(20),
      default: moderateScale(18),
    }),
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: responsive({
      small: TYPOGRAPHY.fontSize.sm,
      medium: TYPOGRAPHY.fontSize.md,
      tablet: TYPOGRAPHY.fontSize.lg,
      default: TYPOGRAPHY.fontSize.md,
    }),
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    paddingVertical: 0,
    letterSpacing: TYPOGRAPHY.letterSpacing.normal,
  },
});

