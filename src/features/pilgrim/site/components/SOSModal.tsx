
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import pilgrimSOSApi from '../../../../services/api/pilgrim/sosApi';
import { CreateSOSRequest } from '../../../../types/pilgrim';
import locationService from '../../../../services/location/locationService';

interface SOSModalProps {
    visible: boolean;
    onClose: () => void;
    siteId: string;
    siteName: string;
    siteLocation?: {
        latitude: number;
        longitude: number;
    };
}

const SUPPORT_CHIPS = [
    { id: 'lost', label: 'Lạc đoàn / Người thân', icon: 'people' },
    { id: 'health', label: 'Vấn đề sức khỏe', icon: 'medkit' },
    { id: 'items', label: 'Thất lạc đồ đạc', icon: 'briefcase' },
    { id: 'guide', label: 'Cần chỉ dẫn gấp', icon: 'navigate' },
];

// Terracotta color for "Support" mood
const SUPPORT_COLOR = '#C05621';

export const SOSModal: React.FC<SOSModalProps> = ({
    visible,
    onClose,
    siteId,
    siteName,
    siteLocation,
}) => {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedChipId, setSelectedChipId] = useState<string | null>(null);

    const handleChipPress = (chipId: string, label: string) => {
        if (selectedChipId === chipId) {
            setSelectedChipId(null);
            setMessage('');
        } else {
            setSelectedChipId(chipId);
            // Auto-fill message if empty or matches another chip label
            const isDefaultMessage = SUPPORT_CHIPS.some(c => c.label === message);
            if (!message || isDefaultMessage) {
                setMessage(label);
            }
        }
    };

    const handleSubmit = async () => {
        if (!message.trim()) {
            Toast.show({ type: 'info', text1: 'Thông báo', text2: 'Vui lòng chọn vấn đề hoặc nhập nội dung cần hỗ trợ.' });
            return;
        }

        if (!siteLocation) {
            Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không xác định được vị trí của bạn.' });
            return;
        }

        setIsLoading(true);

        try {
            const userLocation = await locationService.getCurrentLocation();
            
            const payload: CreateSOSRequest = {
                site_id: siteId,
                message: message.trim(),
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
            };

            await pilgrimSOSApi.createSOS(payload);

            Toast.show({
                type: 'success',
                text1: 'Đã gửi yêu cầu',
                text2: 'Yêu cầu hỗ trợ của bạn đã được gửi thành công. Ban quản lý sẽ liên hệ sớm nhất có thể.'
            });
            setMessage('');
            setSelectedChipId(null);
            onClose();
        } catch (error: any) {
            console.error('Failed to send SOS request:', error);

            // Backend returns specific error when user is too far from the site (>1km)
            const apiMessage: string =
                error?.response?.data?.message || error?.message || '';

            if (apiMessage.includes('quá xa') || apiMessage.includes('too far')) {
                Toast.show({
                    type: 'error',
                    text1: 'Ngoài phạm vi',
                    text2: apiMessage || 'Bạn đang quá xa địa điểm này. Cần ở trong phạm vi 1 km để gửi SOS.',
                    visibilityTime: 5000,
                });
            } else if (apiMessage.includes('already') || apiMessage.includes('đang chờ')) {
                Toast.show({
                    type: 'info',
                    text1: 'Thông báo',
                    text2: 'Bạn đã có một yêu cầu SOS đang chờ xử lý.',
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Thất bại',
                    text2: apiMessage || 'Gửi yêu cầu thất bại. Vui lòng thử lại sau.',
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Background click handler */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={styles.modalContainer}>
                    {/* Header - Fixed */}
                    <View style={styles.header}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="hand-right" size={32} color={SUPPORT_COLOR} />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.title}>Bạn cần hỗ trợ?</Text>
                            <Text style={styles.subtitle}>
                                Kết nối với Ban quản lý tại <Text style={{ fontWeight: 'bold' }}>{siteName}</Text>
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Content - Scrollable */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.content}
                    >
                        {/* Quick Chips */}
                        <Text style={styles.label}>Vấn đề bạn đang gặp phải:</Text>
                        <View style={styles.chipContainer}>
                            {SUPPORT_CHIPS.map((chip) => (
                                <TouchableOpacity
                                    key={chip.id}
                                    style={[
                                        styles.chip,
                                        selectedChipId === chip.id && styles.activeChip
                                    ]}
                                    onPress={() => handleChipPress(chip.id, chip.label)}
                                >
                                    <Ionicons
                                        name={chip.icon as any}
                                        size={16}
                                        color={selectedChipId === chip.id ? COLORS.white : SUPPORT_COLOR}
                                    />
                                    <Text style={[
                                        styles.chipText,
                                        selectedChipId === chip.id && styles.activeChipText
                                    ]}>
                                        {chip.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Message Input */}
                        <Text style={[styles.label, { marginTop: SPACING.md }]}>Chi tiết (nếu cần):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Mô tả thêm về vấn đề của bạn..."
                            placeholderTextColor={COLORS.textSecondary}
                            multiline
                            numberOfLines={3}
                            value={message}
                            onChangeText={setMessage}
                            textAlignVertical="top"
                        />

                        {/* Location Badge */}
                        <View style={styles.locationInfo}>
                            <Ionicons name="location" size={16} color={SUPPORT_COLOR} />
                            <Text style={styles.locationText}>
                                Đã đính kèm vị trí hiện tại để hỗ trợ viên tìm thấy bạn dễ dàng hơn.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Actions - Fixed */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                            disabled={isLoading}
                        >
                            <Text style={styles.cancelButtonText}>Đóng</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.submitButton]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                                <>
                                    <Ionicons name="paper-plane" size={18} color={COLORS.white} />
                                    <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.md,
    },
    modalContainer: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        width: '100%',
        maxWidth: 400,
        maxHeight: '85%', // Limit height
        ...SHADOWS.large,
        display: 'flex',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: 'rgba(192, 86, 33, 0.1)', // Light Terracotta
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.textSecondary,
    },
    closeButton: {
        padding: SPACING.xs,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.borderLight,
        marginHorizontal: SPACING.lg,
    },
    content: {
        padding: SPACING.lg,
        paddingTop: SPACING.sm, // Reduced top padding
    },
    label: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs, // Tighter margin
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.md, // Add explicit margin bottom
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6, // Slightly clearer vertical padding
        paddingHorizontal: 12,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(192, 86, 33, 0.3)',
        backgroundColor: COLORS.white,
    },
    activeChip: {
        backgroundColor: SUPPORT_COLOR,
        borderColor: SUPPORT_COLOR,
    },
    chipText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: SUPPORT_COLOR,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    activeChipText: {
        color: COLORS.white,
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        fontSize: TYPOGRAPHY.fontSize.md,
        color: COLORS.textPrimary,
        minHeight: 80,
        maxHeight: 120, // Limit maximum height
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        gap: SPACING.xs,
        backgroundColor: 'rgba(192, 86, 33, 0.05)',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
    },
    locationText: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.textSecondary,
        flex: 1,
        lineHeight: 18,
    },
    actions: {
        flexDirection: 'row',
        padding: SPACING.lg,
        paddingTop: SPACING.sm, // Reduced top padding
        paddingBottom: SPACING.lg,
        gap: SPACING.md,
        backgroundColor: COLORS.white, // Ensure background covers list
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    cancelButton: {
        backgroundColor: COLORS.surface0,
    },
    cancelButtonText: {
        color: COLORS.textSecondary,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        fontSize: TYPOGRAPHY.fontSize.md,
    },
    submitButton: {
        backgroundColor: SUPPORT_COLOR,
        ...SHADOWS.medium,
    },
    submitButtonText: {
        color: COLORS.white,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        fontSize: TYPOGRAPHY.fontSize.md,
    },
});

export default SOSModal;
