import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';

interface EventCardProps {
    image: string;
    date: string;
    title: string;
    description: string;
    onPress?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({
    image,
    date,
    title,
    description,
    onPress,
}) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: image }}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={styles.imageOverlay} />
            </View>

            <View style={styles.content}>
                <Text style={styles.date}>{date}</Text>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <Text style={styles.description} numberOfLines={1}>{description}</Text>
            </View>

            <TouchableOpacity style={styles.chevron} onPress={onPress}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        gap: SPACING.md,
    },
    imageContainer: {
        position: 'relative',
        width: 64,
        height: 64,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(201, 165, 114, 0.2)',
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    date: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.accent,
        marginBottom: 2,
    },
    title: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.textPrimary,
    },
    description: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.textSecondary,
    },
    chevron: {
        padding: SPACING.sm,
    },
});

export default EventCard;
