import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../../contexts/AuthContext";
import { useSites } from "../../../../hooks/useSites";
import { useVerification } from "../../../../hooks/useVerification";
import { ReactNativeFile } from "../../../../types/pilgrim/verification.types";

type FormType = "new" | "transition";

const VerificationRequestScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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

  const [formType, setFormType] = useState<FormType>("new");
  const [isEditing, setIsEditing] = useState(false);

  // Form inputs
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteProvince, setSiteProvince] = useState("");
  const [siteType, setSiteType] = useState("");
  const [siteRegion, setSiteRegion] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [existingSiteId, setExistingSiteId] = useState("");
  const [selectedSiteName, setSelectedSiteName] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [certificate, setCertificate] = useState<ReactNativeFile | null>(null);

  // Site selection Modal state
  const [isSiteModalVisible, setIsSiteModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    sites,
    fetchSites,
    isLoading: isSitesLoading,
  } = useSites({ autoFetch: true });

  // Dropdown state
  const SITE_TYPE_OPTIONS: { label: string; value: string }[] = [
    { label: "Nhà thờ", value: "church" },
    { label: "Đền thánh", value: "shrine" },
    { label: "Tu viện", value: "monastery" },
    { label: "Trung tâm hành hương", value: "center" },
    { label: "Khác", value: "other" },
  ];
  const SITE_REGION_OPTIONS: { label: string; value: string }[] = [
    { label: "Miền Bắc", value: "Bac" },
    { label: "Miền Trung", value: "Trung" },
    { label: "Miền Nam", value: "Nam" },
  ];
  const [isTypeDropdownVisible, setIsTypeDropdownVisible] = useState(false);
  const [isRegionDropdownVisible, setIsRegionDropdownVisible] = useState(false);

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
        name: result.assets[0].fileName || "certificate.jpg",
        type: result.assets[0].mimeType || "image/jpeg",
      });
    }
  };

  const handleDocumentPicked = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/*",
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCertificate({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
        });
      }
    } catch {
      Alert.alert("Lỗi", "Không thể chọn tài liệu. Vui lòng thử lại.");
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Từ chối quyền",
          "Vui lòng cấp quyền truy cập thư viện ảnh.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        setCertificate({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || "certificate.jpg",
          type: result.assets[0].mimeType || "image/jpeg",
        });
      }
    } catch {
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Từ chối quyền", "Vui lòng cấp quyền máy ảnh.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        setCertificate({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || "certificate.jpg",
          type: result.assets[0].mimeType || "image/jpeg",
        });
      }
    } catch {
      Alert.alert("Lỗi", "Không thể mở máy ảnh. Vui lòng thử lại.");
    }
  };

  const validateForm = () => {
    if (isGuest) {
      if (!applicantName || !applicantEmail) {
        Alert.alert("Lỗi", "Vui lòng điền đủ Tên và Email người nộp đơn.");
        return false;
      }
    }
    if (formType === "new") {
      if (!siteName || !siteProvince) {
        Alert.alert("Lỗi", "Vui lòng điền Tên điểm hành hương và Tỉnh/Thành.");
        return false;
      }
    } else {
      if (!existingSiteId || !transitionReason) {
        Alert.alert(
          "Lỗi",
          "Vui lòng điền Mã điểm hành hương và Lý do thay thế.",
        );
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (formType === "new") {
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

  const isSubmitting =
    isRequestingGuestVer ||
    isRequestingPilgrimVer ||
    isRequestingGuestTrans ||
    isRequestingPilgrimTrans;

  const renderInput = (
    label: string,
    value: string,
    setValue: (t: string) => void,
    placeholder: string,
    required = false,
    keyboardType: any = "default",
    multiline = false,
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={{ color: "#DC4C4C" }}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#A0ABC0"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );

  const renderDropdown = (
    label: string,
    value: string,
    setValue: (t: string) => void,
    options: { label: string; value: string }[],
    isVisible: boolean,
    setVisible: (v: boolean) => void,
    placeholder: string,
    required = false,
  ) => {
    const selectedLabel = options.find((o) => o.value === value)?.label;
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {label} {required && <Text style={{ color: "#DC4C4C" }}>*</Text>}
        </Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setVisible(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.pickerButtonText, !value && { color: "#A0ABC0" }]}
          >
            {selectedLabel || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#A0ABC0" />
        </TouchableOpacity>
        <Modal
          visible={isVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setVisible(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          >
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownTitle}>{label}</Text>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    value === option.value && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setValue(option.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === option.value && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Ionicons name="checkmark" size={18} color="#D4AF37" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const FormContent = () => (
    <View style={styles.formContainer}>
      {/* Tabs for Form Type */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, formType === "new" && styles.activeTab]}
          onPress={() => setFormType("new")}
        >
          <Text
            style={[styles.tabText, formType === "new" && styles.activeTabText]}
          >
            Đăng ký điểm mới
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, formType === "transition" && styles.activeTab]}
          onPress={() => setFormType("transition")}
        >
          <Text
            style={[
              styles.tabText,
              formType === "transition" && styles.activeTabText,
            ]}
          >
            Thay thế Quản lý
          </Text>
        </TouchableOpacity>
      </View>

      {/* Applicant Information for Guests */}
      {isGuest && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin người nộp đơn</Text>
          {renderInput(
            "Họ và Tên",
            applicantName,
            setApplicantName,
            "Nhập họ và tên...",
            true,
          )}
          {renderInput(
            "Email",
            applicantEmail,
            setApplicantEmail,
            "Nhập email liên hệ...",
            true,
            "email-address",
          )}
          {renderInput(
            "Số điện thoại",
            applicantPhone,
            setApplicantPhone,
            "Nhập SĐT liên hệ...",
            false,
            "phone-pad",
          )}
        </View>
      )}

      {/* Form Fields Based on Type */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          {formType === "new"
            ? "Thông tin Điểm Hành Hương"
            : "Thông tin Thay thế"}
        </Text>

        {formType === "new" ? (
          <>
            {renderInput(
              "Tên điểm hành hương",
              siteName,
              setSiteName,
              "Nhập tên ĐHH...",
              true,
            )}
            {renderInput(
              "Tỉnh / Thành phố",
              siteProvince,
              setSiteProvince,
              "VD: Hà Nội, TP.HCM...",
              true,
            )}
            {renderInput(
              "Địa chỉ chi tiết",
              siteAddress,
              setSiteAddress,
              "Nhập địa chỉ cụ thể...",
            )}
            {renderDropdown(
              "Loại điểm",
              siteType,
              setSiteType,
              SITE_TYPE_OPTIONS,
              isTypeDropdownVisible,
              setIsTypeDropdownVisible,
              "Chọn loại điểm...",
            )}
            {renderDropdown(
              "Vùng miền",
              siteRegion,
              setSiteRegion,
              SITE_REGION_OPTIONS,
              isRegionDropdownVisible,
              setIsRegionDropdownVisible,
              "Chọn vùng miền...",
            )}
          </>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Chọn Điểm Hành Hương <Text style={{ color: "#DC4C4C" }}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setIsSiteModalVisible(true)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedSiteName && { color: "#A0ABC0" },
                  ]}
                >
                  {selectedSiteName || "Chạm để chọn điểm hành hương..."}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6C8CA3" />
              </TouchableOpacity>
            </View>
            {renderInput(
              "Lý do thay thế",
              transitionReason,
              setTransitionReason,
              "Tại sao bạn cần thay thế Quản lý hiện tại?",
              true,
              "default",
              true,
            )}
          </>
        )}
      </View>

      {/* Extra Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Thông tin thêm</Text>
        {renderInput(
          "Giới thiệu bản thân / Điểm đến",
          introduction,
          setIntroduction,
          "Mô tả ngắn về bạn hoặc điểm hành hương...",
          false,
          "default",
          true,
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Giấy chứng nhận (Tùy chọn)</Text>
          {certificate ? (
            <View style={styles.certPreview}>
              <Ionicons
                name={
                  certificate.type?.startsWith("image")
                    ? "image-outline"
                    : "document-outline"
                }
                size={22}
                color="#D4AF37"
              />
              <Text style={styles.certPreviewName} numberOfLines={1}>
                {certificate.name}
              </Text>
              <TouchableOpacity onPress={() => setCertificate(null)}>
                <Ionicons name="close-circle" size={20} color="#8B3A3A" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.certPickerRow}>
              <TouchableOpacity
                style={styles.certPickerBtn}
                onPress={takePhoto}
              >
                <Ionicons name="camera-outline" size={22} color="#D4AF37" />
                <Text style={styles.certPickerBtnText}>Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.certPickerBtn}
                onPress={pickImageFromLibrary}
              >
                <Ionicons name="image-outline" size={22} color="#D4AF37" />
                <Text style={styles.certPickerBtnText}>Thư viện</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.certPickerBtn}
                onPress={handleDocumentPicked}
              >
                <Ionicons name="document-outline" size={22} color="#D4AF37" />
                <Text style={styles.certPickerBtnText}>
                  Tài liệu{"\n"}(PDF, Word)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setIsEditing(false)}
        >
          <Text style={styles.cancelBtnText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
          )}
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
              <TouchableOpacity
                onPress={() => setIsSiteModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#A0ABC0"
                style={styles.searchIcon}
              />
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
                    <Text style={styles.siteItemAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      Không tìm thấy điểm hành hương nào.
                    </Text>
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
    <ImageBackground
      source={require("../../../../../assets/images/verification-bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng ký Quản lý Điểm</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {isMyRequestLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
              <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
          ) : myRequest && !isEditing ? (
            <View style={styles.card}>
              <Ionicons
                name={
                  myRequest.status.toLowerCase() === "approved"
                    ? "checkmark-circle"
                    : myRequest.status.toLowerCase() === "rejected"
                      ? "close-circle"
                      : "briefcase"
                }
                size={48}
                color={
                  myRequest.status.toLowerCase() === "approved"
                    ? "#1E8E3E"
                    : myRequest.status.toLowerCase() === "rejected"
                      ? "#D93025"
                      : "#D4AF37"
                }
                style={styles.icon}
              />
              <Text style={styles.title}>
                {myRequest.status.toLowerCase() === "approved"
                  ? "Yêu cầu đã được duyệt"
                  : myRequest.status.toLowerCase() === "rejected"
                    ? "Yêu cầu bị từ chối"
                    : "Yêu cầu đã được gửi"}
              </Text>
              <Text style={styles.description}>
                {myRequest.status.toLowerCase() === "approved"
                  ? "Yêu cầu đăng ký quản lý điểm của bạn đã được chấp thuận. Hãy đăng xuất và đăng nhập lại để cập nhật quyền hạn."
                  : myRequest.status.toLowerCase() === "rejected"
                    ? "Yêu cầu của bạn đã bị từ chối. Bạn có thể tạo yêu cầu mới."
                    : "Bạn đã gửi một yêu cầu đăng ký quản lý điểm trước đó. Vui lòng chờ phản hồi từ quản trị viên."}
              </Text>

              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã yêu cầu:</Text>
                  <Text style={styles.detailValue}>{myRequest.code}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          myRequest.status.toLowerCase() === "approved"
                            ? "#E6F4EA"
                            : myRequest.status.toLowerCase() === "rejected"
                              ? "#FDECEA"
                              : "#FFF4E5",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            myRequest.status.toLowerCase() === "approved"
                              ? "#1E8E3E"
                              : myRequest.status.toLowerCase() === "rejected"
                                ? "#D93025"
                                : "#E37400",
                        },
                      ]}
                    >
                      {myRequest.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {myRequest.site_name && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Điểm ĐK:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {myRequest.site_name}
                    </Text>
                  </View>
                )}
                {myRequest.rejection_reason && (
                  <View
                    style={[
                      styles.detailRow,
                      { flexDirection: "column", alignItems: "flex-start" },
                    ]}
                  >
                    <Text style={styles.detailLabel}>Lý do từ chối:</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: "#D93025", marginTop: 4 },
                      ]}
                    >
                      {myRequest.rejection_reason}
                    </Text>
                  </View>
                )}
              </View>

              {myRequest.status.toLowerCase() === "rejected" && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.primaryButtonText}>Tạo yêu cầu mới</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : isEditing || !myRequest ? (
            <FormContent />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  loadingText: {
    marginTop: 12,
    color: "#6C8CA3",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6C8CA3",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  detailsContainer: {
    width: "100%",
    backgroundColor: "rgba(253, 248, 240, 0.8)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244, 228, 186, 0.6)",
    marginBottom: 24,
    gap: 12, // React Native >= 0.71 supports gap
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    color: "#6C8CA3",
    fontWeight: "500",
    fontSize: 14,
  },
  detailValue: {
    color: "#1A1A1A",
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  primaryButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Form Styles
  formContainer: {
    width: "100%",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontWeight: "600",
    color: "#6C8CA3",
  },
  activeTabText: {
    color: "#D4AF37",
    fontWeight: "bold",
  },
  sectionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(200, 200, 200, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  imagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FDF8F0",
  },
  imagePickerText: {
    marginLeft: 10,
    color: "#D4AF37",
    flex: 1,
  },
  removeCertBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  removeCertText: {
    color: "#DC4C4C",
    fontSize: 13,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#EAE6DF",
  },
  cancelBtnText: {
    color: "#6C8CA3",
    fontWeight: "bold",
    fontSize: 16,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#D4AF37",
  },
  submitBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(200, 200, 200, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerButtonText: {
    fontSize: 15,
    color: "#1A1A1A",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    color: "#1A1A1A",
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  siteItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  siteItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  siteItemAddress: {
    fontSize: 14,
    color: "#6C8CA3",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#6C8CA3",
    fontSize: 15,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdownContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    paddingVertical: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE6",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F7F5F2",
  },
  dropdownItemSelected: {
    backgroundColor: "#FFFBF0",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#3D3D3D",
  },
  dropdownItemTextSelected: {
    color: "#D4AF37",
    fontWeight: "600",
  },
  certPickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  certPickerBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#FFFBF0",
  },
  certPickerBtnText: {
    fontSize: 13,
    color: "#D4AF37",
    fontWeight: "600",
    textAlign: "center",
  },
  certPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderRadius: 12,
    backgroundColor: "#FFFBF0",
  },
  certPreviewName: {
    flex: 1,
    fontSize: 14,
    color: "#3D3D3D",
  },
});

export default VerificationRequestScreen;
