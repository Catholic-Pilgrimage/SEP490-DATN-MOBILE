import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../../../../hooks/useI18n';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const CARD_HEIGHT = CARD_WIDTH * 1.1; // Slightly taller than square for that 4:5 feel

interface VerticalSiteCardProps {
    id: string;
    name: string;
    address: string;
    siteType: 'church' | 'shrine' | 'monastery' | 'center' | 'other';
    region?: 'Bac' | 'Trung' | 'Nam';
    coverImage: string; // Could be an array of images in the future for true carousel
    reviewCount?: number;
    isFavorite: boolean;
    onPress: () => void;
    onFavoritePress: () => void;
}



export const VerticalSiteCard: React.FC<VerticalSiteCardProps> = ({
    name,
    address,
    region,
    coverImage,
    isFavorite,
    onPress,
    onFavoritePress,
}) => {
    const { t } = useI18n();
    const validCoverImage = coverImage?.trim() ? coverImage : 'https://via.placeholder.com/400x500?text=No+Image';

    const getRegionLabel = (r: string) => {
        if (r === 'Bac') return t('explore.north', { defaultValue: 'Miền Bắc' });
        if (r === 'Trung') return t('explore.central', { defaultValue: 'Miền Trung' });
        if (r === 'Nam') return t('explore.south', { defaultValue: 'Miền Nam' });
        return t('explore.typeOther', { defaultValue: 'Khác' });
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.imageSection} 
                activeOpacity={0.9} 
                onPress={onPress}
            >
                <Image
                    source={{ uri: validCoverImage }}
                    style={styles.image}
                />

                {/* Favorite Button Overlay */}
                <TouchableOpacity
                    style={styles.favoriteBtn}
                    onPress={onFavoritePress}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={24}
                        color={isFavorite ? "#FF3B30" : "rgba(255,255,255,0.9)"}
                    />
                </TouchableOpacity>

                {/* Region Badge Overlay */}
                {!!region && (
                    <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{getRegionLabel(region)}</Text>
                    </View>
                )}

                {/* Text Overlay with Gradient */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
                    style={styles.gradientOverlay}
                    pointerEvents="none"
                >
                    <View style={styles.textSection}>
                        <Text style={styles.name} numberOfLines={1}>
                            {name}
                        </Text>
                        <View style={styles.addressRow}>
                            <Ionicons name="location-sharp" size={14} color="#FFF" />
                            <Text style={styles.address} numberOfLines={1}>
                                {address}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: CARD_WIDTH,
        marginBottom: 24, // Reduced because text is now inside
        alignSelf: 'center',
    },
    imageSection: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        // Elevation for Android
        elevation: 8,
    },
    image: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        resizeMode: 'cover',
    },
    favoriteBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.35)', // Defined circular background
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
        // Remove messy shadow on transparent bg
    },
    badgeContainer: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45%', // Cover bottom half for smooth fade
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingBottom: 36, // Leave room for pagination dots
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    textSection: {
        // Handled by gradient padding
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    address: {
        fontSize: 14,
        color: '#E5E7EB',
        fontWeight: '500',
        flex: 1,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});
