
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';
import { AvailableShiftsTab } from '../components/AvailableShiftsTab';
import { MyShiftsTab } from '../components/MyShiftsTab';

const PREMIUM_COLORS = {
    cream: '#FDF8F0',
};

export const ShiftsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'find' | 'my'>('find');

    return (
        <View style={styles.container}>
            <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
                <StatusBar barStyle="dark-content" backgroundColor={PREMIUM_COLORS.cream} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>Lịch làm việc</Text>
                            <Text style={styles.headerSubtitle}>Quản lý ca trực & đăng ký</Text>
                        </View>
                        <View style={styles.headerIcon}>
                            <MaterialIcons name="calendar-today" size={22} color={GUIDE_COLORS.primary} />
                        </View>
                    </View>
                </View>

                {/* Segmented Control */}
                <View style={styles.segmentContainer}>
                    <View style={styles.segmentWrapper}>
                        <TouchableOpacity
                            style={[styles.segmentBtn, activeTab === 'find' && styles.segmentBtnActive]}
                            onPress={() => setActiveTab('find')}
                            activeOpacity={0.9}
                        >
                            <MaterialIcons
                                name="date-range"
                                size={16}
                                color={activeTab === 'find' ? GUIDE_COLORS.textPrimary : GUIDE_COLORS.textSecondary}
                            />
                            <Text style={[styles.segmentText, activeTab === 'find' && styles.segmentTextActive]}>
                                Lịch toàn Site
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.segmentBtn, activeTab === 'my' && styles.segmentBtnActive]}
                            onPress={() => setActiveTab('my')}
                            activeOpacity={0.9}
                        >
                            <MaterialIcons
                                name="assignment"
                                size={16}
                                color={activeTab === 'my' ? GUIDE_COLORS.textPrimary : GUIDE_COLORS.textSecondary}
                            />
                            <Text style={[styles.segmentText, activeTab === 'my' && styles.segmentTextActive]}>
                                Đăng ký của tôi
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {activeTab === 'find' ? <AvailableShiftsTab /> : <MyShiftsTab />}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PREMIUM_COLORS.cream,
    },
    headerWrapper: {
        backgroundColor: PREMIUM_COLORS.cream,
        paddingBottom: GUIDE_SPACING.md,
        zIndex: 10,
    },
    header: {
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingBottom: GUIDE_SPACING.sm,
        paddingTop: GUIDE_SPACING.sm,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: GUIDE_COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
        marginTop: 2,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: GUIDE_COLORS.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentContainer: {
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingTop: 4,
    },
    segmentWrapper: {
        flexDirection: 'row',
        backgroundColor: GUIDE_COLORS.gray100,
        borderRadius: 14,
        padding: 4,
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentBtnActive: {
        backgroundColor: GUIDE_COLORS.surface,
        ...GUIDE_SHADOWS.sm,
        shadowColor: GUIDE_COLORS.primary, // subtle color pop for the active shadow
        shadowOpacity: 0.1,
        elevation: 2,
    },
    segmentText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        fontWeight: '600',
        color: GUIDE_COLORS.textSecondary,
    },
    segmentTextActive: {
        color: GUIDE_COLORS.textPrimary,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    }
});
