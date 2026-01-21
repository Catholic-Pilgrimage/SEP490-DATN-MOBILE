import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../constants/theme.constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof SPACING;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
}) => {
  const cardStyle = [
    styles.card,
    styles[variant],
    { padding: SPACING[padding] },
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  default: {
    ...SHADOWS.small,
  },
  elevated: {
    ...SHADOWS.medium,
  },
  outlined: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
