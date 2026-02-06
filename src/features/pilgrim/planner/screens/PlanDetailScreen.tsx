import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { useSites } from '../../../../hooks/useSites';
import pilgrimPlannerApi from '../../../../services/api/pilgrim/plannerApi';
import { PlanEntity, PlanItem } from '../../../../types/pilgrim/planner.types';

const PlanDetailScreen = ({ route, navigation }: any) => {
    const { planId } = route.params;
    const insets = useSafeAreaInsets();
    const [plan, setPlan] = useState<PlanEntity | null>(null);
    const [loading, setLoading] = useState(true);

    // Add Item State
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const { sites, isLoading: isLoadingSites, fetchSites } = useSites();
    const [addingItem, setAddingItem] = useState(false);

    useEffect(() => {
        loadPlan();
    }, [planId]);

    useEffect(() => {
        if (isAddModalVisible) {
            fetchSites({ limit: 20 });
        }
    }, [isAddModalVisible]);

    const loadPlan = async () => {
        try {
            setLoading(true);
            const response = await pilgrimPlannerApi.getPlanDetail(planId);
            if (response.success && response.data) {
                setPlan(response.data);
            } else {
                Alert.alert('Error', response.message || 'Could not load plan details');
            }
        } catch (error) {
            console.error('Load plan detail error:', error);
            Alert.alert('Error', 'Failed to load plan details');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePlan = () => {
        Alert.alert(
            'Delete Plan',
            'Are you sure you want to delete this plan? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await pilgrimPlannerApi.deletePlan(planId);
                            if (response.success) {
                                navigation.goBack();
                            } else {
                                Alert.alert('Error', response.message || 'Failed to delete plan');
                            }
                        } catch (error) {
                            console.error('Delete plan error:', error);
                            Alert.alert('Error', 'Failed to delete plan');
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteItem = (itemId: string) => {
        Alert.alert(
            'Remove Item',
            'Are you sure you want to remove this destination?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Optimistic update could be done here, but reloading is safer for sync
                            const response = await pilgrimPlannerApi.deletePlanItem(planId, itemId);
                            if (response.success) {
                                loadPlan(); // Reload to refresh
                            } else {
                                Alert.alert('Error', response.message || 'Failed to remove item');
                            }
                        } catch (error: any) {
                            console.error('Delete item error:', error);
                            Alert.alert('Error', error.message || 'Failed to remove item');
                        }
                    }
                }
            ]
        );
    };

    const openAddModal = (day: number) => {
        setSelectedDay(day);
        setIsAddModalVisible(true);
    };

    const handleAddItem = async (siteId: string) => {
        try {
            setAddingItem(true);
            const response = await pilgrimPlannerApi.addPlanItem(planId, {
                site_id: siteId,
                day_number: selectedDay,
                note: 'Visited', // Default note or let user input later
            });

            if (response.success) {
                setIsAddModalVisible(false);
                loadPlan();
            } else {
                Alert.alert('Error', response.message || 'Failed to add item');
            }
        } catch (error: any) {
            console.error('Add item error:', error);
            Alert.alert('Error', error.message || 'Failed to add item');
        } finally {
            setAddingItem(false);
        }
    };


    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    if (!plan) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Text style={styles.errorText}>Plan not found</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Sort days
    const sortedDays = plan.items_by_day
        ? Object.keys(plan.items_by_day).sort((a, b) => Number(a) - Number(b))
        : [];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Header Image Background */}
            <View style={styles.headerImageContainer}>
                <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1548625361-e88c60eb83fe' }} // Placeholder
                    style={styles.headerImage}
                />
                <View style={styles.headerOverlay} />

                {/* Navbar */}
                <View style={[styles.navbar, { marginTop: insets.top }]}>
                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.navActions}>
                        <TouchableOpacity style={styles.navButton} onPress={handleDeletePlan}>
                            <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navButton}>
                            <Ionicons name="create-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Title & Info */}
                <View style={styles.headerContent}>
                    <View style={styles.badgeContainer}>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{plan.status || 'Planned'}</Text>
                        </View>
                        {plan.is_public && (
                            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Ionicons name="globe-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={styles.statusText}>Public</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.title}>{plan.name}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.metaText}>{new Date(plan.start_date).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.metaText}>{plan.number_of_days} Days</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                            <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.metaText}>{plan.number_of_people} People</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Itinerary Section */}
                <Text style={styles.sectionTitle}>Itinerary</Text>

                {sortedDays.length > 0 ? (
                    sortedDays.map((dayKey) => {
                        const items = plan.items_by_day![dayKey];
                        return (
                            <View key={dayKey} style={styles.dayContainer}>
                                <View style={styles.dayHeader}>
                                    <View style={styles.dayNumberContainer}>
                                        <Text style={styles.dayNumber}>Day {dayKey}</Text>
                                    </View>
                                    <View style={styles.dayLine} />
                                </View>

                                <View style={styles.timelineContainer}>
                                    <View style={styles.timelineLine} />
                                    <View style={styles.timelineItems}>
                                        {items.map((item: PlanItem, index) => (
                                            <TouchableOpacity
                                                key={item.id || index}
                                                style={styles.timelineItem}
                                                onLongPress={() => handleDeleteItem(item.id)}
                                                delayLongPress={500}
                                            >
                                                <View style={styles.timelineDot} />
                                                <View style={styles.itemCard}>
                                                    <Image
                                                        source={{ uri: item.site.image || 'https://via.placeholder.com/100' }}
                                                        style={styles.itemImage}
                                                    />
                                                    <View style={styles.itemContent}>
                                                        <Text style={styles.itemName}>{item.site.name}</Text>
                                                        {item.site.address && (
                                                            <Text style={styles.itemAddress} numberOfLines={1}>
                                                                {item.site.address}
                                                            </Text>
                                                        )}
                                                        <View style={styles.itemFooter}>
                                                            {item.arrival_time && (
                                                                <Text style={styles.itemTime}>
                                                                    <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} /> {item.arrival_time}
                                                                </Text>
                                                            )}
                                                            {item.note && (
                                                                <Text style={styles.itemNote} numberOfLines={1}>
                                                                    {item.note}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                    <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={{ padding: 4 }}>
                                                        <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
                                                    </TouchableOpacity>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity style={styles.addSmallButton} onPress={() => openAddModal(Number(dayKey))}>
                                            <Ionicons name="add" size={16} color={COLORS.primary} />
                                            <Text style={styles.addSmallButtonText}>Add Stop</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="edit-road" size={48} color={COLORS.textTertiary} />
                        <Text style={styles.emptyStateText}>No items added to this plan yet.</Text>
                        <TouchableOpacity style={styles.addItemsButton} onPress={() => openAddModal(1)}>
                            <Text style={styles.addItemsButtonText}>Add Destination to Day 1</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add Site Modal */}
            <Modal
                visible={isAddModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsAddModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Destination</Text>
                        <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                            <Text style={styles.modalClose}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    {isLoadingSites ? (
                        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={sites}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.siteItem}
                                    onPress={() => handleAddItem(item.id)}
                                    disabled={addingItem}
                                >
                                    <Image source={{ uri: item.coverImage || 'https://via.placeholder.com/60' }} style={styles.siteItemImage} />
                                    <View style={styles.siteItemContent}>
                                        <Text style={styles.siteItemName}>{item.name}</Text>
                                        <Text style={styles.siteItemAddress} numberOfLines={1}>{item.address}</Text>
                                    </View>
                                    <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    backButton: {
        padding: SPACING.sm,
    },
    backButtonText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    headerImageContainer: {
        height: 300,
        width: '100%',
        position: 'relative',
    },
    headerImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    navbar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        zIndex: 10,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    navActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    headerContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    badgeContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.accent, // Yellow
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamily.display,
        marginBottom: SPACING.sm,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '500',
    },
    metaDivider: {
        width: 1,
        height: 14,
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: SPACING.md,
    },
    content: {
        flex: 1,
        marginTop: -20, // Overlap header
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    dayContainer: {
        marginBottom: SPACING.lg,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    dayNumberContainer: {
        backgroundColor: COLORS.primary, // Dark
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.md,
        marginRight: SPACING.sm,
    },
    dayNumber: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    dayLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    timelineContainer: {
        paddingHorizontal: SPACING.lg,
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: 36, // Adjust based on layout
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: COLORS.border,
    },
    timelineItems: {
        gap: SPACING.md,
        paddingLeft: 12, // Space for line
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.white,
        borderWidth: 2,
        borderColor: COLORS.primary,
        position: 'absolute',
        left: -19, // Center on line
        zIndex: 1,
    },
    itemCard: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm,
        marginLeft: 12,
        ...SHADOWS.small,
        alignItems: 'center',
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.backgroundSoft,
    },
    itemContent: {
        flex: 1,
        paddingHorizontal: SPACING.sm,
        justifyContent: 'center',
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    itemAddress: {
        fontSize: 12,
        color: COLORS.textTertiary,
        marginBottom: 4,
    },
    itemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemTime: {
        fontSize: 11,
        fontWeight: '500',
        color: COLORS.primary,
    },
    itemNote: {
        fontSize: 11,
        color: COLORS.textTertiary,
        fontStyle: 'italic',
        maxWidth: 100,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        gap: SPACING.sm,
    },
    emptyStateText: {
        color: COLORS.textTertiary,
        fontSize: 14,
    },
    addItemsButton: {
        marginTop: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.accent,
    },
    addItemsButtonText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    addSmallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginLeft: 40,
        gap: 4,
    },
    addSmallButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    modalClose: {
        fontSize: 16,
        color: COLORS.primary,
    },
    siteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        marginBottom: 12,
        ...SHADOWS.small,
    },
    siteItemImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: COLORS.backgroundSoft,
    },
    siteItemContent: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    siteItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    siteItemAddress: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
});

export default PlanDetailScreen;
