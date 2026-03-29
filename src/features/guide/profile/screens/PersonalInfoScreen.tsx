/**
 * PersonalInfoScreen - View/Edit Personal Information
 * Displays user profile data from API with edit capability
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { MediaPickerModal } from "../../../../components/common/MediaPickerModal";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useI18n } from "../../../../hooks/useI18n";
import { useGuideProfile } from "../hooks/useGuideProfile";

// Premium color palette
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F4E4BA",
  goldDark: "#B8860B",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  emerald: "#10B981",
};

// ============================================
// INFO ROW COMPONENT
// ============================================

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  editable?: boolean;
  onChangeText?: (text: string) => void;
  isEditing?: boolean;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  notUpdatedText?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({
  icon,
  label,
  value,
  editable = false,
  onChangeText,
  isEditing = false,
  placeholder,
  keyboardType = "default",
  notUpdatedText = "Chưa cập nhật",
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowLeft}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={20} color={PREMIUM_COLORS.gold} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        {isEditing && editable ? (
          <TextInput
            style={styles.infoInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={GUIDE_COLORS.gray400}
            keyboardType={keyboardType}
          />
        ) : (
          <Text style={styles.infoValue}>{value || notUpdatedText}</Text>
        )}
      </View>
    </View>
  </View>
);

// ============================================
// SECTION COMPONENT
// ============================================

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

// ============================================
// MAIN COMPONENT
// ============================================

const PersonalInfoScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useI18n();
  const { confirm, ConfirmModal } = useConfirm();
  const { profile, site, loading, refetch, updateProfile, isVerified } =
    useGuideProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isMediaPickerVisible, setMediaPickerVisible] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
  });

  // Initialize form with profile data
  React.useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        date_of_birth: profile.date_of_birth || "",
      });
    }
  }, [profile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const resetForm = useCallback(() => {
    setAvatarUri(null);
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        date_of_birth: profile.date_of_birth || "",
      });
    }
  }, [profile]);

  const confirmDiscardChanges = useCallback(async () => {
    const confirmed = await confirm({
      type: "danger",
      iconName: "close-circle-outline",
      title: t("editProfile.discardTitle"),
      message: t("editProfile.discardMessage"),
      confirmText: t("editProfile.discard"),
      cancelText: t("editProfile.continueEditing"),
    });

    if (!confirmed) {
      return false;
    }

    setIsEditing(false);
    resetForm();
    return true;
  }, [confirm, resetForm, t]);

  const handleBack = useCallback(async () => {
    if (!isEditing) {
      navigation.goBack();
      return;
    }

    const discarded = await confirmDiscardChanges();
    if (discarded) {
      navigation.goBack();
    }
  }, [confirmDiscardChanges, isEditing, navigation]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(async () => {
    if (!isEditing) {
      return;
    }

    await confirmDiscardChanges();
  }, [confirmDiscardChanges, isEditing]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      const updateData = {
        fullName: formData.full_name,
        phone: formData.phone,
        dateOfBirth: formData.date_of_birth,
        ...(avatarUri ? { avatar: avatarUri } : {}),
      };

      const message = await updateProfile(updateData);

      Toast.show({
        type: "success",
        text1: message || t("editProfile.saveChanges"),
      });
      setIsEditing(false);
      setAvatarUri(null);
      await refetch();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error.message || t("editProfile.updateError"),
      });
    } finally {
      setIsSaving(false);
    }
  }, [formData, avatarUri, updateProfile, refetch, t]);

  const updateFormField = useCallback(
    (field: keyof typeof formData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const pickAvatar = useCallback(() => {
    setMediaPickerVisible(true);
  }, []);

  const handleAvatarPicked = useCallback(
    (result: ImagePicker.ImagePickerResult) => {
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    },
    [],
  );

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      setFormData((prev) => ({
        ...prev,
        date_of_birth: `${yyyy}-${mm}-${dd}`,
      }));
    }
  };

  // Avatar URL
  const getAvatarUrl = () => {
    if (avatarUri) return avatarUri;
    if (profile?.avatar_url) return profile.avatar_url;
    if (profile?.full_name) {
      const encodedName = encodeURIComponent(profile.full_name);
      return `https://ui-avatars.com/api/?name=${encodedName}&background=D4AF37&color=fff&size=200&font-size=0.35`;
    }
    return "https://ui-avatars.com/api/?name=Guide&background=D4AF37&color=fff&size=200";
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Format datetime for display
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Only block with loading screen on initial fetch (no cached profile yet)
  if (loading && !profile) {
    return (
      <ImageBackground
        source={require("../../../../../assets/images/profile-bg.jpg")}
        style={[
          styles.container,
          styles.loadingContainer,
          { paddingTop: insets.top },
        ]}
        resizeMode="cover"
        fadeDuration={0}
      >
        <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
        <Text style={styles.loadingText}>{t("editProfile.loading")}</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../../../../../assets/images/profile-bg.jpg")}
      style={[styles.container, { paddingTop: insets.top }]}
      resizeMode="cover"
      fadeDuration={0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#3D2B1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("editProfile.title")}</Text>
        {isEditing ? (
          <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>
              {t("editProfile.cancel")}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>{t("editProfile.edit")}</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PREMIUM_COLORS.gold}
              colors={[PREMIUM_COLORS.gold]}
            />
          }
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={[PREMIUM_COLORS.gold, PREMIUM_COLORS.goldDark]}
                style={styles.avatarBorder}
              >
                <View style={styles.avatarInner}>
                  <Image
                    source={{ uri: getAvatarUrl() }}
                    style={styles.avatarImage}
                  />
                </View>
              </LinearGradient>
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons
                    name="verified"
                    size={22}
                    color={PREMIUM_COLORS.gold}
                  />
                </View>
              )}
            </View>
            {isEditing && (
              <TouchableOpacity
                style={styles.changeAvatarButton}
                onPress={pickAvatar}
              >
                <Ionicons
                  name="camera-outline"
                  size={16}
                  color={PREMIUM_COLORS.gold}
                />
                <Text style={styles.changeAvatarText}>
                  {t("editProfile.changeAvatar")}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.avatarName}>
              {profile?.full_name || t("editProfile.defaultGuide")}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {isVerified
                  ? t("profile.verifiedGuide")
                  : t("profile.localGuide")}
              </Text>
            </View>
          </View>

          {/* Basic Information */}
          <Section title={t("editProfile.sections.basicInfo")}>
            <InfoRow
              icon="person-outline"
              label={t("editProfile.fields.fullName")}
              value={isEditing ? formData.full_name : profile?.full_name || ""}
              editable
              isEditing={isEditing}
              onChangeText={updateFormField("full_name")}
              placeholder={t("editProfile.placeholders.fullName")}
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="mail-outline"
              label={t("editProfile.fields.email")}
              value={profile?.email || ""}
              editable={false}
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="call-outline"
              label={t("editProfile.fields.phone")}
              value={isEditing ? formData.phone : profile?.phone || ""}
              editable
              isEditing={isEditing}
              onChangeText={updateFormField("phone")}
              placeholder={t("editProfile.placeholders.phone")}
              keyboardType="phone-pad"
              notUpdatedText={t("editProfile.notUpdated")}
            />
            {isEditing ? (
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.infoIconContainer}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={PREMIUM_COLORS.gold}
                  />
                </View>
                <View>
                  <Text style={styles.infoLabel}>
                    {t("editProfile.fields.dateOfBirth")}
                  </Text>
                  <Text style={styles.datePickerBtnText}>
                    {formData.date_of_birth
                      ? formatDate(formData.date_of_birth)
                      : t("editProfile.placeholders.dateOfBirth")}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <InfoRow
                icon="calendar-outline"
                label={t("editProfile.fields.dateOfBirth")}
                value={formatDate(profile?.date_of_birth || "")}
                isEditing={false}
                notUpdatedText={t("editProfile.notUpdated")}
              />
            )}
            {showDatePicker && (
              <DateTimePicker
                value={
                  formData.date_of_birth
                    ? new Date(formData.date_of_birth)
                    : new Date(2000, 0, 1)
                }
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </Section>

          {/* Assignment Information */}
          <Section title={t("editProfile.sections.assignment")}>
            <InfoRow
              icon="business-outline"
              label={t("editProfile.fields.site")}
              value={site?.name || t("editProfile.notAssignedSite")}
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="location-outline"
              label={t("editProfile.fields.address")}
              value={site?.address || ""}
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="globe-outline"
              label={t("editProfile.fields.area")}
              value={site?.province || ""}
              notUpdatedText={t("editProfile.notUpdated")}
            />
          </Section>

          {/* Account Information */}
          <Section title={t("editProfile.sections.accountInfo")}>
            <InfoRow
              icon="shield-checkmark-outline"
              label={t("editProfile.fields.verificationStatus")}
              value={
                isVerified
                  ? t("editProfile.verified")
                  : t("editProfile.notVerified")
              }
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="time-outline"
              label={t("editProfile.fields.verifiedAt")}
              value={
                profile?.verified_at ? formatDateTime(profile.verified_at) : "—"
              }
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="language-outline"
              label={t("editProfile.fields.language")}
              value={
                profile?.language === "vi"
                  ? t("editProfile.languageVi")
                  : t("editProfile.languageEn")
              }
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="calendar-outline"
              label={t("editProfile.fields.joinedAt")}
              value={formatDateTime(profile?.created_at || "")}
              notUpdatedText={t("editProfile.notUpdated")}
            />
          </Section>

          {/* Change Password Button */}
          {!isEditing && (
            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={() => navigation.navigate("ChangePassword" as never)}
              activeOpacity={0.8}
            >
              <Ionicons name="key-outline" size={20} color="#D4AF37" />
              <Text style={styles.changePasswordText}>
                {t("editProfile.changePassword")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#D4AF37"
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>
          )}

          {/* Save Button when editing */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveButtonText}>
                    {t("editProfile.saveChanges")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Bottom Padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onMediaPicked={handleAvatarPicked}
        mediaTypes="images"
        allowsEditing
        quality={0.8}
        aspect={[1, 1]}
        title={t("editProfile.changeAvatarTitle")}
      />
      <ConfirmModal />
    </ImageBackground>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: GUIDE_SPACING.md,
    fontSize: 14,
    color: GUIDE_COLORS.textSecondary,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D2B1F",
  },
  headerButton: {
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3D2B1F",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#C0392B",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUIDE_SPACING.md,
    paddingTop: GUIDE_SPACING.lg,
  },

  // Avatar Section
  avatarSection: {
    alignItems: "center",
    marginBottom: GUIDE_SPACING.xl,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: GUIDE_SPACING.sm,
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 47,
    backgroundColor: PREMIUM_COLORS.cream,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 2,
    ...GUIDE_SHADOWS.sm,
  },
  changeAvatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.sm,
    marginTop: GUIDE_SPACING.xs,
  },
  changeAvatarText: {
    fontSize: 13,
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },
  avatarName: {
    fontSize: 20,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
    marginTop: GUIDE_SPACING.xs,
  },
  roleBadge: {
    backgroundColor: PREMIUM_COLORS.goldLight,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    marginTop: GUIDE_SPACING.xs,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: PREMIUM_COLORS.goldDark,
  },

  // Section
  section: {
    marginBottom: GUIDE_SPACING.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: GUIDE_SPACING.sm,
  },
  sectionContent: {
    backgroundColor: "rgba(255, 251, 240, 0.92)",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    ...GUIDE_SHADOWS.sm,
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  infoRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PREMIUM_COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: GUIDE_COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: GUIDE_COLORS.textPrimary,
  },
  infoInput: {
    fontSize: 15,
    fontWeight: "500",
    color: GUIDE_COLORS.textPrimary,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.gold,
    paddingBottom: 4,
  },

  // Save Button
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: PREMIUM_COLORS.gold,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    marginTop: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  changePasswordButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 251, 240, 0.92)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  changePasswordText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D4AF37",
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  datePickerBtnText: {
    fontSize: 15,
    fontWeight: "500",
    color: GUIDE_COLORS.textPrimary,
  },
});

export default PersonalInfoScreen;
