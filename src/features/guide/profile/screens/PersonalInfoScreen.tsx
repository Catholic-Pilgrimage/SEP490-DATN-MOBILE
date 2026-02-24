/**
 * PersonalInfoScreen - View/Edit Personal Information
 * Displays user profile data from API with edit capability
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
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
          <Text style={styles.infoValue}>{value || "Chưa cập nhật"}</Text>
        )}
      </View>
    </View>
    {editable && !isEditing && (
      <Ionicons name="create-outline" size={18} color={GUIDE_COLORS.gray400} />
    )}
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
  const { profile, site, loading, refetch, updateProfile, isVerified } = useGuideProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleBack = useCallback(() => {
    if (isEditing) {
      Alert.alert(
        "Huỷ thay đổi?",
        "Các thay đổi chưa lưu sẽ bị mất.",
        [
          { text: "Tiếp tục chỉnh sửa", style: "cancel" },
          {
            text: "Huỷ",
            style: "destructive",
            onPress: () => {
              setIsEditing(false);
              // Reset form
              if (profile) {
                setFormData({
                  full_name: profile.full_name || "",
                  phone: profile.phone || "",
                  date_of_birth: profile.date_of_birth || "",
                });
              }
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [isEditing, navigation, profile]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    // Reset form
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        date_of_birth: profile.date_of_birth || "",
      });
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      const updateData = {
        full_name: formData.full_name,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
      };

      await updateProfile(updateData);

      Alert.alert("Thành công", "Thông tin đã được cập nhật");
      setIsEditing(false);
      await refetch();
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể cập nhật thông tin. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }, [formData, updateProfile, refetch]);

  const updateFormField = useCallback(
    (field: keyof typeof formData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Avatar URL
  const getAvatarUrl = () => {
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

  if (loading && !profile) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={PREMIUM_COLORS.cream} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back-ios" size={20} color={GUIDE_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        {isEditing ? (
          <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Huỷ</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Sửa</Text>
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
                  <Image source={{ uri: getAvatarUrl() }} style={styles.avatarImage} />
                </View>
              </LinearGradient>
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={22} color={PREMIUM_COLORS.gold} />
                </View>
              )}
            </View>
            {isEditing && (
              <TouchableOpacity style={styles.changeAvatarButton}>
                <Ionicons name="camera-outline" size={16} color={PREMIUM_COLORS.gold} />
                <Text style={styles.changeAvatarText}>Đổi ảnh</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.avatarName}>{profile?.full_name || "Hướng dẫn viên"}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {isVerified ? "Verified Local Guide" : "Local Guide"}
              </Text>
            </View>
          </View>

          {/* Basic Information */}
          <Section title="THÔNG TIN CƠ BẢN">
            <InfoRow
              icon="person-outline"
              label="Họ và tên"
              value={isEditing ? formData.full_name : profile?.full_name || ""}
              editable
              isEditing={isEditing}
              onChangeText={updateFormField("full_name")}
              placeholder="Nhập họ và tên"
            />
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={profile?.email || ""}
              editable={false}
            />
            <InfoRow
              icon="call-outline"
              label="Số điện thoại"
              value={isEditing ? formData.phone : profile?.phone || ""}
              editable
              isEditing={isEditing}
              onChangeText={updateFormField("phone")}
              placeholder="Nhập số điện thoại"
              keyboardType="phone-pad"
            />
            <InfoRow
              icon="calendar-outline"
              label="Ngày sinh"
              value={
                isEditing
                  ? formData.date_of_birth
                  : formatDate(profile?.date_of_birth || "")
              }
              editable
              isEditing={isEditing}
              onChangeText={updateFormField("date_of_birth")}
              placeholder="DD/MM/YYYY"
            />
          </Section>

          {/* Assignment Information */}
          <Section title="THÔNG TIN PHÂN CÔNG">
            <InfoRow
              icon="business-outline"
              label="Địa điểm phục vụ"
              value={site?.name || "Chưa được gán địa điểm"}
            />
            <InfoRow
              icon="location-outline"
              label="Địa chỉ"
              value={site?.address || ""}
            />
            <InfoRow
              icon="globe-outline"
              label="Khu vực"
              value={site?.province || ""}
            />
          </Section>

          {/* Account Information */}
          <Section title="THÔNG TIN TÀI KHOẢN">
            <InfoRow
              icon="shield-checkmark-outline"
              label="Trạng thái xác minh"
              value={isVerified ? "Đã xác minh" : "Chưa xác minh"}
            />
            <InfoRow
              icon="time-outline"
              label="Ngày xác minh"
              value={profile?.verified_at ? formatDateTime(profile.verified_at) : "—"}
            />
            <InfoRow
              icon="language-outline"
              label="Ngôn ngữ"
              value={profile?.language === "vi" ? "Tiếng Việt" : "English"}
            />
            <InfoRow
              icon="calendar-outline"
              label="Ngày tham gia"
              value={formatDateTime(profile?.created_at || "")}
            />
          </Section>

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
                  <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Bottom Padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cream,
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
    backgroundColor: PREMIUM_COLORS.cream,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
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
    color: GUIDE_COLORS.textPrimary,
  },
  headerButton: {
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: GUIDE_COLORS.error,
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
    backgroundColor: "#FFFFFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
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
});

export default PersonalInfoScreen;
