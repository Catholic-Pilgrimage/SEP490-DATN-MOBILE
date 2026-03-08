import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

import { SHADOWS } from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import useI18n from "../../../../hooks/useI18n";
import { UserProfile } from "../../../../types/user.types";

// Premium color palette (Consistent with ProfileScreen)
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F4E4BA",
  goldDark: "#B8860B",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  emerald: "#10B981",
  error: "#DC4C4C",
  textMuted: "#6C8CA3",
  borderLight: "#e4e0d3",
};

// Info Row Component
interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  editable?: boolean;
  onChangeText?: (text: string) => void;
  isEditing?: boolean;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  multiline?: boolean;
  notUpdatedText?: string;
}

const InfoRow = ({
  icon,
  label,
  value,
  editable = false,
  onChangeText,
  isEditing = false,
  placeholder,
  keyboardType = "default",
  multiline = false,
  notUpdatedText = "Chưa cập nhật",
}: InfoRowProps) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowLeft}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={20} color={PREMIUM_COLORS.gold} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        {isEditing && editable ? (
          <TextInput
            style={[styles.infoInput, multiline && styles.infoInputMultiline]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={PREMIUM_COLORS.textMuted}
            keyboardType={keyboardType}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
          />
        ) : (
          <Text style={styles.infoValue}>{value || notUpdatedText}</Text>
        )}
      </View>
    </View>
    {/* Pencil icon removed for cleaner batch edit UX */}
  </View>
);

