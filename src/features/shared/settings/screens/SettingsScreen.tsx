import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
    Alert,
    ImageBackground,
    Modal,
    Pressable,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { SHADOWS } from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import { useConfirm } from "../../../../hooks/useConfirm";
import useI18n from "../../../../hooks/useI18n";
import { authApi } from "../../../../services/api";

// Theme Colors
const SETTINGS_COLORS = {
  primary: "#cfaa3a",
  primaryLight: "rgba(207, 170, 58, 0.1)",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  textMuted: "#6C8CA3",
  borderLight: "#e4e0d3",
  white: "#FFFFFF",
  danger: "#DC4C4C",
};

// Toggle Switch Component
const SettingToggle = ({
  icon,
  label,
  value,
  onValueChange,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  description?: string;
}) => (
  <View style={styles.settingItem}>
    <View style={styles.settingLeft}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={SETTINGS_COLORS.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
    </View>
    <Switch
      trackColor={{ false: "#e0e0e0", true: SETTINGS_COLORS.primary }}
      thumbColor={SETTINGS_COLORS.white}
      ios_backgroundColor="#e0e0e0"
      onValueChange={onValueChange}
      value={value}
    />
  </View>
);

// Menu Item Component
const SettingItem = ({
  icon,
  label,
  onPress,
  value,
  danger = false,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  value?: string;
  danger?: boolean;
  isLast?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.settingItem, isLast && styles.settingItemLast]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingLeft}>
      <View style={[styles.iconContainer, danger && styles.iconDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? SETTINGS_COLORS.danger : SETTINGS_COLORS.primary}
        />
      </View>
      <Text style={[styles.settingLabel, danger && styles.labelDanger]}>
        {label}
      </Text>
    </View>
    <View style={styles.settingRight}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      <Ionicons
        name="chevron-forward"
        size={20}
        color={SETTINGS_COLORS.textMuted}
        opacity={0.5}
      />
    </View>
  </TouchableOpacity>
);

// Section Header
const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { logout, user, isGuest } = useAuth();
  const { currentLanguageName, changeLanguage, languages, t } = useI18n();
  const { confirm, ConfirmModal } = useConfirm();

  // State for toggles
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const handleChangeLanguage = () => {
    setLanguageModalVisible(true);
  };

  const selectLanguage = async (lang: "vi" | "en") => {
    setLanguageModalVisible(false);
    try {
      await changeLanguage(lang === "vi" ? languages.VI : languages.EN);
      if (!isGuest) {
        await authApi.updateProfile({ language: lang });
      }
      Toast.show({
        type: "success",
        text1: lang === "vi" ? "Đã đổi sang Tiếng Việt" : "Switched to English",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || t("settings.cannotChangeLanguage"),
      });
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: t("settings.shareMessage"),
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Xoá tài khoản?",
      "Hành động này không thể hoàn tác. Mọi dữ liệu của bạn sẽ bị xoá vĩnh viễn.",
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xoá vĩnh viễn",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Yêu cầu đã gửi",
              "Chúng tôi sẽ xử lý yêu cầu của bạn trong vòng 30 ngày.",
            ),
        },
      ],
    );
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      type: "danger",
      iconName: "log-out-outline",
      title: t("settings.logoutConfirmTitle"),
      message: t("settings.logoutConfirmMessage"),
      confirmText: t("settings.logout"),
      cancelText: t("common.cancel"),
    });

    if (!confirmed) {
      return;
    }

    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      });
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert(t("common.error"), t("profile.logoutError"));
    }
  };

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#3D2B1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* General Settings */}
        <SectionHeader title={t("settings.sections.general")} />
        <View style={styles.sectionContainer}>
          <SettingToggle
            icon="notifications-outline"
            label={t("settings.notifications")}
            description={t("settings.notificationsDesc")}
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <View style={styles.divider} />
          <SettingToggle
            icon="finger-print-outline"
            label={t("settings.biometrics")}
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="language-outline"
            label={t("settings.language")}
            value={currentLanguageName}
            onPress={handleChangeLanguage}
            isLast
          />
        </View>

        {/* Support & About */}
        <SectionHeader title={t("settings.sections.support")} />
        <View style={styles.sectionContainer}>
          <SettingItem
            icon="help-circle-outline"
            label={t("settings.helpCenter")}
            onPress={() =>
              Alert.alert(t("common.ok"), t("settings.featureComingSoon"))
            }
          />
          <SettingItem
            icon="share-social-outline"
            label={t("settings.shareApp")}
            onPress={handleShareApp}
          />
          <SettingItem
            icon="star-outline"
            label={t("settings.rateApp")}
            onPress={() =>
              Alert.alert(t("settings.thankYou"), t("settings.thankYouMessage"))
            }
          />
          <SettingItem
            icon="document-text-outline"
            label={t("settings.terms")}
            onPress={() => Alert.alert(t("common.ok"), t("settings.showTerms"))}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label={t("settings.privacy")}
            onPress={() =>
              Alert.alert(t("common.ok"), t("settings.showPrivacy"))
            }
            isLast
          />
        </View>

        {/* Logout / Login Button */}
        {isGuest ? (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() =>
              navigation.reset({ index: 0, routes: [{ name: "Auth" }] })
            }
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>{t("settings.loginRegister")}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>{t("settings.logout")}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.versionText}>Nazareth Guild v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLanguageModalVisible(false)}
        >
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons
                  name="language"
                  size={22}
                  color={SETTINGS_COLORS.primary}
                />
              </View>
              <Text style={styles.modalTitle}>
                {t("settings.selectLanguage")}
              </Text>
            </View>

            {/* Language Options */}
            <TouchableOpacity
              style={[
                styles.langOption,
                currentLanguageName === "Tiếng Việt" && styles.langOptionActive,
              ]}
              onPress={() => selectLanguage("vi")}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>🇻🇳</Text>
              <Text
                style={[
                  styles.langLabel,
                  currentLanguageName === "Tiếng Việt" &&
                    styles.langLabelActive,
                ]}
              >
                Tiếng Việt
              </Text>
              {currentLanguageName === "Tiếng Việt" && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={SETTINGS_COLORS.primary}
                  style={{ marginLeft: "auto" }}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langOption,
                currentLanguageName === "English" && styles.langOptionActive,
              ]}
              onPress={() => selectLanguage("en")}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>🇬🇧</Text>
              <Text
                style={[
                  styles.langLabel,
                  currentLanguageName === "English" && styles.langLabelActive,
                ]}
              >
                English
              </Text>
              {currentLanguageName === "English" && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={SETTINGS_COLORS.primary}
                  style={{ marginLeft: "auto" }}
                />
              )}
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setLanguageModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmModal />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D2B1F",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: SETTINGS_COLORS.textMuted,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContainer: {
    backgroundColor: "rgba(255, 251, 240, 0.92)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    ...SHADOWS.small,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: SETTINGS_COLORS.borderLight,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: SETTINGS_COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  iconDanger: {
    backgroundColor: "rgba(220, 76, 76, 0.1)",
  },
  textContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: SETTINGS_COLORS.charcoal,
  },
  labelDanger: {
    color: SETTINGS_COLORS.danger,
  },
  settingDescription: {
    fontSize: 12,
    color: SETTINGS_COLORS.textMuted,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: SETTINGS_COLORS.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: SETTINGS_COLORS.borderLight,
    marginLeft: 60, // Align with text start
  },
  dangerSection: {
    borderColor: "rgba(220, 76, 76, 0.3)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 30,
    paddingVertical: 16,
    backgroundColor: SETTINGS_COLORS.primary,
    borderRadius: 16,
    ...SHADOWS.medium,
    // Custom shadow color
    shadowColor: SETTINGS_COLORS.primary,
    shadowOpacity: 0.2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: SETTINGS_COLORS.textMuted,
    opacity: 0.6,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalContainer: {
    backgroundColor: "rgba(255, 251, 240, 0.97)",
    borderRadius: 20,
    width: "100%",
    paddingBottom: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
    shadowColor: SETTINGS_COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.25)",
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SETTINGS_COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: SETTINGS_COLORS.charcoal,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.2)",
  },
  langOptionActive: {
    backgroundColor: SETTINGS_COLORS.primaryLight,
  },
  langFlag: {
    fontSize: 24,
  },
  langLabel: {
    fontSize: 15,
    color: SETTINGS_COLORS.charcoal,
    fontWeight: "500",
  },
  langLabelActive: {
    color: SETTINGS_COLORS.primary,
    fontWeight: "700",
  },
  modalCancelBtn: {
    alignItems: "center",
    paddingVertical: 16,
  },
  modalCancelText: {
    fontSize: 15,
    color: SETTINGS_COLORS.textMuted,
    fontWeight: "600",
  },
});

export default SettingsScreen;
