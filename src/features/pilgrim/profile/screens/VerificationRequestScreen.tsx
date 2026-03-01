import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { MediaPickerModal } from '../../../../components/common/MediaPickerModal';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSites } from '../../../../hooks/useSites';
import { useVerification } from '../../../../hooks/useVerification';
import { ReactNativeFile } from '../../../../types/pilgrim/verification.types';

type FormType = 'new' | 'transition';

const VerificationRequestScreen = () => {
    const navigation = useNavigation();
    const { isGuest } = useAuth();
    const {
        myRequest,
        isMyRequestLoading,
        requestGuestVerification,
        isRequestingGuestVer,
        requestPilgrimVerification,
        isRequestingPilgrimVer,
        requestGuestTransition,
        isRequestingGuestTrans,
        requestPilgrimTransition,
        isRequestingPilgrimTrans,
    } = useVerification();

    const [formType, setFormType] = useState<FormType>('new');
    const [isEditing, setIsEditing] = useState(false);

    // Form inputs
    const [applicantName, setApplicantName] = useState('');
    const [applicantEmail, setApplicantEmail] = useState('');
    const [applicantPhone, setApplicantPhone] = useState('');
    const [siteName, setSiteName] = useState('');
    const [siteAddress, setSiteAddress] = useState('');
    const [siteProvince, setSiteProvince] = useState('');
    const [siteType, setSiteType] = useState('');
    const [siteRegion, setSiteRegion] = useState('');
    const [introduction, setIntroduction] = useState('');
    const [existingSiteId, setExistingSiteId] = useState('');
    const [selectedSiteName, setSelectedSiteName] = useState('');
    const [transitionReason, setTransitionReason] = useState('');
    const [certificate, setCertificate] = useState<ReactNativeFile | null>(null);

    // Site selection Modal state
    const [isSiteModalVisible, setIsSiteModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { sites, fetchSites, isLoading: isSitesLoading } = useSites({ autoFetch: true });

    // Handle site search
    const [isMediaPickerVisible, setMediaPickerVisible] = useState(false);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        fetchSites({ query: text });
    };

    const handleMediaPicked = (result: ImagePicker.ImagePickerResult) => {
        if (!result.canceled) {
            setCertificate({
                uri: result.assets[0].uri,
                name: result.assets[0].fileName || 'certificate.jpg',
                type: result.assets[0].mimeType || 'image/jpeg',
            });
        }
    };

    const pickImage = () => {
        setMediaPickerVisible(true);
    };

    const validateForm = () => {
        if (isGuest) {
            if (!applicantName || !applicantEmail) {
                Alert.alert('Lỗi', 'Vui lòng điền đủ Tên và Email người nộp đơn.');
                return false;
            }
        }
        if (formType === 'new') {
            if (!siteName || !siteProvince) {
                Alert.alert('Lỗi', 'Vui lòng điền Tên điểm hành hương và Tỉnh/Thành.');
                return false;
            }
        } else {
            if (!existingSiteId || !transitionReason) {
                Alert.alert('Lỗi', 'Vui lòng điền Mã điểm hành hương và Lý do thay thế.');
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            if (formType === 'new') {
                if (isGuest) {
                    await requestGuestVerification({
                        applicant_email: applicantEmail,
                        applicant_name: applicantName,
                        applicant_phone: applicantPhone,
                        site_name: siteName,
                        site_address: siteAddress,
                        site_province: siteProvince,
                        site_type: siteType,
                        site_region: siteRegion,
                        introduction,
                        certificate: certificate || undefined,
                    });
                } else {
                    await requestPilgrimVerification({
                        site_name: siteName,
                        site_address: siteAddress,
                        site_province: siteProvince,
                        site_type: siteType,
                        site_region: siteRegion,
                        introduction,
                        certificate: certificate || undefined,
                    });
                }
            } else {
                if (isGuest) {
                    await requestGuestTransition({
                        applicant_email: applicantEmail,
                        applicant_name: applicantName,
                        applicant_phone: applicantPhone,
                        existing_site_id: existingSiteId,
                        transition_reason: transitionReason,
                        introduction,
                        certificate: certificate || undefined,
                    });
                } else {
                    await requestPilgrimTransition({
                        existing_site_id: existingSiteId,
                        transition_reason: transitionReason,
                        introduction,
                        certificate: certificate || undefined,
                    });
                }
            }
            setIsEditing(false); // Go back to view if successful
            navigation.goBack();
        } catch (error) {
            // Error is handled in useVerification mutations
        }
    };

    const isSubmitting = isRequestingGuestVer || isRequestingPilgrimVer || isRequestingGuestTrans || isRequestingPilgrimTrans;

    const renderInput = (label: string, value: string, setValue: (t: string) => void, placeholder: string, required = false, keyboardType: any = 'default', multiline = false) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label} {required && <Text style={{ color: '#DC4C4C' }}>*</Text>}</Text>
            <TextInput
                style={[styles.input, multiline && styles.textArea]}
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                placeholderTextColor="#A0ABC0"
                keyboardType={keyboardType}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
        </View>
    );

    const FormContent = () => (
        <View style={styles.formContainer}>
            {/* Tabs for Form Type */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, formType === 'new' && styles.activeTab]}
                    onPress={() => setFormType('new')}
                >
                    <Text style={[styles.tabText, formType === 'new' && styles.activeTabText]}>Đăng ký điểm mới</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, formType === 'transition' && styles.activeTab]}
                    onPress={() => setFormType('transition')}
                >
                    <Text style={[styles.tabText, formType === 'transition' && styles.activeTabText]}>Thay thế Quản lý</Text>
                </TouchableOpacity>
            </View>

            {/* Applicant Information for Guests */}
            {isGuest && (
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Thông tin người nộp đơn</Text>
                    {renderInput('Họ và Tên', applicantName, setApplicantName, 'Nhập họ và tên...', true)}
                    {renderInput('Email', applicantEmail, setApplicantEmail, 'Nhập email liên hệ...', true, 'email-address')}
                    {renderInput('Số điện thoại', applicantPhone, setApplicantPhone, 'Nhập SĐT liên hệ...', false, 'phone-pad')}
                </View>
            )}

            {/* Form Fields Based on Type */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{formType === 'new' ? 'Thông tin Điểm Hành Hương' : 'Thông tin Thay thế'}</Text>

                {formType === 'new' ? (
                    <>
                        {renderInput('Tên điểm hành hương', siteName, setSiteName, 'Nhập tên ĐHH...', true)}
                        {renderInput('Tỉnh / Thành phố', siteProvince, setSiteProvince, 'VD: Hà Nội, TP.HCM...', true)}
                        {renderInput('Địa chỉ chi tiết', siteAddress, setSiteAddress, 'Nhập địa chỉ cụ thể...')}
                        {renderInput('Loại điểm (Site Type)', siteType, setSiteType, 'VD: Nhà chờ, Nhà thờ, Tu viện...')}
                        {renderInput('Vùng (Region)', siteRegion, setSiteRegion, 'VD: Bắc, Trung, Nam...')}
                    </>
                ) : (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Chọn Điểm Hành Hương <Text style={{ color: '#DC4C4C' }}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => setIsSiteModalVisible(true)}
                            >
                                <Text style={[styles.pickerButtonText, !selectedSiteName && { color: '#A0ABC0' }]}>
                                    {selectedSiteName || 'Chạm để chọn điểm hành hương...'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#6C8CA3" />
                            </TouchableOpacity>
                        </View>
                        {renderInput('Lý do thay thế', transitionReason, setTransitionReason, 'Tại sao bạn cần thay thế Quản lý hiện tại?', true, 'default', true)}
                    </>
                )}
            </View>

            {/* Extra Info */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Thông tin thêm</Text>
                {renderInput('Giới thiệu bản thân / Điểm đến', introduction, setIntroduction, 'Mô tả ngắn về bạn hoặc điểm hành hương...', false, 'default', true)}

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Giấy chứng nhận (Tùy chọn)</Text>
                    <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                        <Ionicons name="document-attach-outline" size={24} color="#D4AF37" />
                        <Text style={styles.imagePickerText}>
                            {certificate ? certificate.name : 'Đính kèm hình ảnh chứng nhận...'}
                        </Text>
                    </TouchableOpacity>
                    {certificate && (
                        <TouchableOpacity style={styles.removeCertBtn} onPress={() => setCertificate(null)}>
                            <Text style={styles.removeCertText}>Xóa đính kèm</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>}
                </TouchableOpacity>
            </View>

            {/* Site Selection Modal */}
            <Modal
                visible={isSiteModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsSiteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn Điểm Hành Hương</Text>
                            <TouchableOpacity onPress={() => setIsSiteModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#A0ABC0" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm kiếm điểm hành hương..."
                                placeholderTextColor="#A0ABC0"
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />
                        </View>

                        {isSitesLoading ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color="#D4AF37" />
                            </View>
                        ) : (
                            <FlatList
                                data={sites}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.siteItem}
                                        onPress={() => {
                                            setExistingSiteId(item.id);
                                            setSelectedSiteName(item.name);
                                            setIsSiteModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.siteItemName}>{item.name}</Text>
                                        <Text style={styles.siteItemAddress} numberOfLines={1}>{item.address}</Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>Không tìm thấy điểm hành hương nào.</Text>
                                    </View>
                                }
                                contentContainerStyle={{ paddingBottom: 20 }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trở thành Local Guide</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {isMyRequestLoading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#D4AF37" />
                            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                        </View>
                    ) : (myRequest && !isEditing) ? (
                        <View style={styles.card}>
                            <Ionicons name="briefcase" size={48} color="#D4AF37" style={styles.icon} />
                            <Text style={styles.title}>Yêu cầu đã được gửi</Text>
                            <Text style={styles.description}>
                                Bạn đã gửi một yêu cầu trở thành Local Guide trước đó. Vui lòng chờ phản hồi từ quản trị viên.
                            </Text>

                            <View style={styles.detailsContainer}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Mã yêu cầu:</Text>
                                    <Text style={styles.detailValue}>{myRequest.code}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Trạng thái:</Text>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: myRequest.status.toLowerCase() === 'approved' ? '#E6F4EA' : (myRequest.status.toLowerCase() === 'rejected' ? '#FDECEA' : '#FFF4E5') }
                                    ]}>
                                        <Text style={[
                                            styles.statusBadgeText,
                                            { color: myRequest.status.toLowerCase() === 'approved' ? '#1E8E3E' : (myRequest.status.toLowerCase() === 'rejected' ? '#D93025' : '#E37400') }
                                        ]}>{myRequest.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                                {myRequest.site_name && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Điểm ĐK:</Text>
                                        <Text style={styles.detailValue} numberOfLines={1}>{myRequest.site_name}</Text>
                                    </View>
                                )}
                                {myRequest.rejection_reason && (
                                    <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                                        <Text style={styles.detailLabel}>Lý do từ chối:</Text>
                                        <Text style={[styles.detailValue, { color: '#D93025', marginTop: 4 }]}>{myRequest.rejection_reason}</Text>
                                    </View>
                                )}
                            </View>

                            {myRequest.status.toLowerCase() === 'rejected' && (
                                <TouchableOpacity style={styles.primaryButton} onPress={() => setIsEditing(true)}>
                                    <Text style={styles.primaryButtonText}>Tạo yêu cầu mới</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : isEditing || !myRequest ? (
                        <FormContent />
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>

            <MediaPickerModal
                visible={isMediaPickerVisible}
                onClose={() => setMediaPickerVisible(false)}
                onMediaPicked={handleMediaPicked}
                mediaTypes={ImagePicker.MediaTypeOptions.Images}
                allowsEditing={true}
                quality={0.8}
                title="Tải lên giấy chứng nhận"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F5F2', // warmGray
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e4e0d3',
        backgroundColor: '#ffffff',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    loadingText: {
        marginTop: 12,
        color: '#6C8CA3',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#1A1A1A',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#6C8CA3',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    detailsContainer: {
        width: '100%',
        backgroundColor: '#FDF8F0',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F4E4BA',
        marginBottom: 24,
        gap: 12, // React Native >= 0.71 supports gap
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        color: '#6C8CA3',
        fontWeight: '500',
        fontSize: 14,
    },
    detailValue: {
        color: '#1A1A1A',
        fontWeight: '600',
        fontSize: 14,
        flex: 1,
        textAlign: 'right',
        marginLeft: 16,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 16,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    primaryButton: {
        backgroundColor: '#D4AF37',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },

    // Form Styles
    formContainer: {
        width: '100%',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#EAE6DF',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    tabText: {
        fontWeight: '600',
        color: '#6C8CA3',
    },
    activeTabText: {
        color: '#1A1A1A',
    },
    sectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#1A1A1A',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F7F5F2',
        paddingBottom: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1A1A1A',
    },
    textArea: {
        height: 100,
        paddingTop: 12,
    },
    imagePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D4AF37',
        borderStyle: 'dashed',
        borderRadius: 10,
        padding: 12,
        backgroundColor: '#FDF8F0',
    },
    imagePickerText: {
        marginLeft: 10,
        color: '#D4AF37',
        flex: 1,
    },
    removeCertBtn: {
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    removeCertText: {
        color: '#DC4C4C',
        fontSize: 13,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
        marginBottom: 40,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#EAE6DF',
    },
    cancelBtnText: {
        color: '#6C8CA3',
        fontWeight: 'bold',
        fontSize: 16,
    },
    submitBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#D4AF37',
    },
    submitBtnText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    pickerButtonText: {
        fontSize: 15,
        color: '#1A1A1A',
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    closeBtn: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1A1A1A',
    },
    modalLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    siteItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    siteItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    siteItemAddress: {
        fontSize: 14,
        color: '#6C8CA3',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6C8CA3',
        fontSize: 15,
    },
});

export default VerificationRequestScreen;
