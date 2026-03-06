/**
 * GuestLoginModal - Reusable premium login prompt modal for guest users
 * Shows a beautiful card with lock icon, title, subtitle and login button
 * Features spring bounce animation on open/close
 */
import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback
} from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme.constants';
import { useAuth } from '../../contexts/AuthContext';

interface GuestLoginModalProps {
    visible: boolean;
    onClose: () => void;
    /** Optional custom message override */
    message?: string;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({
    visible,
    onClose,
    message,
}) => {
    const { t } = useTranslation();
    const { exitGuestMode } = useAuth();
    const navigation = useNavigation<any>();

    // Animation values
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const cardScale = useRef(new Animated.Value(0.3)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const cardTranslateY = useRef(new Animated.Value(80)).current;
    const iconPulse = useRef(new Animated.Value(1)).current;
    const cardFloat = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset first
            overlayOpacity.setValue(0);
            cardScale.setValue(0.3);
            cardOpacity.setValue(0);
            cardTranslateY.setValue(80);
            iconPulse.setValue(1);
            cardFloat.setValue(0);

            // Animate IN: overlay fades, card springs up with bounce
            Animated.parallel([
                Animated.timing(overlayOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(cardScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 65,
                    useNativeDriver: true,
                }),
                Animated.timing(cardOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(cardTranslateY, {
                    toValue: 0,
                    friction: 5,
                    tension: 60,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // After entry: pulse icon + float card
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(iconPulse, {
                            toValue: 1.15,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(iconPulse, {
                            toValue: 1,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();

                Animated.loop(
                    Animated.sequence([
                        Animated.timing(cardFloat, {
                            toValue: -6,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(cardFloat, {
                            toValue: 6,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            });
        }
    }, [visible]);

    const handleClose = () => {
        // Animate OUT then close
        Animated.parallel([
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(cardScale, {
                toValue: 0.3,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(cardTranslateY, {
                toValue: 80,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const handleLogin = async () => {
        handleClose();
        // Small delay so animation finishes before navigating
        setTimeout(async () => {
            await exitGuestMode();
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Auth' }],
                })
            );
        }, 250);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.card,
                                {
                                    opacity: cardOpacity,
                                    transform: [
                                        { scale: cardScale },
                                        { translateY: Animated.add(cardTranslateY, cardFloat) },
                                    ],
                                },
                            ]}
                        >
                            {/* Close button */}
                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={handleClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MaterialIcons name="close" size={20} color="#9CA3AF" />
                            </TouchableOpacity>

                            {/* Lock icon - pulsing */}
                            <Animated.View style={[styles.iconCircle, { transform: [{ scale: iconPulse }] }]}>
                                <MaterialIcons name="lock-outline" size={32} color={COLORS.accent} />
                            </Animated.View>

                            {/* Title */}
                            <Text style={styles.title}>
                                {t('profile.loginRequired')}
                            </Text>

                            {/* Subtitle */}
                            <Text style={styles.subtitle}>
                                {message || t('profile.loginRequiredMessage')}
                            </Text>

                            {/* Login button */}
                            <TouchableOpacity
                                style={styles.loginBtn}
                                onPress={handleLogin}
                                activeOpacity={0.8}
                            >
                                <MaterialIcons name="login" size={20} color={COLORS.white} />
                                <Text style={styles.loginBtnText}>
                                    {t('profile.loginRegister', { defaultValue: 'Đăng nhập / Đăng ký' })}
                                </Text>
                            </TouchableOpacity>

                            {/* Cancel link */}
                            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>
                                    {t('profile.loginLater', { defaultValue: 'Để sau' })}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    card: {
        width: '100%',
        backgroundColor: COLORS.backgroundCard,
        borderRadius: BORDER_RADIUS.xl,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.large,
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: `${COLORS.accentLight}40`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        borderWidth: 2,
        borderColor: `${COLORS.accent}30`,
    },
    title: {
        fontSize: TYPOGRAPHY.fontSize.xxl,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.lg,
        paddingHorizontal: SPACING.sm,
    },
    loginBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D4AF37',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: BORDER_RADIUS.lg,
        gap: SPACING.sm,
        width: '100%',
        ...SHADOWS.medium,
    },
    loginBtnText: {
        color: COLORS.white,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        fontSize: TYPOGRAPHY.fontSize.lg,
    },
    cancelBtn: {
        marginTop: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    cancelText: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.textTertiary,
    },
});

export default GuestLoginModal;
