import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";

interface PostActionSheetProps {
  canTranslate?: boolean;
  busy?: boolean;
  /** Whether the current user is the owner of this post */
  isOwner?: boolean;
  isTranslated?: boolean;
  postContent?: string;
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReport: () => void;
  onTranslate?: () => void;
  /** Callback to send friend request to the post author */
  onAddFriend?: () => void;
  /** Callback to remove friend */
  onRemoveFriend?: () => void;
  /** Callback to respond to friend request (accept) */
  onRespondFriendRequest?: () => void;
  /** Current friendship status with the post author */
  friendshipStatus?: "pending_received" | "accepted" | "none" | null | undefined;
}

const PostActionSheet: React.FC<PostActionSheetProps> = ({
  canTranslate = false,
  busy = false,
  isOwner = false,
  isTranslated = false,
  postContent,
  visible,
  onClose,
  onDelete,
  onEdit,
  onReport,
  onTranslate,
  onAddFriend,
  onRemoveFriend,
  onRespondFriendRequest,
  friendshipStatus,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, SPACING.lg) },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>
            {t("postDetail.postActions", { defaultValue: "Post actions" })}
          </Text>
          {postContent ? (
            <Text style={styles.preview} numberOfLines={2}>
              {postContent}
            </Text>
          ) : null}

          {canTranslate && onTranslate ? (
            <TouchableOpacity
              style={styles.action}
              onPress={onTranslate}
              disabled={busy}
            >
              <MaterialIcons
                name="g-translate"
                size={20}
                color={busy ? COLORS.textTertiary : COLORS.info}
              />
              <Text style={styles.actionText}>
                {isTranslated
                  ? t("postDetail.viewOriginal", {
                      defaultValue: "View original",
                    })
                  : t("postDetail.translatePost", {
                      defaultValue: "Translate post",
                    })}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Owner-only actions: Edit & Delete */}
          {isOwner ? (
            <>
              <TouchableOpacity
                style={styles.action}
                onPress={onEdit}
                disabled={busy}
              >
                <MaterialIcons
                  name="edit"
                  size={20}
                  color={busy ? COLORS.textTertiary : COLORS.primary}
                />
                <Text style={styles.actionText}>
                  {t("postDetail.editPost", { defaultValue: "Edit post" })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.action}
                onPress={onDelete}
                disabled={busy}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color={busy ? COLORS.textTertiary : COLORS.danger}
                />
                <Text style={[styles.actionText, styles.actionTextDanger]}>
                  {t("postDetail.deletePost", { defaultValue: "Delete post" })}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Non-owner action: Friendship & Report */
            <>
              {onAddFriend && (
                <TouchableOpacity
                  style={styles.action}
                  onPress={
                    friendshipStatus === "accepted"
                      ? onRemoveFriend
                      : friendshipStatus === "pending_received"
                        ? onRespondFriendRequest
                        : onAddFriend
                  }
                  disabled={busy}
                >
                  <MaterialIcons
                    name={
                      friendshipStatus === "accepted"
                        ? "people"
                        : friendshipStatus === "pending_received"
                          ? "person-add"
                          : "person-add-alt"
                    }
                    size={20}
                    color={
                      busy
                        ? COLORS.textTertiary
                        : friendshipStatus === "accepted"
                          ? COLORS.primary
                          : COLORS.info
                    }
                  />
                  <Text
                    style={[
                      styles.actionText,
                      friendshipStatus === "accepted" && {
                        color: COLORS.primary,
                      },
                    ]}
                  >
                    {friendshipStatus === "accepted"
                      ? t("friends.alreadyFriends", {
                          defaultValue: "Bạn bè",
                        })
                      : friendshipStatus === "pending_received"
                        ? t("friends.acceptRequest", {
                            defaultValue: "Chấp nhận lời mời",
                          })
                        : t("postDetail.addFriend", {
                            defaultValue: "Kết bạn",
                          })}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.action}
                onPress={onReport}
                disabled={busy}
              >
                <MaterialIcons
                  name="flag"
                  size={20}
                  color={busy ? COLORS.textTertiary : COLORS.warning}
                />
                <Text style={styles.actionText}>
                  {t("postDetail.reportPost", { defaultValue: "Report post" })}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.cancel}
            onPress={onClose}
            disabled={busy}
          >
            <Text style={styles.cancelText}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    ...SHADOWS.large,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.borderMedium,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  preview: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  actionTextDanger: {
    color: COLORS.danger,
  },
  cancel: {
    marginTop: SPACING.sm,
    alignItems: "center",
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 14,
  },
  cancelText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});

export default PostActionSheet;
