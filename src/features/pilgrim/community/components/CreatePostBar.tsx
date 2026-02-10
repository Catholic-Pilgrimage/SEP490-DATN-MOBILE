import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';

interface CreatePostBarProps {
    avatar?: string | null;
    name?: string;
    onPress: () => void;
}

const getInitials = (name?: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const CreatePostBar: React.FC<CreatePostBarProps> = ({ avatar, name, onPress }) => {
    return (
        <View style={styles.container}>
            <View style={styles.row}>
                {avatar ? (
                    <Image
                        source={{ uri: avatar }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatar, styles.initialsContainer]}>
                        <Text style={styles.initialsText}>{getInitials(name)}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.inputContainer}
                    onPress={onPress}
                    activeOpacity={0.7}
                >
                    <Text style={styles.placeholderText}>Chia sẻ ơn phước hoặc lời cầu nguyện...</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="images-outline" size={24} color={COLORS.accent} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.md,
        paddingVertical: 12,
        borderRadius: BORDER_RADIUS.lg,
        ...SHADOWS.subtle,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: COLORS.surface0,
    },
    initialsContainer: {
        backgroundColor: COLORS.primary, // Or any brand color
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: COLORS.borderLight,
    },
    initialsText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputContainer: {
        flex: 1,
        height: 44,
        backgroundColor: COLORS.surface0,
        borderRadius: 22,
        justifyContent: 'center',
        paddingHorizontal: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    placeholderText: {
        color: COLORS.textSecondary,
        fontSize: TYPOGRAPHY.fontSize.md,
        fontStyle: 'italic',
    },
    iconButton: {
        padding: SPACING.xs,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
