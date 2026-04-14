import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../constants/theme.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import { FriendshipSearchResponse } from "../../../../types/pilgrim";
import { FriendListItemComp } from "../components/FriendListItem";
import { useFriendship } from "../hooks/useFriendship";

type Tab = "friends" | "requests";

export default function FriendListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [searchedUser, setSearchedUser] =
    useState<FriendshipSearchResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    loading,
    friends,
    pendingRequests,
    fetchFriends,
    fetchPendingRequests,
    respondToRequest,
    removeFriend,
    sendRequest,
    searchUserByEmail,
  } = useFriendship();

  const normalizeEmail = (value: string) => value.trim().toLowerCase();
  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddEmail("");
    setSearchedUser(null);
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (activeTab === "friends") {
      fetchFriends();
    } else {
      fetchPendingRequests();
    }
  }, [activeTab, fetchFriends, fetchPendingRequests]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const onRefresh = () => {
    if (activeTab === "friends") {
      fetchFriends();
    } else {
      fetchPendingRequests();
    }
  };

  const handleRemoveFriend = async (friendId: string, name: string) => {
    const isConfirmed = await confirm({
      title: t("friends.removeConfirmTitle"),
      message: t("friends.removeConfirmMsg", { name }),
      confirmText: t("common.confirm"),
      cancelText: t("friends.cancel"),
      type: "warning",
    });

    if (isConfirmed) {
      await removeFriend(friendId, name);
    }
  };

  const handleAddFriend = async () => {
    const normalizedEmail = normalizeEmail(addEmail);

    if (!normalizedEmail) {
      Alert.alert(t("common.error"), t("friends.emailRequired"));
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert(
        t("common.error"),
        t("friends.emailInvalid", {
          defaultValue: "Email không hợp lệ. Vui lòng kiểm tra lại.",
        }),
      );
      return;
    }

    setIsSubmitting(true);

    const isSameAsCurrentResult =
      searchedUser?.email &&
      normalizeEmail(searchedUser.email) === normalizedEmail;

    if (!isSameAsCurrentResult) {
      const result = await searchUserByEmail(normalizedEmail);
      setIsSubmitting(false);
      if (result) {
        setSearchedUser(result);
      }
      return;
    }

    const currentStatus = searchedUser?.friendship_status ?? null;

    if (currentStatus === null || currentStatus === "rejected") {
      const sent = await sendRequest(searchedUser.id);
      setIsSubmitting(false);
      if (sent) {
        closeAddModal();
        void fetchPendingRequests();
      }
      return;
    }

    setIsSubmitting(false);

    if (currentStatus === "accepted") {
      Alert.alert(
        t("friends.alreadyFriends", { defaultValue: "Đã là bạn bè" }),
        t("friends.alreadyFriendsMsg", {
          defaultValue: "Hai bạn đã là bạn bè rồi.",
        }),
      );
      return;
    }

    if (currentStatus === "pending") {
      Alert.alert(
        t("friends.pendingAlready", { defaultValue: "Yêu cầu đang chờ" }),
        t("friends.pendingAlreadyMsg", {
          defaultValue: "Bạn đã gửi lời mời kết bạn trước đó.",
        }),
      );
      return;
    }

    if (currentStatus === "blocked") {
      Alert.alert(
        t("friends.blockedTitle", { defaultValue: "Không thể kết bạn" }),
        t("friends.blockedMsg", {
          defaultValue: "Bạn không thể gửi lời mời kết bạn với tài khoản này.",
        }),
      );
    }
  };

  const normalizedInputEmail = normalizeEmail(addEmail);
  const isSearchedEmailMatched =
    !!searchedUser &&
    normalizeEmail(searchedUser.email) === normalizedInputEmail;

  const relationshipStatus =
    searchedUser?.friendship_status === "pending" ||
    searchedUser?.friendship_status === "accepted" ||
    searchedUser?.friendship_status === "rejected" ||
    searchedUser?.friendship_status === "blocked"
      ? searchedUser.friendship_status
      : null;

  const getActionLabel = () => {
    if (!isSearchedEmailMatched) {
      return t("friends.searchUser", { defaultValue: "Tìm người dùng" });
    }

    if (relationshipStatus === null || relationshipStatus === "rejected") {
      return t("friends.addFriendAction", { defaultValue: "Thêm bạn" });
    }
    if (relationshipStatus === "pending") {
      return t("friends.pendingAction", { defaultValue: "Đang chờ" });
    }
    if (relationshipStatus === "accepted") {
      return t("friends.acceptedAction", { defaultValue: "Đã là bạn" });
    }
    if (relationshipStatus === "blocked") {
      return t("friends.blockedAction", { defaultValue: "Không thể thêm" });
    }
    return t("friends.pendingAction", { defaultValue: "Đang chờ" });
  };

  const filteredData = (
    activeTab === "friends" ? friends : pendingRequests
  ).filter(
    (item) =>
      item.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      item.user.email.toLowerCase().includes(search.toLowerCase()),
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === "friends" ? "people-outline" : "mail-outline"}
        size={64}
        color="#D1D5DB"
      />
      <Text style={styles.emptyText}>
        {activeTab === "friends"
          ? t("friends.emptyFriends")
          : t("friends.emptyRequests")}
      </Text>
    </View>
  );

  return (
    <ImageBackground
      source={require("../../../../../assets/images/profile-bg.jpg")}
      style={styles.backgroundImage}
      resizeMode="cover"
      fadeDuration={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("friends.screenTitle")}</Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addBtn}
          >
            <Ionicons
              name="person-add-outline"
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* SEARCH */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder={t("friends.searchPlaceholder")}
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "friends" && styles.activeTab]}
            onPress={() => setActiveTab("friends")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "friends" && styles.activeTabText,
              ]}
            >
              {t("friends.tabFriends")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "requests" && styles.activeTab]}
            onPress={() => setActiveTab("requests")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "requests" && styles.activeTabText,
              ]}
            >
              {t("friends.tabRequests")}
            </Text>
            {pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* LIST */}
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.friendship_id}
          renderItem={({ item }) => (
            <FriendListItemComp
              item={item}
              onAccept={() => respondToRequest(item.friendship_id, "accept")}
              onReject={() => respondToRequest(item.friendship_id, "reject")}
              onRemove={() =>
                handleRemoveFriend(item.user.id, item.user.full_name)
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator
                style={{ marginTop: 40 }}
                color={COLORS.primary}
              />
            ) : (
              renderEmpty()
            )
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} />
          }
        />

        {/* ADD FRIEND MODAL */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={closeAddModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
          >
            <View
              style={[
                styles.modalOverlayInner,
                isKeyboardVisible && styles.modalOverlayInnerKeyboard,
              ]}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{t("friends.addFriend")}</Text>
                <Text style={styles.modalSub}>{t("friends.emailSub")}</Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder={t("friends.emailPlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  value={addEmail}
                  onChangeText={(value) => {
                    setAddEmail(value);
                    setSearchedUser(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />

                {isSearchedEmailMatched && searchedUser && (
                  <View style={styles.searchResultCard}>
                    <View style={styles.searchResultAvatar}>
                      <Text style={styles.searchResultAvatarText}>
                        {(searchedUser.full_name || searchedUser.email)
                          .trim()
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName} numberOfLines={1}>
                        {searchedUser.full_name || searchedUser.email}
                      </Text>
                      <Text style={styles.searchResultEmail} numberOfLines={1}>
                        {searchedUser.email}
                      </Text>
                      <Text style={styles.searchResultStatus}>
                        {t("friends.relationshipStatus", {
                          defaultValue: "Trạng thái",
                        })}
                        :{" "}
                        {relationshipStatus === null
                          ? t("friends.statusNone", {
                              defaultValue: "Chưa kết nối",
                            })
                          : relationshipStatus === "pending"
                            ? t("friends.statusPending", {
                                defaultValue: "Đang chờ",
                              })
                            : relationshipStatus === "accepted"
                              ? t("friends.statusAccepted", {
                                  defaultValue: "Đã là bạn",
                                })
                              : relationshipStatus === "rejected"
                                ? t("friends.statusRejected", {
                                    defaultValue: "Đã từ chối",
                                  })
                                : relationshipStatus === "blocked"
                                  ? t("friends.statusBlocked", {
                                      defaultValue: "Đã chặn",
                                    })
                                  : t("friends.statusNone", {
                                      defaultValue: "Chưa kết nối",
                                    })}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={closeAddModal}
                  >
                    <Text style={styles.cancelBtnText}>
                      {t("friends.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.submitBtn]}
                    onPress={handleAddFriend}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {getActionLabel()}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 251, 240, 0.88)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.25)",
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  searchSection: {
    padding: SPACING.md,
    backgroundColor: "rgba(255, 251, 240, 0.82)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 44,
    borderWidth: 1,
    borderColor: "#E5E1D8",
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.xs,
    fontSize: 15,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 251, 240, 0.82)",
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.25)",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: "#9CA3AF",
  },
  addBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalOverlayInnerKeyboard: {
    justifyContent: "flex-end",
    paddingBottom: SPACING.md,
  },
  modalContent: {
    backgroundColor: "rgba(255, 251, 240, 0.98)",
    borderRadius: 24,
    padding: SPACING.lg,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.32)",
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 14,
    color: "#6C8CA3",
    marginBottom: SPACING.lg,
  },
  modalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: BORDER_RADIUS.md,
    height: 50,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: "#1A1A1A",
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "#E5E1D8",
  },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "#E5E1D8",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  searchResultAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E5E1D8",
    borderWidth: 1,
    borderColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  searchResultAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B8860B",
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  searchResultEmail: {
    fontSize: 13,
    color: "#6C8CA3",
    marginTop: 2,
  },
  searchResultStatus: {
    fontSize: 12,
    color: "#6C8CA3",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#F7F5F2",
    borderWidth: 1,
    borderColor: "#E5E1D8",
  },
  submitBtn: {
    backgroundColor: "#D4AF37",
  },
  cancelBtnText: {
    color: "#6C8CA3",
    fontWeight: "600",
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
