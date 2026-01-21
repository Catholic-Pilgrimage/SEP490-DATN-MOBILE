import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { getSpacing, moderateScale, responsive, SCREEN } from '../../../../utils/responsive';

interface SiteCardProps {
  id: string;
  name: string;
  distance: string;
  image: ImageSourcePropType | { uri: string };
  isFavorite: boolean;
  onPress: () => void;
  onFavoritePress: () => void;
}

export const SiteCard: React.FC<SiteCardProps> = ({
  name,
  distance,
  image,
  isFavorite,
  onPress,
  onFavoritePress,
}) => {
  return (
    <TouchableOpacity style={styles.sacredCard} onPress={onPress} activeOpacity={0.95}>
      {/* Image Container */}
      <View style={styles.imageContainer}>
        <Image 
          source={image} 
          style={styles.image} 
          resizeMode="cover"
        />
        
        {/* Divine Light Gradient */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.1)', 'rgba(44, 62, 80, 0.3)']}
          style={styles.divineGradient}
        />
        
        {/* Holy Badge */}
        <View style={styles.holyCardBadge}>
          <Text style={styles.crossIcon}>✝</Text>
        </View>
        
        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={onFavoritePress}
          activeOpacity={0.7}
        >
          <Text style={styles.favoriteIcon}>{isFavorite ? '✙' : '✚'}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={styles.churchName} numberOfLines={2}>
          {name}
        </Text>
        
        <View style={styles.infoRow}>
          <View style={styles.distanceInfo}>
            <Text style={styles.distanceIcon}>⛪</Text>
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
          
          <TouchableOpacity style={styles.visitButton} activeOpacity={0.8}>
            <Text style={styles.visitText}>Viếng thăm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sacredCard: {
    width: responsive({
      small: SCREEN.width * 0.75,
      medium: SCREEN.width * 0.75,
      tablet: SCREEN.width * 0.45,
      default: SCREEN.width * 0.75,
    }),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(BORDER_RADIUS.lg),
    ...SHADOWS.medium,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.15)',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: responsive({
      small: 160,
      medium: 180,
      large: 200,
      tablet: 220,
      default: 180,
    }),
    backgroundColor: COLORS.backgroundDark,
  },
  divineGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  holyCardBadge: {
    position: 'absolute',
    top: getSpacing(SPACING.md),
    left: getSpacing(SPACING.md),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  crossIcon: {
    fontSize: moderateScale(18),
    color: COLORS.accent,
  },
  cardContent: {
    padding: getSpacing(SPACING.md) + 2,
  },
  churchName: {
    fontSize: responsive({
      small: TYPOGRAPHY.fontSize.md,
      medium: TYPOGRAPHY.fontSize.lg,
      tablet: TYPOGRAPHY.fontSize.xl,
      default: TYPOGRAPHY.fontSize.lg,
    }),
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: getSpacing(SPACING.md),
    lineHeight: responsive({
      small: TYPOGRAPHY.fontSize.md * 1.5,
      medium: TYPOGRAPHY.fontSize.lg * 1.5,
      tablet: TYPOGRAPHY.fontSize.xl * 1.5,
      default: TYPOGRAPHY.fontSize.lg * 1.5,
    }),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceIcon: {
    fontSize: moderateScale(12),
  },
  distanceText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  visitButton: {
    backgroundColor: COLORS.parchment,
    paddingHorizontal: getSpacing(SPACING.md),
    paddingVertical: getSpacing(SPACING.xs) + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  visitText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.3,
  },
  favoriteButton: {
    position: 'absolute',
    top: getSpacing(SPACING.md),
    right: getSpacing(SPACING.md),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BORDER_RADIUS.full,
    width: moderateScale(36),
    height: moderateScale(36),
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  favoriteIcon: {
    fontSize: moderateScale(18),
  },
});
