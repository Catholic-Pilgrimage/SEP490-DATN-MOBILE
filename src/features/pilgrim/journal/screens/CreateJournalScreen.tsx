import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS, SPACING } from '../../../../constants/theme.constants';
import pilgrimJournalApi from '../../../../services/api/pilgrim/journalApi';
import pilgrimPlannerApi from '../../../../services/api/pilgrim/plannerApi';
import { PlanItem } from '../../../../types/pilgrim/planner.types';

const { width } = Dimensions.get('window');
const FontDisplay = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export default function CreateJournalScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { journalId, plannerItemId: paramPlannerItemId } = route.params || {};
    const insets = useSafeAreaInsets();

    // State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [existingImages, setExistingImages] = useState<string[]>([]);

    // Planner Item Logic
    const [selectedPlannerItemId, setSelectedPlannerItemId] = useState<string | null>(paramPlannerItemId || null);
    const [recentPlanItems, setRecentPlanItems] = useState<PlanItem[]>([]);

    useEffect(() => {
        fetchRecentPlanItems();
        if (journalId) fetchJournalDetails();
    }, [journalId]);

    const fetchRecentPlanItems = async () => {
        try {
            const response = await pilgrimPlannerApi.getPlans();
            if (response.data && response.data.planners) {
                const items: PlanItem[] = [];
                response.data.planners.forEach(plan => {
                    if (plan.items_by_day) {
                        Object.values(plan.items_by_day).forEach((dayItems: PlanItem[]) => {
                            if (Array.isArray(dayItems)) items.push(...dayItems);
                        });
                    }
                });
                setRecentPlanItems(items.slice(0, 10)); // Top 10 recent

                if (paramPlannerItemId) {
                    const found = items.find(i => i.id === paramPlannerItemId);
                    if (found && found.site) setLocation(found.site.name);
                }
            }
        } catch (error) {
            console.error("Failed to fetch plan items", error);
        }
    };

    const handleSelectLocation = (item: PlanItem) => {
        setLocation(item.site.name);
        setSelectedPlannerItemId(item.id);
    };

    const fetchJournalDetails = async () => {
        try {
            setInitialLoading(true);
            const response = await pilgrimJournalApi.getJournalDetail(journalId);
            if (response.success && response.data) {
                const data = response.data;
                setTitle(data.title);
                setContent(data.content);
                if (data.site) {
                    setLocation(data.site.name);
                }
                if (data.image_url) {
                    setExistingImages(data.image_url);
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load journal details');
            navigation.goBack();
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSave = async (privacy: 'private' | 'public') => {
        if (!title.trim() || !content.trim()) {
            Alert.alert('Missing Information', 'Please enter a title and content');
            return;
        }

        // Validate Planner Item ID for creation (Backend requirement)
        if (!journalId && !selectedPlannerItemId) {
            Alert.alert('Yêu cầu địa điểm', 'Vui lòng chọn một địa điểm từ kế hoạch của bạn để viết nhật ký.');
            return;
        }

        setLoading(true);
        try {
            if (journalId) {
                // UPDATE
                await pilgrimJournalApi.updateJournal(journalId, {
                    title,
                    content,
                    privacy,
                    // images: newImages // If we had image picker
                });
                Alert.alert("Success", "Journal updated successfully");
            } else {
                // CREATE
                const createData: any = {
                    title,
                    content,
                    privacy,
                };
                if (selectedPlannerItemId) {
                    createData.planner_item_id = selectedPlannerItemId;
                }

                await pilgrimJournalApi.createJournal(createData);
                Alert.alert("Success", "Journal created successfully");
            }
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error?.message || "Failed to save journal");
        } finally {
            setLoading(false);
        }
    };

    // Mock images for UI if empty
    const displayImages = existingImages.length > 0 ? existingImages.map(uri => ({ id: uri, uri })) : [];

    if (initialLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar barStyle="dark-content" />
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 0) }]}>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{journalId ? 'Cập nhật nhật ký' : 'Viết nhật ký tâm linh'}</Text>

                <TouchableOpacity style={styles.iconButton}>
                    <MaterialIcons name="bookmark-border" size={24} color={COLORS.accent} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.contentJSON, { paddingBottom: 150 }]} // Padding for footer
                    showsVerticalScrollIndicator={false}
                >
                    {/* Location Section */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Địa điểm hành hương</Text>
                        <TouchableOpacity style={styles.locationInput}>
                            <MaterialIcons name="location-on" size={20} color={COLORS.textSecondary} style={styles.locationIcon} />
                            <Text style={[styles.locationPlaceholder, location ? { color: COLORS.textPrimary } : {}]}>
                                {location || "Chọn từ kế hoạch của bạn"}
                            </Text>
                            <MaterialIcons name="expand-more" size={24} color={COLORS.textSecondary} style={styles.chevronIcon} />
                        </TouchableOpacity>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                            {recentPlanItems.length > 0 ? (
                                recentPlanItems.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.chip,
                                            selectedPlannerItemId === item.id && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }
                                        ]}
                                        onPress={() => handleSelectLocation(item)}
                                    >
                                        <MaterialIcons
                                            name="history"
                                            size={16}
                                            color={selectedPlannerItemId === item.id ? COLORS.white : COLORS.textSecondary}
                                        />
                                        <Text style={[
                                            styles.chipText,
                                            selectedPlannerItemId === item.id && { color: COLORS.white }
                                        ]}>
                                            {item.site.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={{ color: COLORS.textSecondary, fontStyle: 'italic', padding: 10 }}>
                                    Không có địa điểm nào trong kế hoạch gần đây
                                </Text>
                            )}
                        </ScrollView>
                    </View>

                    {/* Reflection Editor */}
                    <View style={styles.editorContainer}>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Tiêu đề suy niệm..."
                            placeholderTextColor="rgba(138, 128, 96, 0.5)"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <View style={styles.divider} />

                        <View style={styles.toolbar}>
                            <View style={styles.toolbarGroup}>
                                <TouchableOpacity style={styles.toolbarBtn}>
                                    <MaterialIcons name="format-bold" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.toolbarBtn}>
                                    <MaterialIcons name="format-italic" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.toolbarBtn}>
                                    <MaterialIcons name="format-list-bulleted" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.toolbarDivider} />

                            <TouchableOpacity style={[styles.toolbarBtn, styles.micBtnMini]}>
                                <MaterialIcons name="mic" size={20} color={COLORS.accent} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.toolbarBtn, { marginLeft: 'auto' }]}>
                                <MaterialIcons name="add-photo-alternate" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.multilineInput}
                            placeholder="Bạn cảm nhận gì trong giây phút này..."
                            placeholderTextColor="rgba(138, 128, 96, 0.4)"
                            multiline
                            textAlignVertical="top"
                            value={content}
                            onChangeText={setContent}
                        />
                    </View>

                    {/* Media Strip */}
                    <View style={styles.section}>
                        <View style={styles.mediaHeader}>
                            <Text style={styles.label}>Hình ảnh & Video</Text>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Xem tất cả</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                            <TouchableOpacity style={styles.addMediaBtn}>
                                <MaterialIcons name="add-circle" size={24} color={COLORS.accent} />
                                <Text style={styles.addMediaText}>Thêm</Text>
                            </TouchableOpacity>

                            {displayImages.map((img, index) => (
                                <View key={index} style={styles.mediaItem}>
                                    <Image source={{ uri: img.uri }} style={styles.mediaImage} />
                                    <TouchableOpacity style={styles.removeMediaBtn}>
                                        <MaterialIcons name="close" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Floating Mic Button */}
            <View style={styles.floatingMicContainer} pointerEvents="box-none">
                <TouchableOpacity style={styles.floatingMicBtn} activeOpacity={0.9}>
                    <MaterialIcons name="mic" size={32} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Fixed Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.footerContent}>
                    <TouchableOpacity
                        style={styles.btnSecondary}
                        onPress={() => handleSave('private')}
                        disabled={loading}
                    >
                        <Text style={styles.btnSecondaryText}>{loading ? "Đang lưu..." : "Lưu riêng tư"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={() => handleSave('public')}
                        disabled={loading}
                    >
                        <Text style={styles.btnPrimaryText}>{loading ? "Đang đăng..." : "Đăng công khai"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background, // Cream/beige from theme
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: 'rgba(253, 251, 247, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.02)',
        zIndex: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        fontFamily: FontDisplay,
        letterSpacing: -0.5,
    },
    contentJSON: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
    },
    section: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginLeft: 4,
    },
    locationInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface0,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        ...SHADOWS.subtle,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    locationIcon: {
        marginRight: 12,
    },
    locationPlaceholder: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    chevronIcon: {
        marginLeft: 12,
    },
    chipContainer: {
        marginTop: 12,
        paddingVertical: 4, // for shadow clipping
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface0,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 99,
        marginRight: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: 'transparent',
        ...SHADOWS.subtle,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    editorContainer: {
        backgroundColor: COLORS.surface0,
        borderRadius: 24,
        padding: 4,
        ...SHADOWS.subtle,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        marginBottom: SPACING.lg,
    },
    titleInput: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
        fontFamily: FontDisplay,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 20,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    toolbarGroup: {
        flexDirection: 'row',
        gap: 4,
    },
    toolbarBtn: {
        padding: 8,
        borderRadius: 8,
    },
    micBtnMini: {
        backgroundColor: 'rgba(236, 182, 19, 0.1)',
    },
    toolbarDivider: {
        width: 1,
        height: 16,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    multilineInput: {
        fontSize: 18,
        lineHeight: 28,
        color: COLORS.textPrimary,
        padding: 20,
        minHeight: 240,
        fontFamily: FontDisplay,
    },
    mediaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    linkText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.accent,
    },
    mediaRow: {
        gap: 12,
        paddingTop: 8,
        paddingBottom: 8,
    },
    addMediaBtn: {
        width: 96,
        height: 96,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'rgba(236, 182, 19, 0.4)',
        borderStyle: 'dashed',
        backgroundColor: 'rgba(236, 182, 19, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    addMediaText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.accent,
    },
    mediaItem: {
        width: 96,
        height: 96,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        ...SHADOWS.small,
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeMediaBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',

    },
    floatingMicContainer: {
        position: 'absolute',
        bottom: 110, // Adjusted to sit above footer
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 40,
    },
    floatingMicBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        shadowColor: COLORS.accent,
        shadowOpacity: 0.4,
        borderWidth: 4,
        borderColor: COLORS.surface0,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 16,
        paddingHorizontal: 16,
    },
    footerContent: {
        flexDirection: 'row',
        gap: 16,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    btnSecondary: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    btnSecondaryText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.accent,
    },
    btnPrimary: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.subtle,
    },
    btnPrimaryText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary, // Or White depending on contrast, Mockup has dark text
    },
});
