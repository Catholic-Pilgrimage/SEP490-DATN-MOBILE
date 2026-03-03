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
import useI18n from "../../../../hooks/useI18n";
import { useSites } from "../../../../hooks/useSites";
import { useVerification } from "../../../../hooks/useVerification";
import { ReactNativeFile } from "../../../../types/pilgrim/verification.types";

type FormType = "new" | "transition";

const VerificationRequestScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();
  const { t } = useI18n();
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
    { label: t("verification.siteTypes.church"), value: "church" },
    { label: t("verification.siteTypes.shrine"), value: "shrine" },
    { label: t("verification.siteTypes.monastery"), value: "monastery" },
    { label: t("verification.siteTypes.center"), value: "center" },
    { label: t("verification.siteTypes.other"), value: "other" },
  ];
  const SITE_REGION_OPTIONS: { label: string; value: string }[] = [
    { label: t("verification.regions.north"), value: "Bac" },
    { label: t("verification.regions.central"), value: "Trung" },
    { label: t("verification.regions.south"), value: "Nam" },
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
      Alert.alert(
        t("verification.errors.title"),
        t("verification.errors.cannotPickDocument"),
      );
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t("verification.errors.permissionDenied"),
          t("verification.errors.libraryPermission"),
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
      Alert.alert(
        t("verification.errors.title"),
        t("verification.errors.cannotPickImage"),
      );
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t("verification.errors.permissionDenied"),
          t("verification.errors.cameraPermission"),
        );
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
      Alert.alert(
        t("verification.errors.title"),
        t("verification.errors.cannotOpenCamera"),
      );
    }
  };

  const validateForm = () => {
    if (isGuest) {
      if (!applicantName || !applicantEmail) {
        Alert.alert(
          t("verification.errors.title"),
          t("verification.errors.guestRequired"),
        );
        return false;
      }
    }
    if (formType === "new") {
      if (!siteName || !siteProvince) {
        Alert.alert(
          t("verification.errors.title"),
          t("verification.errors.newSiteRequired"),
        );
        return false;
      }
    } else {
      if (!existingSiteId || !transitionReason) {
        Alert.alert(
          t("verification.errors.title"),
          t("verification.errors.transitionRequired"),
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
            {t("verification.tabNew")}
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
            {t("verification.tabTransition")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Applicant Information for Guests */}
      {isGuest && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {t("verification.sectionApplicant")}
          </Text>
          {renderInput(
            t("verification.fields.fullName"),
            applicantName,
            setApplicantName,
            t("verification.fields.fullNamePlaceholder"),
            true,
          )}
          {renderInput(
            t("verification.fields.email"),
            applicantEmail,
            setApplicantEmail,
            t("verification.fields.emailPlaceholder"),
            true,
            "email-address",
          )}
          {renderInput(
            t("verification.fields.phone"),
            applicantPhone,
            setApplicantPhone,
            t("verification.fields.phonePlaceholder"),
            false,
            "phone-pad",
          )}
        </View>
      )}

      {/* Form Fields Based on Type */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          {formType === "new"
            ? t("verification.sectionNewSite")
            : t("verification.sectionTransition")}
        </Text>

        {formType === "new" ? (
          <>
            {renderInput(
              t("verification.fields.siteName"),
              siteName,
              setSiteName,
              t("verification.fields.siteNamePlaceholder"),
              true,
            )}
            {renderInput(
              t("verification.fields.province"),
              siteProvince,
              setSiteProvince,
              t("verification.fields.provincePlaceholder"),
              true,
            )}
            {renderInput(
              t("verification.fields.address"),
              siteAddress,
              setSiteAddress,
              t("verification.fields.addressPlaceholder"),
            )}
            {renderDropdown(
              t("verification.fields.siteType"),
              siteType,
              setSiteType,
              SITE_TYPE_OPTIONS,
              isTypeDropdownVisible,
              setIsTypeDropdownVisible,
              t("verification.fields.siteTypePlaceholder"),
            )}
            {renderDropdown(
              t("verification.fields.region"),
              siteRegion,
              setSiteRegion,
              SITE_REGION_OPTIONS,
              isRegionDropdownVisible,
              setIsRegionDropdownVisible,
              t("verification.fields.regionPlaceholder"),
            )}
          </>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("verification.fields.selectSite")}{" "}
                <Text style={{ color: "#DC4C4C" }}>*</Text>
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
                  {selectedSiteName ||
                    t("verification.fields.selectSitePlaceholder")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6C8CA3" />
              </TouchableOpacity>
            </View>
            {renderInput(
              t("verification.fields.transitionReason"),
              transitionReason,
              setTransitionReason,
              t("verification.fields.transitionReasonPlaceholder"),
              true,
              "default",
              true,
            )}
          </>
        )}
      </View>

      {/* Extra Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          {t("verification.sectionExtra")}
        </Text>
        {renderInput(
          t("verification.fields.introduction"),
          introduction,
          setIntroduction,
          t("verification.fields.introductionPlaceholder"),
          false,
          "default",
          true,
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("verification.fields.certificate")}
          </Text>
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
                <Text style={styles.certPickerBtnText}>
                  {t("verification.cert.takePhoto")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.certPickerBtn}
                onPress={pickImageFromLibrary}
              >
                <Ionicons name="image-outline" size={22} color="#D4AF37" />
                <Text style={styles.certPickerBtnText}>
                  {t("verification.cert.library")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.certPickerBtn}
                onPress={handleDocumentPicked}
              >
                <Ionicons name="document-outline" size={22} color="#D4AF37" />
                <Text style={styles.certPickerBtnText}>
                  {t("verification.cert.document")}
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
          <Text style={styles.cancelBtnText}>
            {t("verification.actions.cancel")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {t("verification.actions.submit")}
            </Text>
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
              <Text style={styles.modalTitle}>
                {t("verification.modal.title")}
              </Text>
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
                placeholder={t("verification.modal.searchPlaceholder")}
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
                      {t("verification.modal.empty")}
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
      fadeDuration={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("verification.headerTitle")}</Text>
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
          {myRequest && !isEditing ? (
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
                  ? t("verification.status.approved.title")
                  : myRequest.status.toLowerCase() === "rejected"
                    ? t("verification.status.rejected.title")
                    : t("verification.status.pending.title")}
              </Text>
              <Text style={styles.description}>
                {myRequest.status.toLowerCase() === "approved"
                  ? t("verification.status.approved.description")
                  : myRequest.status.toLowerCase() === "rejected"
                    ? t("verification.status.rejected.description")
                    : t("verification.status.pending.description")}
              </Text>

              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t("verification.details.requestCode")}
                  </Text>
                  <Text style={styles.detailValue}>{myRequest.code}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t("verification.details.requestStatus")}
                  </Text>
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
                    <Text style={styles.detailLabel}>
                      {t("verification.details.registeredSite")}
                    </Text>
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
                    <Text style={styles.detailLabel}>
                      {t("verification.details.rejectionReason")}
                    </Text>
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
                  <Text style={styles.primaryButtonText}>
                    {t("verification.actions.newRequest")}
                  </Text>
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
    backgroundColor: "rgba(253, 248, 240, 0.85)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
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
    backgroundColor: "rgba(253, 248, 240, 0.92)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#B8860B",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
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
    backgroundColor: "rgba(255, 251, 240, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
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
    backgroundColor: "rgba(255, 251, 240, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
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
    backgroundColor: "#FDF8F0",
    borderRadius: 16,
    width: "100%",
    paddingVertical: 8,
    elevation: 8,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.2)",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.12)",
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(212, 175, 55, 0.1)",
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
