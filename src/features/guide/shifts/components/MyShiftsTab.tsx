
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';
import { GUIDE_KEYS } from '../../../../constants/queryKeys';
import { deleteShiftSubmission, getShiftSubmissions } from '../../../../services/api/guide';
import { ShiftSubmission } from '../../../../types/guide/shiftSubmission.types';
import { MyShiftCard } from './MyShiftCard';
import { ShiftSubmissionDetailModal } from './ShiftSubmissionDetailModal';

export const MyShiftsTab: React.FC = () => {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'history'>('all');
    const [selectedSubmission, setSelectedSubmission] = useState<ShiftSubmission | null>(null);

    const { data: response, isLoading, refetch } = useQuery({
        queryKey: GUIDE_KEYS.shiftSubmissions.all,
        queryFn: () => getShiftSubmissions(),
    });

    useFocusEffect(
        useCallback(() => {
            // Refetch data when screen comes into focus
            refetch();
        }, [refetch])
    );

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteShiftSubmission(id),
        onSuccess: () => {
            Alert.alert("Thành công", "Đã hủy đăng ký ca trực.");
            queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.shiftSubmissions.all });
            setSelectedSubmission(null);
        },
        onError: (error: any) => {
            Alert.alert("Lỗi", error?.message || "Không thể hủy đăng ký.");
        }
    });

    const handleCancel = (id: string) => {
        Alert.alert(
            "Xác nhận hủy",
            "Bạn có chắc chắn muốn hủy đăng ký này?",
            [
                { text: "Không", style: "cancel" },
                { text: "Hủy đăng ký", style: "destructive", onPress: () => deleteMutation.mutate(id) }
            ]
        );
    };

    const submissions = response?.data || [];

    // Client-side filtering logic
    const filteredList = React.useMemo(() => {
        const today = new Date();
        // Reset time to start of day for accurate comparison
        today.setHours(0, 0, 0, 0);

        return submissions.filter(submission => {
            const weekStart = new Date(submission.week_start_date);

            // "History": Submissions with week_start_date before today (past weeks)
            const isPast = weekStart < today;

            if (filter === 'all') return true;

            if (filter === 'history') {
                // Includes past approved/completed or any rejected/cancelled
                return isPast || submission.status === 'rejected' || submission.status === 'completed';
            }

            if (filter === 'approved') {
                // "Upcoming" -> Approved and not in the past
                return submission.status === 'approved' && !isPast;
            }

            if (filter === 'pending') {
                return submission.status === 'pending';
            }

            return true;
        });
    }, [submissions, filter]);

    const renderFilterChip = (key: typeof filter, label: string) => (
        <TouchableOpacity
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
            onPress={() => setFilter(key)}
            activeOpacity={0.7}
        >
            <Text style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContainer}
                    style={{ flexGrow: 0 }}
                >
                    {renderFilterChip('all', 'Tất cả')}
                    {renderFilterChip('pending', 'Chờ duyệt')}
                    {renderFilterChip('approved', 'Sắp diễn ra')}
                    {renderFilterChip('history', 'Lịch sử')}
                </ScrollView>
            </View>

            {isLoading ? (
                <ActivityIndicator size="large" color={GUIDE_COLORS.primary} style={{ marginTop: 40 }} />
            ) : filteredList.length > 0 ? (
                <FlatList
                    data={filteredList}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <MyShiftCard
                            submission={item}
                            onCancel={handleCancel}
                            onPress={setSelectedSubmission}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={isLoading}
                    onRefresh={refetch}
                />
            ) : (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconBg}>
                        <MaterialIcons name="assignment" size={48} color={GUIDE_COLORS.primary} />
                    </View>
                    <Text style={styles.emptyText}>Chưa có đăng ký nào</Text>
                    <Text style={styles.emptySubText}>
                        {filter === 'all'
                            ? "Bạn chưa đăng ký ca trực nào."
                            : "Không tìm thấy đăng ký nào theo bộ lọc này."}
                    </Text>
                </View>
            )}

            <ShiftSubmissionDetailModal
                visible={!!selectedSubmission}
                submission={selectedSubmission}
                onClose={() => setSelectedSubmission(null)}
                onCancel={(id) => {
                    handleCancel(id);
                    setSelectedSubmission(null);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GUIDE_COLORS.background,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingVertical: GUIDE_SPACING.md,
        gap: GUIDE_SPACING.sm,
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 24,
        backgroundColor: GUIDE_COLORS.surface,
        borderWidth: 1,
        borderColor: 'transparent',
        ...GUIDE_SHADOWS.sm,
    },
    filterChipActive: {
        backgroundColor: GUIDE_COLORS.primary,
        transform: [{ scale: 1.05 }],
    },
    filterChipText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: GUIDE_COLORS.textDark, // Dark text on Yellow/Gold
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingBottom: 80,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: GUIDE_COLORS.primaryLight + '40', // 40% opacity
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: GUIDE_SPACING.lg,
    },
    emptyText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    }
});
