import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';
import { SACRED_COLORS, SACRED_SHADOWS, SACRED_TYPOGRAPHY } from '../constants/sacred-theme.constants';
import { COLORS } from '../constants/theme.constants';

// Add margin top for SafeArea on iOS/Android if placed near top
export const toastConfig = {
    success: (props: BaseToastProps) => (
        <View style={[styles.container, styles.successContainer]}>
            <View style={[styles.iconContainer, styles.successIconContainer]}>
                <Ionicons name="checkmark-circle" size={26} color={SACRED_COLORS.gold || '#D4AF37'} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{props.text1}</Text>
                {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
            </View>
        </View>
    ),

    error: (props: BaseToastProps) => (
        <View style={[styles.container, styles.errorContainer]}>
            <View style={[styles.iconContainer, styles.errorIconContainer]}>
                <Ionicons name="alert-circle" size={26} color={SACRED_COLORS.danger} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{props.text1 || 'Lỗi'}</Text>
                {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
            </View>
        </View>
    ),

    info: (props: BaseToastProps) => (
        <View style={[styles.container, styles.infoContainer]}>
            <View style={[styles.iconContainer, styles.infoIconContainer]}>
                <Ionicons name="information-circle" size={26} color={SACRED_COLORS.gold} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{props.text1}</Text>
                {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
            </View>
        </View>
    ),
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '90%',
        backgroundColor: '#FFFFFF',
        borderRadius: 100, // Pill shape
        paddingVertical: 10,
        paddingHorizontal: 16,
        ...SACRED_SHADOWS.elevated, // Increased shadow for premium look
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: SACRED_TYPOGRAPHY.fontSize.title,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 0,
    },
    message: {
        fontSize: SACRED_TYPOGRAPHY.fontSize.body,
        fontWeight: '400',
        color: COLORS.textSecondary,
    },

    /* Success Variant */
    successContainer: {
        borderWidth: 1,
        borderColor: '#E8F0EB', // Subtle border
    },
    successIconContainer: {
        backgroundColor: 'transparent', // Let icon provide color
    },

    /* Error Variant */
    errorContainer: {
        borderWidth: 1,
        borderColor: '#F5EBEB',
    },
    errorIconContainer: {
        backgroundColor: 'transparent',
    },

    /* Info Variant */
    infoContainer: {
        borderWidth: 1,
        borderColor: '#F5F0E8',
    },
    infoIconContainer: {
        backgroundColor: 'transparent',
    },
});
