import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';

type PlaceType = 'hotel' | 'restaurant' | 'church' | 'medical' | 'other';

interface NearbyPlaceCardProps {
    name: string;
    distance: string;
    type: PlaceType;
    onDirections?: () => void;
}

const getIconForType = (type: PlaceType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
        case 'hotel':
            return 'bed-outline';
        case 'restaurant':
            return 'restaurant-outline';
        case 'church':
            return 'business-outline';
        case 'medical':
            return 'medkit-outline';
        default:
            return 'location-outline';
    }
};

export const NearbyPlaceCard: React.FC<NearbyPlaceCardProps> = ({
    name,
    distance,
    type,
    onDirections,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={getIconForType(type)}
                        size={20}
                        color={COLORS.textSecondary}
                    />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.distance}>{distance}</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.directionsButton}
                onPress={onDirections}
                activeOpacity={0.7}
            >
                <Ionicons name="navigate" size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        gap: 2,
    },
    name: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.textPrimary,
    },
    distance: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.textSecondary,
    },
    directionsButton: {
        backgroundColor: 'rgba(201, 165, 114, 0.2)',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
    },
});

export default NearbyPlaceCard;
