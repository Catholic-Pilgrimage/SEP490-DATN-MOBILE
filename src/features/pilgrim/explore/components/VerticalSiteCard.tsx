import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


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

const REGION_LABELS = {
    Bac: 'Miền Bắc',
    Trung: 'Miền Trung',
    Nam: 'Miền Nam',
};

export const VerticalSiteCard: React.FC<VerticalSiteCardProps> = ({
    name,
    address,
    region,
    coverImage,
    isFavorite,
    onPress,
    onFavoritePress,
}) => {
    const validCoverImage = coverImage?.trim() ? coverImage : 'https://via.placeholder.com/400x500?text=No+Image';

    // Mock multiple images for the carousel effect if only 1 is provided
    const images = [
        validCoverImage,
        'https://images.unsplash.com/photo-1548625361-ec853bdcf95b?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1519782483188-3cae7417e2e3?q=80&w=800&auto=format&fit=crop'
    ];

    const [activeIndex, setActiveIndex] = useState(0);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index || 0);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    return (
        <View style={styles.container}>
            {/* Top: Image Carousel */}
            <View style={styles.imageSection}>
                <FlatList
                    data={images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    keyExtractor={(_, index) => `img-${index}`}
                    renderItem={({ item }) => (
                        <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
                            <Image
                                source={{ uri: item }}
                                style={styles.image}
                            />
                        </TouchableOpacity>
                    )}
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
                        <Text style={styles.badgeText}>{REGION_LABELS[region] || 'Khác'}</Text>
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

                {/* Pagination Dots Overlay */}
                <View style={styles.paginationContainer} pointerEvents="none">
                    {images.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                activeIndex === index ? styles.dotActive : styles.dotInactive
                            ]}
                        />
                    ))}
                </View>
            </View>
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
        justifyContent: 'center',
        alignItems: 'center',
        // Subtle shadow to make it pop on white backgrounds
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
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
    paginationContainer: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 2,
    },
    dotActive: {
        width: 6,
        opacity: 1,
    },
    dotInactive: {
        width: 6,
        opacity: 0.5,
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
