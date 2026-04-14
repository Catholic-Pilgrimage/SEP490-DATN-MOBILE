import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    FlatList,
    Image,
    Keyboard,
    Platform,
    Animated as RNAnimated,
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
    TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import { PlannerMessage } from "../../../../types/pilgrim/planner.types";

const POLL_INTERVAL = 8000;
const PAGE_SIZE = 30;

/** Cũ → mới (tin mới nhất ở cuối mảng), giống Messenger / FB. */
const sortMessagesOldestFirst = (msgs: PlannerMessage[]): PlannerMessage[] =>
  [...msgs].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

const PlanChatScreen = ({ route, navigation }: any) => {
  const { planId, planName, ownerId } = route.params;
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState<PlannerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didInitialScrollRef = useRef(false);
  const lastNewestMessageIdRef = useRef<string | null>(null);
  const keyboardHeight = useRef(new RNAnimated.Value(0)).current;

  // Keyboard handling
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const kbHeight = e.endCoordinates.height;
      RNAnimated.timing(keyboardHeight, {
        toValue: Platform.OS === "ios" ? kbHeight - insets.bottom : kbHeight,
        duration: Platform.OS === "ios" ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      RNAnimated.timing(keyboardHeight, {
        toValue: 0,
        duration: Platform.OS === "ios" ? 250 : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  // --- Fetch messages ---
  const fetchMessages = useCallback(
    async (pageNum: number, append = false) => {
      try {
        const res = await pilgrimPlannerApi.getPlanMessages(planId, {
          page: pageNum,
          limit: PAGE_SIZE,
        });
        const data = res.data ?? (res as any);
        const fetched = data?.messages ?? [];
        if (fetched.length > 0 || !append) {
          if (append) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newOnes = fetched.filter(
                (m: any) => !existingIds.has(m.id),
              );
              return sortMessagesOldestFirst([...newOnes, ...prev]);
            });
          } else {
            setMessages(sortMessagesOldestFirst(fetched));
          }
        }
        const total = data?.pagination?.total ?? 0;
        setHasMore(pageNum * PAGE_SIZE < total);
      } catch {
        // silent
      }
    },
    [planId],
  );

  useEffect(() => {
    didInitialScrollRef.current = false;
    lastNewestMessageIdRef.current = null;
    setPage(1);
    setHasMore(true);
  }, [planId]);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchMessages(1);
      setLoading(false);
    })();
  }, [fetchMessages]);

  // Lần đầu vào: cuộn xuống cuối; tin mới (poll / gửi): cuộn theo nếu có tin mới nhất mới.
  useEffect(() => {
    if (loading || messages.length === 0) return;
    const newestId = messages[messages.length - 1]?.id ?? null;

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      if (newestId) lastNewestMessageIdRef.current = newestId;
      requestAnimationFrame(() =>
        flatListRef.current?.scrollToEnd({ animated: false }),
      );
      return;
    }

    if (
      newestId &&
      lastNewestMessageIdRef.current != null &&
      newestId !== lastNewestMessageIdRef.current
    ) {
      lastNewestMessageIdRef.current = newestId;
      requestAnimationFrame(() =>
        flatListRef.current?.scrollToEnd({ animated: true }),
      );
    }
  }, [loading, messages]);

  // Polling for new messages
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await pilgrimPlannerApi.getPlanMessages(planId, {
          page: 1,
          limit: PAGE_SIZE,
        });
        if (res.success !== false) {
          const data = res.data ?? (res as any);
          const fetched = data?.messages ?? [];
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = fetched.filter(
              (m: PlannerMessage) => !existingIds.has(m.id),
            );
            if (newOnes.length === 0) return prev;
            return sortMessagesOldestFirst([...prev, ...newOnes]);
          });
        }
      } catch {
        // silent
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [planId]);

  // Load more (older messages)
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchMessages(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, fetchMessages]);

  // --- Send message ---
  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText("");
    try {
      const res = await pilgrimPlannerApi.sendPlanMessage(planId, {
        message_type: "text",
        content,
      });
      if ((res.success || res.data) && res.data) {
        setMessages((prev) => sortMessagesOldestFirst([...prev, res.data!]));
      } else {
        Alert.alert(
          t("common.error", { defaultValue: "Lỗi" }),
          res.message ||
            t("chat.sendFailed", {
              defaultValue: "Không thể gửi tin nhắn. Vui lòng thử lại.",
            }),
        );
        setText(content);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t("chat.sendFailed", {
          defaultValue: "Không thể gửi tin nhắn. Vui lòng thử lại.",
        });
      Alert.alert(t("common.error", { defaultValue: "Lỗi" }), message);
      setText(content);
    } finally {
      setSending(false);
    }
  }, [text, sending, planId, t]);

  // --- Actions Menu ---
  const showMessageMenu = useCallback(
    (item: PlannerMessage) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const own = isOwn(item);
      const isPlanOwner = user?.id === ownerId;
      const canDelete = own || isPlanOwner;

      const options: Array<{
        text: string;
        onPress: () => void;
        style?: "default" | "destructive" | "cancel";
      }> = [
        {
          text: t("chat.copyMessage", { defaultValue: "Sao chép tin nhắn" }),
          onPress: () => {
            if (item.content) {
              Clipboard.setString(item.content);
            }
          },
        },
      ];

      if (canDelete) {
        options.push({
          text: t("chat.deleteMessage", { defaultValue: "Xóa tin nhắn" }),
          style: "destructive",
          onPress: () => handleDelete(item.id),
        });
      }

      options.push({
        text: t("common.close", { defaultValue: "Đóng" }),
        onPress: () => {},
      });

      Alert.alert(
        t("chat.messageOptions", { defaultValue: "Tùy chọn tin nhắn" }),
        undefined,
        options.map((opt) => ({
          text: opt.text,
          onPress: opt.onPress,
          style: (opt.style || "default") as any,
        })),
      );
    },
    [ownerId, user?.id, t],
  );

  const handleDelete = useCallback(
    (messageId: string) => {
      Alert.alert(
        t("chat.deleteTitle", { defaultValue: "Xóa tin nhắn" }),
        t("chat.deleteConfirm", {
          defaultValue: "Bạn có chắc muốn xóa tin nhắn này?",
        }),
        [
          {
            text: t("common.cancel", { defaultValue: "Hủy" }),
            style: "cancel",
          },
          {
            text: t("common.delete", { defaultValue: "Xóa" }),
            style: "destructive",
            onPress: async () => {
              try {
                const res = await pilgrimPlannerApi.deletePlanMessage(
                  planId,
                  messageId,
                );
                if (res.success !== false) {
                  setMessages((prev) => prev.filter((m) => m.id !== messageId));
                }
              } catch {
                Alert.alert(
                  t("common.error", { defaultValue: "Lỗi" }),
                  t("chat.deleteFailed", {
                    defaultValue: "Không thể xóa tin nhắn.",
                  }),
                );
              }
            },
          },
        ],
      );
    },
    [planId, t],
  );

  // --- Helpers ---
  const isOwn = (msg: PlannerMessage) => {
    if (!user?.id) return false;
    const uid = String(user.id);
    return (
      String(msg.user_id) === uid ||
      String(msg.sender?.id) === uid ||
      String(msg.user?.id) === uid
    );
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const locale = i18n.language === "en" ? "en-US" : "vi-VN";
    return d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return t("chat.today", { defaultValue: "Hôm nay" });
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return t("chat.yesterday", { defaultValue: "Hôm qua" });
    }
    const locale = i18n.language === "en" ? "en-US" : "vi-VN";
    return d.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /** data cũ → mới: hiện nhãn ngày phía trên tin đầu của ngày mới. */
  const shouldShowDate = (index: number): boolean => {
    if (index === 0) return true;
    const prevDay = new Date(messages[index - 1].created_at).toDateString();
    const curDay = new Date(messages[index].created_at).toDateString();
    return prevDay !== curDay;
  };

  // --- Render message ---
  const renderMessage = ({
    item,
    index,
  }: {
    item: PlannerMessage;
    index: number;
  }) => {
    const own = isOwn(item);
    const sender = item.user ?? item.sender;
    const next = messages[index + 1];
    const showAvatar =
      !own &&
      (index === messages.length - 1 ||
        String(next?.user_id) !== String(item.user_id) ||
        (next != null && shouldShowDate(index + 1)));

    return (
      <View>
        {shouldShowDate(index) && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatDateSeparator(item.created_at)}
            </Text>
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => showMessageMenu(item)}
          style={[
            styles.messageRow,
            own ? styles.messageRowOwn : styles.messageRowOther,
          ]}
        >
          {/* Avatar */}
          {!own && (
            <View style={styles.avatarContainer}>
              {showAvatar ? (
                sender?.avatar_url ? (
                  <Image
                    source={{ uri: sender.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {(sender?.full_name || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                )
              ) : (
                <View style={styles.avatarSpacer} />
              )}
            </View>
          )}

          <View
            style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}
          >
            {!own && showAvatar && (
              <Text style={styles.senderName}>
                {sender?.full_name ||
                  t("chat.unknown", { defaultValue: "Ẩn danh" })}
              </Text>
            )}
            {item.message_type === "image" && item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : null}
            {item.content ? (
              <Text style={[styles.messageText, own && styles.messageTextOwn]}>
                {item.content}
              </Text>
            ) : null}
            <Text style={[styles.timeText, own && styles.timeTextOwn]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // --- Render ---
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {planName || t("chat.groupChat", { defaultValue: "Nhóm chat" })}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t("chat.planChat", { defaultValue: "Chat kế hoạch" })}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={COLORS.textTertiary}
          />
          <Text style={styles.emptyText}>
            {t("chat.empty", {
              defaultValue:
                "Chưa có tin nhắn nào.\nHãy bắt đầu cuộc trò chuyện!",
            })}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          maintainVisibleContentPosition={
            loadingMore
              ? { minIndexForVisible: 0, autoscrollToTopThreshold: 24 }
              : undefined
          }
          onStartReached={handleLoadMore}
          onStartReachedThreshold={0.35}
          ListHeaderComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color={COLORS.accent}
                style={{ marginVertical: SPACING.md }}
              />
            ) : null
          }
        />
      )}

      {/* Input */}
      <RNAnimated.View
        style={[
          styles.inputContainer,
          {
            paddingBottom: insets.bottom || 8,
            marginBottom: keyboardHeight,
          },
        ]}
      >
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t("chat.placeholder", {
            defaultValue: "Nhập tin nhắn...",
          })}
          placeholderTextColor={COLORS.textTertiary}
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </RNAnimated.View>
    </View>
  );
};

export default PlanChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginTop: SPACING.md,
    lineHeight: 22,
  },

  // Messages
  messageList: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-end",
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },

  // Avatar
  avatarContainer: {
    width: 32,
    marginRight: SPACING.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  avatarSpacer: {
    width: 32,
    height: 32,
  },

  // Bubble
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleOwn: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    ...SHADOWS.subtle,
  },
  senderName: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.accent,
    marginBottom: 2,
  },
  messageText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: "#fff",
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextOwn: {
    color: "rgba(255,255,255,0.7)",
  },

  // Date separator
  dateSeparator: {
    alignItems: "center",
    marginVertical: SPACING.sm,
  },
  dateSeparatorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.backgroundSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    overflow: "hidden",
  },

  // Input
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: SPACING.sm,
    paddingTop: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    maxHeight: 100,
    minHeight: 40,
    marginRight: SPACING.sm,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 1,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
});
