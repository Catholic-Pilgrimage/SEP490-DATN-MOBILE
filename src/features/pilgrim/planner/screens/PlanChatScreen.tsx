import { Ionicons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Clipboard,
    FlatList,
    Image,
    ImageBackground,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    Animated as RNAnimated,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import { useConfirm } from "../../../../hooks/useConfirm";
import type { PilgrimMainStackParamList } from "../../../../navigation/pilgrimNavigation.types";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import { parseNotificationMessage } from "../../../../services/api/shared/notificationApi";
import { PlannerMessage } from "../../../../types/pilgrim/planner.types";
import { shouldOpenActiveJourneyFromPlannerList } from "../utils/plannerNavigation.utils";

const POLL_INTERVAL = 8000;
const PAGE_SIZE = 30;

type StructuredChatMessage = {
  message_key?: string;
  params?: Record<string, unknown>;
  default_message?:
    | string
    | {
        vi?: string;
        en?: string;
        [key: string]: string | undefined;
      };
};

/** Mới → cũ (tin mới nhất ở đầu mảng), dùng cho inverted list. */
const sortMessagesNewestFirst = (msgs: PlannerMessage[]): PlannerMessage[] =>
  [...msgs].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

type Props = NativeStackScreenProps<PilgrimMainStackParamList, "PlanChatScreen">;

const PlanChatScreen = ({ route, navigation }: Props) => {
  const { planId, planName, ownerId } = route.params;
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const [messages, setMessages] = useState<PlannerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [newJourneyName, setNewJourneyName] = useState("");
  const [apiContinuationId, setApiContinuationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchContinuationInfo = async () => {
      try {
        const res = await pilgrimPlannerApi.getPlanDetail(planId);
        if (res.success && res.data?.continuation_id) {
          setApiContinuationId(res.data.continuation_id);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchContinuationInfo();
  }, [planId]);

  const continuationPlanId = useMemo(() => {
    if (apiContinuationId) return apiContinuationId;
    for (const m of messages) {
      try {
        const raw = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
        const id = raw?.data?.plannerId || raw?.plannerId;
        if (id) return id;
        
        const contentStr = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        const uuidMatch = contentStr.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) return uuidMatch[0];
      } catch (e) { /* ignore */ }
    }
    return null;
  }, [messages, apiContinuationId]);

  const hasContinuationInHistory = useMemo(() => {
    if (continuationPlanId) return true;
    return messages.some(m => {
      const parsed = parseNotificationMessage(m.content, i18n.language).toLowerCase();
      return (
        parsed.includes('hành trình tiếp nối đã được tạo') || 
        parsed.includes('khởi tạo hành trình tiếp nối') ||
        parsed.includes('initiated a continuation journey') ||
        parsed.includes('continuation journey has been created')
      );
    });
  }, [messages, continuationPlanId, i18n.language]);

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
              return sortMessagesNewestFirst([...newOnes, ...prev]);
            });
          } else {
            setMessages(sortMessagesNewestFirst(fetched));
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

  // Lần đầu vào hoặc có tin mới không cần cuộn vì inverted FlatList tự đẩy tin nhắn mới ở đáy màn hình.
  useEffect(() => {
    if (loading || messages.length === 0) return;
    const newestId = messages[0]?.id ?? null;

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      if (newestId) lastNewestMessageIdRef.current = newestId;
      return;
    }

    if (
      newestId &&
      lastNewestMessageIdRef.current != null &&
      newestId !== lastNewestMessageIdRef.current
    ) {
      lastNewestMessageIdRef.current = newestId;
      // Inverted automatically handles appending new items at the bottom visually
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
            return sortMessagesNewestFirst([...prev, ...newOnes]);
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

  const handlePullRefresh = useCallback(async () => {
    try {
      setPullRefreshing(true);
      setPage(1);
      await fetchMessages(1, false);
    } finally {
      setPullRefreshing(false);
    }
  }, [fetchMessages]);

  // --- Send message (Optimistic UI) ---
  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || sending) return;

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: PlannerMessage = {
      id: tempId,
      message_type: "text",
      content,
      image_url: "",
      sender: {
        id: user?.id ? String(user.id) : "",
        full_name: user?.fullName || "",
        avatar_url: user?.avatar || "",
      },
      user_id: user?.id ? String(user.id) : "",
      user: {
        id: user?.id ? String(user.id) : "",
        full_name: user?.fullName || "",
        avatar_url: user?.avatar || "",
      },
      created_at: new Date().toISOString(),
      planner_id: planId,
    };

    setMessages((prev) => sortMessagesNewestFirst([...prev, optimisticMsg]));
    setText("");
    // We intentionally don't setSending(true) to allow rapid fire typing, 
    // but you can if you want strictly one message at a time.

    try {
      const res = await pilgrimPlannerApi.sendPlanMessage(planId, {
        message_type: "text",
        content,
      });
      if ((res.success || res.data) && res.data) {
        setMessages((prev) => 
          sortMessagesNewestFirst(prev.map((msg) => msg.id === tempId ? res.data! : msg))
        );
      } else {
        // Revert on failure
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        await confirm({
          iconName: "alert-circle-outline",
          title: t("common.error", { defaultValue: "Lỗi" }),
          message: res.message ||
            t("chat.sendFailed", {
              defaultValue: "Không thể gửi tin nhắn. Vui lòng thử lại.",
            }),
          showCancel: false,
        });
        setText(content);
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t("chat.sendFailed", {
          defaultValue: "Không thể gửi tin nhắn. Vui lòng thử lại.",
        });
      await confirm({
        iconName: "alert-circle-outline",
        title: t("common.error", { defaultValue: "Lỗi" }),
        message,
        showCancel: false,
      });
      setText(content);
    }
  }, [text, sending, planId, t, user, confirm]);

  // --- Helper: Upload & Send Image ---
  const uploadAndSendImage = async (uri: string) => {
    const tempId = `temp-img-${Date.now()}`;
    const optimisticMsg: PlannerMessage = {
      id: tempId,
      message_type: "image",
      content: "",
      image_url: uri,
      sender: {
        id: user?.id ? String(user.id) : "",
        full_name: user?.fullName || "",
        avatar_url: user?.avatar || "",
      },
      user_id: user?.id ? String(user.id) : "",
      user: {
        id: user?.id ? String(user.id) : "",
        full_name: user?.fullName || "",
        avatar_url: user?.avatar || "",
      },
      created_at: new Date().toISOString(),
      planner_id: planId,
    };

    setMessages((prev) => sortMessagesNewestFirst([...prev, optimisticMsg]));

    try {
      const res = await pilgrimPlannerApi.sendPlanMessage(planId, {
        message_type: "image",
        imageUri: uri,
      });

      if ((res.success || res.data) && res.data) {
        setMessages((prev) => 
          sortMessagesNewestFirst(prev.map((msg) => msg.id === tempId ? res.data! : msg))
        );
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        await confirm({
          iconName: "alert-circle-outline",
          title: t("common.error", { defaultValue: "Lỗi" }),
          message: res.message || "Không thể gửi ảnh lúc này.",
          showCancel: false,
        });
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      await confirm({
        iconName: "alert-circle-outline",
        title: t("common.error", { defaultValue: "Lỗi" }),
        message: error?.message || "Không thể gửi ảnh lúc này.",
        showCancel: false,
      });
    }
  };

  // --- Take Photo (Camera) ---
  const handleTakeImage = useCallback(async () => {
    try {
      if (sending) return;
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        await confirm({
          iconName: "camera-outline",
          title: t("common.error", { defaultValue: "Lỗi" }),
          message: "Cần cấp quyền truy cập máy ảnh để chụp hình.",
          showCancel: false,
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) return;
      await uploadAndSendImage(result.assets[0].uri);
    } catch (error: any) {
      await confirm({
        iconName: "alert-circle-outline",
        title: t("common.error", { defaultValue: "Lỗi" }),
        message: "Không thể mở máy ảnh.",
        showCancel: false,
      });
    }
  }, [sending, planId, t, user, confirm]);

  // --- Pick Image (Library) ---
  const handlePickImage = useCallback(async () => {
    try {
      if (sending) return;
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        await confirm({
          iconName: "image-outline",
          title: t("common.error", { defaultValue: "Lỗi" }),
          message: t("chat.permissionDenied", {
            defaultValue: "Cần cấp quyền truy cập thư viện ảnh để gửi hình.",
          }),
          showCancel: false,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) return;
      await uploadAndSendImage(result.assets[0].uri);
    } catch (error: any) {
      await confirm({
        iconName: "alert-circle-outline",
        title: t("common.error", { defaultValue: "Lỗi" }),
        message: "Không thể mở thư viện ảnh.",
        showCancel: false,
      });
    }
  }, [sending, planId, t, user, confirm]);

  // --- Helpers ---
  const isOwn = useCallback((msg: PlannerMessage) => {
    if (!user?.id) return false;
    const mid = msg.user_id || msg.sender?.id || msg.user?.id;
    return String(mid) === String(user.id);
  }, [user?.id]);

  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        const res = await pilgrimPlannerApi.deletePlanMessage(
          planId,
          messageId,
        );
        if (res.success !== false) {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
      } catch {
        await confirm({
          iconName: "alert-circle-outline",
          title: t("common.error", { defaultValue: "Lỗi" }),
          message: t("chat.deleteFailed", {
            defaultValue: "Không thể xóa tin nhắn.",
          }),
          showCancel: false,
        });
      }
    },
    [planId, t, confirm],
  );
  
  const findIdInAnywhere = (obj: any): string | null => {
    if (!obj) return null;
    if (typeof obj === 'string') {
      const match = obj.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      return match ? match[0] : null;
    }
    const possibleKeys = ['continuation_id', 'continued_from_id', 'next_plan_id', 'successor_id', 'new_planner_id', 'plannerId', 'target_id'];
    for (const key of possibleKeys) {
      if (obj[key]) return String(obj[key]);
    }
    if (obj.data) return findIdInAnywhere(obj.data);
    if (obj.metadata) return findIdInAnywhere(obj.metadata);
    return null;
  };

  const handleJoinContinuation = async (targetId?: string | null) => {
    setIsContinuing(true);
    try {
      // If we already have a targetId (from system message), use it.
      // Otherwise, call the API to find/join the continuation.
      let finalId = targetId;
      
      if (!finalId) {
        const res = await pilgrimPlannerApi.continuePlanner(planId);
        if (res.success && res.data?.id) {
          finalId = res.data.id;
        } else {
          await confirm({
            iconName: "alert-circle-outline",
            title: "Thông báo",
            message: res.message || "Không thể tham gia hành trình tiếp nối.",
            confirmText: "Đóng",
            showCancel: false,
            type: "danger",
          });
          return;
        }
      }
      
      navigation.navigate("MainTabs", {
        screen: "Lich trinh",
        params: {
          screen: "PlanDetailScreen",
          params: { planId: finalId }
        }
      } as any);
    } catch (e: any) {
      // Extract error message from API response
      const errorMessage = 
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        "Không thể tham gia hành trình.";
      
      await confirm({
        iconName: "alert-circle-outline",
        title: "Lỗi",
        message: errorMessage,
        confirmText: "Đóng",
        showCancel: false,
        type: "danger",
      });
    } finally {
      setIsContinuing(false);
    }
  };

  const handleContinueJourney = useCallback(async (customName?: string) => {
    // If we're creating a new continuation and no name was provided yet, show the modal
    if (!hasContinuationInHistory && !customName) {
      setNewJourneyName(`${planName} - Phần 2`);
      setIsNameModalVisible(true);
      return;
    }

    try {
      setIsContinuing(true);
      const res = await pilgrimPlannerApi.continuePlanner(planId, {
        name: customName || newJourneyName || `${planName} - Phần 2`
      });

      if (res.success && res.data) {
        // Close modal first
        setIsNameModalVisible(false);
        
        // Small delay to ensure modal closes before showing toast
        setTimeout(() => {
          Toast.show({
            type: "success",
            text1: t("planner.continuePlannerSuccess", { 
              defaultValue: "Thành công!",
            }),
            text2: t("planner.redirectingToNewPlan", {
              defaultValue: "Đang chuyển hướng đến hành trình mới...",
            }),
          });
        }, 100);

        // Creator is always owner in continuation
        const viewerStatus = "owner"; 
        const status = (res.data.status || "").toLowerCase();
        
        const targetScreen = shouldOpenActiveJourneyFromPlannerList(
          status,
          viewerStatus,
          { isOwnerPlanInMyTab: true }
        ) ? "ActiveJourneyScreen" : "PlanDetailScreen";

        // Dispatch a reset action within the nested navigator to ensure a clean state
        // This makes sure PlannerMain is at the bottom of the stack
        navigation.dispatch(
          CommonActions.navigate({
            name: "MainTabs",
            params: {
              screen: "Lich trinh",
              params: {
                screen: targetScreen,
                params: { 
                  planId: res.data.id,
                  planName: res.data.name,
                  planPrefill: {
                    id: res.data.id,
                    name: res.data.name,
                    status: res.data.status,
                    start_date: res.data.start_date,
                    end_date: res.data.end_date,
                    number_of_days: res.data.number_of_days,
                    number_of_people: res.data.number_of_people,
                    transportation: res.data.transportation,
                  }
                }
              }
            }
          })
        );
      } else {
        throw new Error(res.message || "Failed to continue planner");
      }
    } catch (error: any) {
      // Close modal first before showing error toast
      setIsNameModalVisible(false);
      
      setTimeout(() => {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: error.message || t("planner.continuePlannerFailed", {
            defaultValue: "Không thể tiếp nối hành trình"
          }),
        });
      }, 100);
    } finally {
      setIsContinuing(false);
    }
  }, [planId, planName, navigation, t, hasContinuationInHistory, newJourneyName]);

  // --- Actions Menu ---
  const showMessageMenu = useCallback(
    async (item: PlannerMessage) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const own = isOwn(item);
      const isPlanOwner = user?.id === ownerId;
      const canDelete = own || isPlanOwner;

      // Copy to clipboard first
      if (item.content) {
        Clipboard.setString(item.content);
      }

      // Show delete confirmation if user can delete
      if (canDelete) {
        const confirmed = await confirm({
          iconName: "trash-outline",
          title: t("chat.messageOptions", { defaultValue: "Tùy chọn tin nhắn" }),
          message: t("chat.deleteConfirm", { defaultValue: "Bạn có muốn xóa tin nhắn này?" }),
          confirmText: t("chat.deleteMessage", { defaultValue: "Xóa tin nhắn" }),
          cancelText: t("common.close", { defaultValue: "Đóng" }),
        });

        if (confirmed) {
          await handleDelete(item.id);
        }
      }
    },
    [ownerId, user?.id, t, confirm, handleDelete, isOwn],
  );

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

  /** Inverted: data mới → cũ. older element is at index + 1, newer is index - 1. */
  const shouldShowDate = (index: number): boolean => {
    const current = messages[index];
    const older = messages[index + 1];
    if (!older) return true; // Show date above oldest message
    const curDay = new Date(current.created_at).toDateString();
    const olderDay = new Date(older.created_at).toDateString();
    return curDay !== olderDay;
  };

  const resolveMessageContent = useCallback(
    (rawContent: unknown): string => {
      if (rawContent === null || rawContent === undefined) return "";
      let parsed: StructuredChatMessage | null = null;

      const toStructuredPayload = (input: unknown): StructuredChatMessage | null => {
        if (!input) return null;

        if (typeof input === "object") {
          return input as StructuredChatMessage;
        }

        if (typeof input !== "string") {
          return null;
        }

        const parseJsonSafely = (value: string): unknown => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        };

        const trimmed = input.trim();
        if (!trimmed) return null;

        let firstParsed = parseJsonSafely(trimmed);

        // Handle JSON-like payloads from BE where object keys are missing quotes.
        if (!firstParsed && trimmed.startsWith("{") && trimmed.endsWith("}")) {
          const normalized = trimmed.replace(
            /([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g,
            '$1"$2"$3',
          );
          firstParsed = parseJsonSafely(normalized);
        }

        // Handle double-encoded JSON payloads.
        if (typeof firstParsed === "string") {
          const nested = parseJsonSafely(firstParsed.trim());
          if (nested && typeof nested === "object") {
            return nested as StructuredChatMessage;
          }
        }

        if (firstParsed && typeof firstParsed === "object") {
          return firstParsed as StructuredChatMessage;
        }

        return null;
      };

      parsed = toStructuredPayload(rawContent);
      if (!parsed) {
        return typeof rawContent === "string" ? rawContent : String(rawContent);
      }

      try {
        if (!parsed || typeof parsed !== "object") {
          return typeof rawContent === "string" ? rawContent : String(rawContent);
        }

        const languageKey =
          i18n.resolvedLanguage?.toLowerCase().startsWith("vi") ? "vi" : "en";

        const fallbackMessage =
          typeof parsed.default_message === "string"
            ? parsed.default_message
            : parsed.default_message?.[languageKey] ||
              parsed.default_message?.vi ||
              parsed.default_message?.en;

        if (parsed.message_key) {
          return t(parsed.message_key, {
            ...(parsed.params || {}),
            defaultValue: fallbackMessage || parsed.message_key,
          });
        }

        if (fallbackMessage) {
          return fallbackMessage;
        }

        return typeof rawContent === "string" ? rawContent : String(rawContent);
      } catch {
        return typeof rawContent === "string" ? rawContent : String(rawContent);
      }
    },
    [i18n.resolvedLanguage, t],
  );

  // --- Render message ---
  const renderMessage = ({
    item,
    index,
  }: {
    item: PlannerMessage;
    index: number;
  }) => {
    const resolvedContent = resolveMessageContent(item.content);
    const isSystemMsg = item.message_type === 'system' || (!item.user_id && !item.sender && !item.user);

    if (isSystemMsg) {
      const parsedContent = parseNotificationMessage(item.content, i18n.language);
      
      const isEmergencyStop = (parsedContent.toLowerCase().includes('hành trình đã dừng khẩn cấp') || 
                               parsedContent.toLowerCase().includes('journey has been emergency stopped') ||
                               parsedContent.toLowerCase().includes('hành trình đã bị dừng khẩn cấp'));
      const isContinuationCreated = parsedContent.toLowerCase().includes('khởi tạo hành trình tiếp nối') || 
                                     parsedContent.toLowerCase().includes('hành trình tiếp nối đã được tạo') || 
                                     parsedContent.toLowerCase().includes('initiated a continuation journey') ||
                                     parsedContent.toLowerCase().includes('continuation journey has been created');
      const isSosOrAlert = parsedContent.includes('🚨') || parsedContent.toLowerCase().includes('sos') || parsedContent.toLowerCase().includes('khẩn cấp');

      let newPlanId = null;
      try {
        const raw = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
        newPlanId = raw?.data?.plannerId || raw?.plannerId;
        
        const contentStr = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
        const uuidMatch = contentStr.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) newPlanId = uuidMatch[0];
      } catch (e) {}

      const getSystemMessageStyle = (content: string) => {
        if (isSosOrAlert) {
          return { backgroundColor: 'rgba(244, 67, 54, 0.1)', borderColor: 'rgba(244, 67, 54, 0.3)' }; 
        }
        if (content.includes('✅') || content.toLowerCase().includes('đã được hủy') || content.toLowerCase().includes('cancelled')) {
          return { backgroundColor: 'rgba(76, 175, 80, 0.1)', borderColor: 'rgba(76, 175, 80, 0.3)' }; 
        }
        return { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(150, 150, 150, 0.1)' }; 
      };

      const messageStyle = getSystemMessageStyle(parsedContent);
      const containerStyle = [
        styles.systemMessageContainer, 
        messageStyle, 
        (isEmergencyStop || isContinuationCreated) ? styles.systemMessageActionContainer : null
      ];

      return (
        <View style={containerStyle}>
          <Text style={styles.systemMessageText}>{parsedContent}</Text>
          
          {isEmergencyStop && !hasContinuationInHistory && (
             <TouchableOpacity 
               style={styles.systemActionButton} 
               onPress={() => handleContinueJourney()}
               disabled={isContinuing}
             >
               {isContinuing ? (
                 <ActivityIndicator size="small" color="#fff" />
               ) : (
                 <Text style={styles.systemActionButtonText}>
                   {t("planner.continueJourney", { defaultValue: "Tiếp nối hành trình" })}
                 </Text>
               )}
             </TouchableOpacity>
          )}

          {isEmergencyStop && hasContinuationInHistory && (
            <TouchableOpacity 
              style={[styles.systemActionButton, { backgroundColor: COLORS.primary }]} 
              onPress={() => handleJoinContinuation()}
            >
              <Text style={styles.systemActionButtonText}>
                {t("planner.joinJourney", { defaultValue: "Tham gia" })}
              </Text>
            </TouchableOpacity>
          )}

          {isContinuationCreated && (
            <TouchableOpacity 
              style={[styles.systemActionButton, { backgroundColor: COLORS.primary }]} 
              onPress={() => handleJoinContinuation(newPlanId)}
            >
              <Text style={styles.systemActionButtonText}>
                {t("planner.joinJourney", { defaultValue: "Tham gia" })}
              </Text>
            </TouchableOpacity>
          )}

        </View>
      );
    }

    const own = isOwn(item);
    const sender = item.user ?? item.sender;

    const getSenderId = (msg: PlannerMessage) => String(msg.user_id || msg.sender?.id || msg.user?.id || msg.id);
    const currentSenderId = getSenderId(item);
    const isOwner = currentSenderId === String(ownerId);
    
    // In inverted mode: older messages are at index + 1 (visually above). Newer at index - 1 (visually below).
    const visuallyAboveIndex = index + 1;
    const visuallyBelowIndex = index - 1;

    const prev = messages[visuallyAboveIndex];
    const next = messages[visuallyBelowIndex];

    const isPrevSameUser = prev && (getSenderId(prev) === currentSenderId) && !shouldShowDate(index) && prev.message_type !== 'system';
    const isNextSameUser = next && (getSenderId(next) === currentSenderId) && !shouldShowDate(visuallyBelowIndex) && next.message_type !== 'system';

    const showName = !own && !isPrevSameUser;
    const showAvatar = !own && !isNextSameUser;

    const isOptimistic = item.id.startsWith("temp-");
    
    const dynamicBubbleStyle: any = {};
    if (own) {
      dynamicBubbleStyle.borderTopRightRadius = isPrevSameUser ? 4 : 16;
      dynamicBubbleStyle.borderBottomRightRadius = isNextSameUser ? 4 : 16;
    } else {
      dynamicBubbleStyle.borderTopLeftRadius = isPrevSameUser ? 4 : 16;
      dynamicBubbleStyle.borderBottomLeftRadius = isNextSameUser ? 4 : 16;
    }

    const isImageOnly = item.message_type === "image" && !item.content;

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
            { marginBottom: isNextSameUser ? 2 : SPACING.sm }
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

          <View style={styles.messageContentWrapper}>
            {showName && (
              <Text style={[styles.senderName, own ? { textAlign: 'right' } : { textAlign: 'left' }]}>
                {sender?.full_name || t("chat.unknown", { defaultValue: "Ẩn danh" })}
                {isOwner ? " ✝️" : ""}
              </Text>
            )}

            <View
              style={[
                styles.bubble, 
                own ? styles.bubbleOwn : styles.bubbleOther,
                dynamicBubbleStyle,
                isOptimistic && { opacity: 0.6 },
                isImageOnly && { paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }
              ]}
            >
              {item.message_type === "image" && item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={[
                    styles.messageImage, 
                    isImageOnly ? dynamicBubbleStyle : { borderRadius: 8 }
                  ]}
                  resizeMode="cover"
                />
              ) : null}
              {resolvedContent ? (
                <Text style={[styles.messageText, own && styles.messageTextOwn]}>
                  {resolvedContent}
                </Text>
              ) : null}
              {(!isNextSameUser || item.message_type === "image") && (
                <Text style={[styles.timeText, own ? (isImageOnly ? styles.timeTextImageOwn : styles.timeTextOwn) : (isImageOnly ? styles.timeTextImageOther : null)]}>
                  {formatTime(item.created_at)}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // --- Render ---
  return (
    <ImageBackground
      source={require("../../../../../assets/images/bg2.jpg")}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Overlay to reduce background intensity */}
      <View style={styles.backgroundOverlay} />
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
        <>
        {/* Modal for naming the continuation journey */}
        <Modal
          visible={isNameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsNameModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableOpacity 
              style={styles.modalOverlay} 
              activeOpacity={1} 
              onPress={() => setIsNameModalVisible(false)}
            >
              <TouchableOpacity activeOpacity={1}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    {t("planner.newJourneyName", { defaultValue: "Tên hành trình mới" })}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {t("planner.newJourneyNameDesc", { defaultValue: "Nhập tên cho phần tiếp theo của hành trình" })}
                  </Text>
                  
                  <TextInput
                    style={styles.modalInput}
                    value={newJourneyName}
                    onChangeText={setNewJourneyName}
                    placeholder={t("planner.enterJourneyName", { defaultValue: "Nhập tên hành trình..." })}
                    autoFocus
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.modalButtonCancel]} 
                      onPress={() => setIsNameModalVisible(false)}
                    >
                      <Text style={styles.modalButtonTextCancel}>
                        {t("common.cancel")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.modalButtonConfirm]} 
                      onPress={() => handleContinueJourney(newJourneyName)}
                      disabled={!newJourneyName.trim() || isContinuing}
                    >
                      {isContinuing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.modalButtonTextConfirm}>
                          {t("common.confirm")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted={true}
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
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={handlePullRefresh}
              progressViewOffset={Math.max(insets.top, 0) + 8}
              colors={[COLORS.accent]}
              tintColor={COLORS.accent}
            />
          }
        />
        </>
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
          {/* Camera Button */}
          <TouchableOpacity 
             style={styles.cameraButton}
             onPress={handleTakeImage}
          >
            <Ionicons name="camera" size={26} color="#FF6B6B" />
          </TouchableOpacity>

          {/* Gallery Button */}
          <TouchableOpacity 
             style={styles.cameraButton}
             onPress={handlePickImage}
          >
            <Ionicons name="image" size={26} color="#4ECDC4" />
          </TouchableOpacity>

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
              (!text.trim()) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </RNAnimated.View>
    </ImageBackground>
  );
};

export default PlanChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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

  messageContentWrapper: {
    flexDirection: 'column',
    maxWidth: "75%",
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleOwn: {
    backgroundColor: COLORS.primary,
  },
  bubbleOther: {
    backgroundColor: COLORS.white,
    ...SHADOWS.subtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  senderName: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginLeft: 4,
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
    width: 220,
    height: 300,
    marginBottom: 2,
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
  timeTextImageOwn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    color: COLORS.white,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  timeTextImageOther: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    color: COLORS.white,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },

  // Date separator
  dateSeparator: {
    alignItems: "center",
    marginVertical: SPACING.md,
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

  // System message
  systemMessageContainer: {
    alignItems: "center",
    marginVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    borderWidth: 1,
  },
  systemMessageText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textPrimary,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
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
  cameraButton: {
    width: 32,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    marginRight: 4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  systemMessageActionContainer: {
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  systemActionButton: {
    marginTop: SPACING.md,
    backgroundColor: '#DC2626',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.subtle,
  },
  systemActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.accent,
  },
  modalButtonTextCancel: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