// Section Component
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const EditProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {
    user,
    updateProfile,
    getProfile,
    isLoading: isAuthLoading,
  } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const { t } = useI18n();

  // Cast user to UserProfile to access optional fields if they exist in runtime
  const userProfile = user as UserProfile;

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    dateOfBirth: "",
  });

  // Refresh profile on mount to ensure we have latest data (and mapped correctly)
  useEffect(() => {
    getProfile();
  }, []);

  // Initialize form with profile data
  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || "",
        phone: userProfile.phone || "",
        dateOfBirth: userProfile.dateOfBirth || "",
      });
    }
  }, [userProfile]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getProfile();
    setRefreshing(false);
  }, [getProfile]);

  const handleBack = useCallback(() => {
    if (isEditing) {
      Alert.alert(
        t("editProfile.discardTitle"),
        t("editProfile.discardMessage"),
        [
          { text: t("editProfile.continueEditing"), style: "cancel" },
          {
            text: t("editProfile.discard"),
            style: "destructive",
            onPress: () => {
              setIsEditing(false);
              if (userProfile) {
                setFormData({
                  fullName: userProfile.fullName || "",
                  phone: userProfile.phone || "",
                  dateOfBirth: userProfile.dateOfBirth || "",
                });
              }
              navigation.goBack();
            },
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  }, [isEditing, navigation, userProfile, t]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    // Reset form
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || "",
        phone: userProfile.phone || "",
        dateOfBirth: userProfile.dateOfBirth || "",
      });
    }
  }, [userProfile]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const message = await updateProfile({
        ...formData,
        ...(avatarUri ? { avatar: avatarUri } : {}),
      });
      Toast.show({
        type: "success",
        text1: message || "Thông tin đã được cập nhật",
      });
      setIsEditing(false);
      setAvatarUri(null);
      await getProfile();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error.message || t("editProfile.updateError"),
      });
    } finally {
      setIsSaving(false);
    }
  }, [formData, avatarUri, updateProfile, getProfile]);

  const updateFormField = useCallback(
    (field: keyof typeof formData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const pickAvatar = async () => {
    Alert.alert(
      t("editProfile.changeAvatarTitle"),
      t("editProfile.chooseSource"),
      [
        {
          text: t("editProfile.takePhoto"),
          onPress: async () => {
            const permission =
              await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Toast.show({
                type: "error",
                text1: t("editProfile.permissionDenied"),
                text2: t("editProfile.cameraPermission"),
              });
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets.length > 0)
              setAvatarUri(result.assets[0].uri);
          },
        },
        {
          text: t("editProfile.photoLibrary"),
          onPress: async () => {
            const permission =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Toast.show({
                type: "error",
                text1: t("editProfile.permissionDenied"),
                text2: t("editProfile.libraryPermission"),
              });
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets.length > 0)
              setAvatarUri(result.assets[0].uri);
          },
        },
        { text: t("editProfile.cancel"), style: "cancel" },
      ],
    );
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      setFormData((prev) => ({ ...prev, dateOfBirth: `${yyyy}-${mm}-${dd}` }));
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      // Check if valid date
      if (isNaN(date.getTime())) return dateString;
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
      if (isNaN(date.getTime())) return dateString;
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

  if (isAuthLoading && !user) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
        <Text style={styles.loadingText}>{t("editProfile.loading")}</Text>
      </View>
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
              colors={[PREMIUM_COLORS.gold]}
              tintColor={PREMIUM_COLORS.gold}
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
                  {avatarUri || user?.avatar ? (
                    <Image
                      source={{ uri: avatarUri || user!.avatar }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarImage,
                        {
                          backgroundColor: PREMIUM_COLORS.goldLight,
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="person"
                        size={40}
                        color={PREMIUM_COLORS.goldDark}
                      />
                    </View>
                  )}
                </View>
              </LinearGradient>
              {user?.isVerified && (
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
              {user?.fullName || t("editProfile.defaultName")}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.isVerified
                  ? t("editProfile.pilgrimRoleVerified")
                  : t("editProfile.pilgrimRole")}
              </Text>
            </View>
          </View>

          {/* Basic Information */}
          <Section title={t("editProfile.sections.basicInfo")}>
            <InfoRow
              icon="person-outline"
              label={t("editProfile.fields.fullName")}
              value={
                isEditing ? formData.fullName : userProfile?.fullName || ""
              }
              editable
              isEditing={isEditing}
              onChangeText={updateFormField("fullName")}
              placeholder={t("editProfile.placeholders.fullName")}
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="mail-outline"
              label={t("editProfile.fields.email")}
              value={userProfile?.email || ""}
              editable={false}
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="call-outline"
              label={t("editProfile.fields.phone")}
              value={isEditing ? formData.phone : userProfile?.phone || ""}
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
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={PREMIUM_COLORS.gold}
                />
                <View>
                  <Text
                    style={[
                      styles.datePickerBtnText,
                      {
                        fontSize: 12,
                        color: PREMIUM_COLORS.textMuted,
                        marginBottom: 2,
                      },
                    ]}
                  >
                    {t("editProfile.fields.dateOfBirth")}
                  </Text>
                  <Text style={styles.datePickerBtnText}>
                    {formData.dateOfBirth
                      ? formatDate(formData.dateOfBirth)
                      : t("editProfile.placeholders.dateOfBirth")}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <InfoRow
                icon="calendar-outline"
                label={t("editProfile.fields.dateOfBirth")}
                value={formatDate(userProfile?.dateOfBirth || "")}
                isEditing={false}
                notUpdatedText={t("editProfile.notUpdated")}
              />
            )}
            {showDatePicker && (
              <DateTimePicker
                value={
                  formData.dateOfBirth
                    ? new Date(formData.dateOfBirth)
                    : new Date(2000, 0, 1)
                }
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </Section>

          {/* Account Information */}
          <Section title={t("editProfile.sections.accountInfo")}>
            <InfoRow
              icon="shield-checkmark-outline"
              label={t("editProfile.fields.verificationStatus")}
              value={
                user?.isVerified
                  ? t("editProfile.verified")
                  : t("editProfile.notVerified")
              }
              notUpdatedText={t("editProfile.notUpdated")}
            />
            <InfoRow
              icon="time-outline"
              label={t("editProfile.fields.joinedAt")}
              value={formatDateTime(user?.createdAt || "")}
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

          {/* Save Button */}
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

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

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
    marginTop: 16,
    fontSize: 14,
    color: PREMIUM_COLORS.textMuted,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: PREMIUM_COLORS.goldDark,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#C0392B",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Avatar Section
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 8,
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
    ...SHADOWS.small,
  },
  changeAvatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  changeAvatarText: {
    fontSize: 13,
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },
  avatarName: {
    fontSize: 20,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    marginTop: 8,
  },
  roleBadge: {
    backgroundColor: PREMIUM_COLORS.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginTop: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: PREMIUM_COLORS.goldDark,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: PREMIUM_COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  sectionContent: {
    backgroundColor: "rgba(255, 251, 240, 0.92)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    overflow: "hidden",
    ...SHADOWS.small,
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.borderLight,
  },
  infoRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
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
    color: PREMIUM_COLORS.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: PREMIUM_COLORS.charcoal,
  },
  infoInput: {
    fontSize: 15,
    fontWeight: "500",
    color: PREMIUM_COLORS.charcoal,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.gold,
    paddingBottom: 4,
    height: 30, // Fixed height for single line
  },
  infoInputMultiline: {
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.gold,
  },

  // Save Button
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PREMIUM_COLORS.gold,
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 8,
    ...SHADOWS.medium,
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
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.borderLight,
  },
  datePickerBtnText: {
    fontSize: 14,
    color: PREMIUM_COLORS.goldDark,
    fontWeight: "500",
  },
});

export default EditProfileScreen;
