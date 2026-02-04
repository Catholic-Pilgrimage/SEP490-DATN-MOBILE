/**
 * SectionHeader Component
 * Sacred-style section header with uppercase label and title
 * Features wide letter-spacing for modern cathedral feel
 * 
 * Usage:
 * <SectionHeader
 *   label="COMMUNITY"
 *   title="Pilgrim Insights"
 *   onViewAll={handleViewAll}
 * />
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SACRED_COLORS, SACRED_TYPOGRAPHY, SACRED_SPACING } from '../../constants/sacred-theme.constants';

interface SectionHeaderProps {
  label?: string;
  title: string;
  onViewAll?: () => void;
  viewAllText?: string;
  style?: ViewStyle;
  titleStyle?: 'default' | 'large';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  title,
  onViewAll,
  viewAllText = 'View All',
  style,
  titleStyle = 'default',
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        {label && (
          <Text style={styles.label}>{label}</Text>
        )}
        <Text style={[
          styles.title,
          titleStyle === 'large' && styles.titleLarge,
        ]}>
          {title}
        </Text>
      </View>
      
      {onViewAll && (
        <TouchableOpacity 
          style={styles.viewAllButton} 
          onPress={onViewAll}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.viewAllText}>{viewAllText}</Text>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={SACRED_COLORS.gold} 
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SACRED_SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: SACRED_TYPOGRAPHY.fontSize.tiny,
    fontWeight: '700',
    color: SACRED_COLORS.gold,
    letterSpacing: SACRED_TYPOGRAPHY.letterSpacing.sacred,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: SACRED_TYPOGRAPHY.fontSize.subheading,
    fontWeight: '700',
    color: SACRED_COLORS.charcoal,
    letterSpacing: SACRED_TYPOGRAPHY.letterSpacing.tight,
  },
  titleLarge: {
    fontSize: SACRED_TYPOGRAPHY.fontSize.display,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: SACRED_TYPOGRAPHY.fontSize.small,
    fontWeight: '600',
    color: SACRED_COLORS.gold,
  },
});

export default SectionHeader;
