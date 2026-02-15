
import React, { useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_COLORS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';
import { AvailableShiftsTab } from '../components/AvailableShiftsTab';
import { MyShiftsTab } from '../components/MyShiftsTab';

export const ShiftsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'find' | 'my'>('find');

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={GUIDE_COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Lịch làm việc</Text>
            </View>

            {/* Segmented Control */}
            <View style={styles.segmentContainer}>
                <View style={styles.segmentWrapper}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === 'find' && styles.segmentBtnActive]}
                        onPress={() => setActiveTab('find')}
                        activeOpacity={0.9}
                    >
                        <Text style={[styles.segmentText, activeTab === 'find' && styles.segmentTextActive]}>
                            Lịch toàn Site
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === 'my' && styles.segmentBtnActive]}
                        onPress={() => setActiveTab('my')}
                        activeOpacity={0.9}
                    >
                        <Text style={[styles.segmentText, activeTab === 'my' && styles.segmentTextActive]}>
                            Đăng ký của tôi
                        </Text>
                    </TouchableOpacity>
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
        backgroundColor: GUIDE_COLORS.background,
    },
    header: {
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingBottom: GUIDE_SPACING.sm,
        paddingTop: GUIDE_SPACING.sm,
        backgroundColor: GUIDE_COLORS.background,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800', // Extra bold for impact
        color: GUIDE_COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    segmentContainer: {
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingBottom: GUIDE_SPACING.md,
    },
    segmentWrapper: {
        flexDirection: 'row',
        backgroundColor: GUIDE_COLORS.gray100, // Light gray track
        borderRadius: 12,
        padding: 4,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentBtnActive: {
        backgroundColor: GUIDE_COLORS.surface, // White card effect
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
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
