import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';

type PlaceType =
    | 'hotel'
    | 'restaurant'
    | 'church'
    | 'medical'
    | 'food'
    | 'lodging'
    | 'media'
    | 'other';

interface NearbyPlaceCardProps {
    name: string;
    distance: string;
    type: PlaceType;
    address?: string;
    onDirections?: () => void;
}

const normalizeType = (type: PlaceType) => {
    switch (type) {
        case 'food':
        case 'restaurant':
            return 'restaurant' as const;
        case 'lodging':
        case 'hotel':
            return 'hotel' as const;
        case 'media':
        case 'church':
        case 'medical':
            return 'media' as const;
        default:
            return 'other' as const;
    }
};

export const NearbyPlaceCard: React.FC<NearbyPlaceCardProps> = ({
    name,
    distance,
    type,
    address,
    onDirections,
}) => {
    const normalizedType = normalizeType(type);

    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                <View style={styles.iconContainer}>
                    {normalizedType === 'restaurant' ? (
                        <Ionicons name="restaurant" size={20} color={COLORS.textSecondary} />
                    ) : normalizedType === 'hotel' ? (
                        <FontAwesome5 name="hotel" size={18} color={COLORS.textSecondary} />
                    ) : normalizedType === 'media' ? (
                        <MaterialIcons name="perm-media" size={20} color={COLORS.textSecondary} />
                    ) : (
                        <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{name}</Text>
                    {address && <Text style={styles.address} numberOfLines={1}>{address}</Text>}
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
    address: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.textSecondary,
        maxWidth: 200,
    },
    distance: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.accent,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        marginTop: 2,
    },
    directionsButton: {
        backgroundColor: 'rgba(201, 165, 114, 0.2)',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
    },
});

export default NearbyPlaceCard;
