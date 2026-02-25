import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../../../constants/theme.constants';

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
  onPress,
  onFavoritePress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left: Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: coverImage || 'https://via.placeholder.com/100?text=No+Image' }}
          style={styles.image}
        />

        {/* Badge Overlay */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {region ? REGION_LABELS[region] : SITE_TYPE_LABELS[siteType]}
          </Text>
        </View>

        {/* Favorite Button Overlay */}
        <TouchableOpacity
          style={styles.favoriteBtn}
          onPress={onFavoritePress}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={18}
            color={isFavorite ? "#FF3B30" : "#FFF"}
          />
        </TouchableOpacity>
      </View>

      {/* Right: Content Section */}
      <View style={styles.contentContainer}>
        <View>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.location} numberOfLines={1}>
              {address}
            </Text>
          </View>
        </View>

        {/* Stats / Footer */}
        <View style={styles.footerRow}>
          {reviewCount > 10 ? (
            <View style={styles.statItem}>
              <Ionicons name="people" size={12} color={COLORS.primary} />
              <Text style={styles.statText}>
                {reviewCount > 1000 ? `${(reviewCount / 1000).toFixed(1)}k` : reviewCount} đang xem
              </Text>
            </View>
          ) : (
            <View style={styles.statItem}>
              <Ionicons name="sparkles" size={12} color="#EAB308" />
              <Text style={styles.statTextHighlight}>Nổi bật</Text>
            </View>
          )}

          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 10,
    // Softer, more professional shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  statTextHighlight: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
});
