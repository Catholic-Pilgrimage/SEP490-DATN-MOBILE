import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    ImageBackground,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SPACING } from '../../../../constants/theme.constants';
import { moderateScale } from '../../../../utils/responsive'; // Adjust imports as per your structure

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeaturedCarouselProps {
    sites: Array<{
        id: string;
        name: string;
        address: string;
        coverImage?: string;
        region?: string;
    }>;
    onSitePress: (siteId: string) => void;
}

// 5 items * 200 = 1000 items. Practically infinite for this use case.
const LOOPS = 200;

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ sites, onSitePress }) => {
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0); // This will grow indefinitely

    // Filter top 5 first
    const baseSites = sites ? sites.slice(0, 5) : [];

    // Create "infinite" data
    const infiniteSites = React.useMemo(() => {
        if (baseSites.length === 0) return [];
        let result: any[] = [];
        for (let i = 0; i < LOOPS; i++) {
            result = [...result, ...baseSites];
        }
        return result;
    }, [baseSites]);

    // Derived dimensions
    const ITEM_WIDTH = SCREEN_WIDTH * 0.85;
    const SNAP_INTERVAL = ITEM_WIDTH + 16; // 16 is gap/margin if any? 
    // Note: In styling itemContainer has no margin, but contentContainer has gap: 16.
    // So effective item size is ITEM_WIDTH. 
    // But FlatList gap handling with snapToInterval is tricky.
    // Best approach: add margin to Item, remove gap from contentContainer.

    // Auto-scroll logic
    useEffect(() => {
        if (infiniteSites.length === 0) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => {
                const next = prev + 1;
                // If we somehow reach the true end, reset (unlikely in normal usage)
                if (next >= infiniteSites.length) {
                    flatListRef.current?.scrollToIndex({ index: 0, animated: false });
                    return 0;
                }

                flatListRef.current?.scrollToIndex({
                    index: next,
                    animated: true,
                });
                return next;
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [infiniteSites.length]);

    if (baseSites.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionHeader}>Nổi bật nhất</Text>
            <FlatList
                ref={flatListRef}
                data={infiniteSites}
                horizontal
                pagingEnabled={false}
                snapToInterval={SNAP_INTERVAL}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                keyExtractor={(item, index) => `featured-${item.id}-${index}`}

                // Optimization
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={3}
                getItemLayout={(data, index) => ({
                    length: SNAP_INTERVAL,
                    offset: SNAP_INTERVAL * index,
                    index,
                })}

                // Allow user to scroll freely, we just update index slightly to keep auto-scroll in sync?
                // Actually, for simple auto-scroll, we might not need to sync state on manual scroll perfectly
                // unless we want to pause auto-scroll. 
                // For now, let's just let it run.
                onMomentumScrollEnd={(ev) => {
                    const index = Math.round(ev.nativeEvent.contentOffset.x / SNAP_INTERVAL);
                    setCurrentIndex(index);
                }}

                renderItem={({ item, index }) => {
                    // Start in the "middle" for effective infinite scroll? 
                    // For now, starting at 0 is fine, user just scrolls forward.
                    return (
                        <TouchableOpacity
                            style={[styles.itemContainer, { marginRight: 16 }]} // Add margin here instead of gap
                            activeOpacity={0.95}
                            onPress={() => onSitePress(item.id)}
                        >
                            <ImageBackground
                                source={item.coverImage ? { uri: item.coverImage } : require('../../../../../assets/images/bg2.jpg')} // Fallback
                                style={styles.imageBackground}
                                imageStyle={styles.imageStyle}
                            >
                                <View style={styles.overlay}>
                                    <View style={styles.topRow}>
                                        <View style={styles.tagContainer}>
                                            <Text style={styles.tagText}>
                                                {item.region === 'Bac' ? 'Miền Bắc' : item.region === 'Trung' ? 'Miền Trung' : 'Miền Nam'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.bottomContent}>
                                        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
                                        <View style={styles.metaRow}>
                                            <Ionicons name="location-outline" size={14} color="#E0E0E0" />
                                            <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
                                        </View>
                                    </View>
                                </View>
                            </ImageBackground>
                        </TouchableOpacity>
                    )
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginLeft: SPACING.lg,
        marginBottom: 16,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    contentContainer: {
        paddingHorizontal: SPACING.lg,
        // gap: 16, // REMOVED GAP because we use marginRight on items for consistent paging
    },
    itemContainer: {
        width: SCREEN_WIDTH * 0.85,
        height: moderateScale(250),
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
        backgroundColor: '#fff',
    },
    imageBackground: {
        flex: 1,
        justifyContent: 'space-between',
    },
    imageStyle: {
        borderRadius: 20,
    },
    overlay: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    tagContainer: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    tagText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bottomContent: {
        // Wrapper for title/address
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 6,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    addressText: {
        fontSize: 13,
        color: '#F3F4F6',
        fontWeight: '500',
    },
});
