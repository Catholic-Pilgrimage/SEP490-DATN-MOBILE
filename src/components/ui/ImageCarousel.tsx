import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    View,
    ViewToken,
} from 'react-native';
import { COLORS } from '../../constants/theme.constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCarouselProps {
    images: string[];
    height?: number;
    showGradient?: boolean;
    gradientColors?: string[];
    showPagination?: boolean;
    activeColor?: string;
    inactiveColor?: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
    images,
    height = 400,
    showGradient = true,
    gradientColors = ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)'],
    showPagination = true,
    activeColor = COLORS.accent,
    inactiveColor = 'rgba(255,255,255,0.5)',
}) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0 && viewableItems[0].index !== null) {
                setActiveIndex(viewableItems[0].index);
            }
        }
    ).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const renderImage = ({ item }: { item: string }) => (
        <View style={[styles.imageContainer, { width: SCREEN_WIDTH, height }]}>
            <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="cover"
            />
        </View>
    );

    return (
        <View style={[styles.container, { height }]}>
            <FlatList
                ref={flatListRef}
                data={images}
                renderItem={renderImage}
                keyExtractor={(item, index) => `carousel-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                bounces={false}
            />

            {/* Gradient Overlay */}
            {showGradient && (
                <LinearGradient
                    colors={gradientColors as [string, string, ...string[]]}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                />
            )}

            {/* Pagination Dots */}
            {showPagination && images.length > 1 && (
                <View style={styles.pagination}>
                    {images.map((_, index) => (
                        <View
                            key={`dot-${index}`}
                            style={[
                                styles.dot,
                                index === activeIndex
                                    ? [styles.activeDot, { backgroundColor: activeColor }]
                                    : { backgroundColor: inactiveColor },
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: '100%',
    },
    imageContainer: {
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    activeDot: {
        width: 24,
        height: 6,
        borderRadius: 3,
    },
});

export default ImageCarousel;
