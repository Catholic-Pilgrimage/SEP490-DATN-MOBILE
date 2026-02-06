import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING } from '../../../../constants/theme.constants';
import { getSpacing, moderateScale, responsive } from '../../../../utils/responsive';

interface SiteListCardProps {
  id: string;
  name: string;
  address: string;
  siteType: 'church' | 'shrine' | 'monastery' | 'center' | 'other';
  region?: 'Bac' | 'Trung' | 'Nam';
  coverImage: string;
  reviewCount?: number;
  isFavorite: boolean;
  isVisited?: boolean;
  onPress: () => void;
  onFavoritePress: () => void;
  onVisitedPress?: () => void;
}

const SITE_TYPE_LABELS = {
  church: 'Nhà thờ',
  shrine: 'Đền thánh',
  monastery: 'Tu viện',
  center: 'Trung tâm',
  other: 'Khác',
};

const REGION_LABELS = {
  Bac: 'Miền Bắc',
  Trung: 'Miền Trung',
  Nam: 'Miền Nam',
};

export const SiteListCard: React.FC<SiteListCardProps> = ({
  name,
  address,
  siteType,
  region,
  coverImage,
  reviewCount = 0,
  isFavorite,
  isVisited = false,
  onPress,
  onFavoritePress,
  onVisitedPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.96}
    >
      {/* Image with Badge */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: coverImage }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.regionBadge}>
          <Text style={styles.regionText}>
            {region ? REGION_LABELS[region] : SITE_TYPE_LABELS[siteType]}
          </Text>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.location} numberOfLines={1}>
            {address}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom Row: Stats + Actions */}
        <View style={styles.bottomRow}>
          {/* Pilgrim Count */}
          <View style={styles.statsContainer}>
            <Ionicons name="people-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.statsText}>
              {reviewCount > 1000
                ? `${(reviewCount / 1000).toFixed(1)}k`
                : reviewCount
              } Người hành hương
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {/* Favorite Button */}
            <TouchableOpacity
              style={[styles.actionButton, isFavorite && styles.actionButtonActive]}
              onPress={onFavoritePress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite ? COLORS.accent : COLORS.textSecondary}
              />
            </TouchableOpacity>

            {/* Visited Button */}
            {onVisitedPress && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isVisited && styles.actionButtonVisited
                ]}
                onPress={onVisitedPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isVisited ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={18}
                  color={isVisited ? '#22C55E' : COLORS.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(24),
    marginBottom: moderateScale(24),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e6e4dc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  imageContainer: {
    width: '100%',
    height: responsive({
      small: 180,
      medium: 192,
      tablet: 220,
      default: 192,
    }),
    position: 'relative',
    backgroundColor: COLORS.backgroundDark,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  regionBadge: {
    position: 'absolute',
    top: moderateScale(16),
    left: moderateScale(16),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: BORDER_RADIUS.full,
  },

  regionText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#181611',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  content: {
    padding: moderateScale(16),
  },

  name: {
    fontSize: moderateScale(20),
    color: '#181611',
    fontWeight: '700',
    marginBottom: moderateScale(8),
    letterSpacing: -0.3,
    lineHeight: moderateScale(26),
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: moderateScale(12),
  },

  location: {
    flex: 1,
    fontSize: moderateScale(14),
    color: '#897f61',
    fontWeight: '400',
  },

  divider: {
    height: 1,
    backgroundColor: '#f4f3f0',
    marginVertical: moderateScale(12),
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statsText: {
    fontSize: moderateScale(12),
    color: '#897f61',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  actions: {
    flexDirection: 'row',
    gap: getSpacing(SPACING.sm),
  },

  actionButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#f4f3f0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionButtonActive: {
    backgroundColor: 'rgba(236, 182, 19, 0.10)',
  },

  actionButtonVisited: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
});
