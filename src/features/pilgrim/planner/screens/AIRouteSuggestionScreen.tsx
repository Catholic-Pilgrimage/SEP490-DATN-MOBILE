import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { AISparkles } from "../../../../components/ui/AISparkles";
import { COLORS } from "../../../../constants/theme.constants";
import type { PlannerCompositeNavigationProp } from "../../../../navigation/pilgrimNavigation.types";
import aiService, { SuggestRouteResponse } from "../../../../services/ai/aiService";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import { getApiErrorMessage } from "../../../../utils/apiError";
import { ConfigurationStep } from "../components/ai-route/ConfigurationStep";
import { ResultStep } from "../components/ai-route/ResultStep";
import { SiteSelectionStep } from "../components/ai-route/SiteSelectionStep";
import { styles } from "./AIRouteSuggestionScreen.styles";

const AI_SUGGESTION_SLOW_THRESHOLD_MS = 10000; // 10 seconds

type Step = "selection" | "configuration" | "loading" | "result";

interface SiteInfo {
  id: string;
  name: string;
  address: string;
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
}

interface AIRouteConfig {
  startDate: string;
  maxDays: number;
  transportMode: "car" | "motorbike" | "bus";
  priority: "time" | "distance" | "balanced" | "spiritual";
  numberOfPeople: number;
}

interface AIRouteSuggestionScreenProps {
  navigation: PlannerCompositeNavigationProp;
}

export const AIRouteSuggestionScreen = ({ navigation }: AIRouteSuggestionScreenProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { display: "none" } });

      return () => {
        parent?.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation]),
  );

  const [currentStep, setCurrentStep] = useState<Step>("selection");
  const [selectedSites, setSelectedSites] = useState<SiteInfo[]>([]);
  const [config, setConfig] = useState<AIRouteConfig>({
    startDate: getTomorrowDate(),
    maxDays: 3,
    transportMode: "car",
    priority: "balanced",
    numberOfPeople: 2,
  });
  const [aiResult, setAiResult] = useState<SuggestRouteResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAISlow, setIsAISlow] = useState(false);
  const aiSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAISlowTimer = () => {
    if (aiSlowTimerRef.current) {
      clearTimeout(aiSlowTimerRef.current);
      aiSlowTimerRef.current = null;
    }
  };

  const normalizePriorityForApi = (
    priority: AIRouteConfig["priority"],
  ): string => {
    if (priority === "distance") return "shortest_distance";
    if (priority === "time") return "shortest_time";
    if (priority === "spiritual") return "most_spiritual";
    return "balanced";
  };

  const parseDateOnly = (value: string): Date => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  };

  const isStartDateValid = (value: string): boolean => {
    if (!value) return false;

    const picked = parseDateOnly(value);
    if (Number.isNaN(picked.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 1);

    if (picked < minDate) {
      Toast.show({
        type: "error",
        text1: t("aiRoute.errors.invalidDate", {
          defaultValue: "Ngày khởi hành không hợp lệ",
        }),
        text2: t("aiRoute.errors.invalidDateHint", {
          defaultValue: "Vui lòng chọn từ ngày mai trở đi.",
        }),
      });
      return false;
    }

    return true;
  };

  const checkDateOverlap = async (
    startDate: string,
    endDate: string,
  ): Promise<boolean> => {
    const [planningRes, lockedRes, ongoingRes] = await Promise.all([
      pilgrimPlannerApi.getPlans({ page: 1, limit: 100, status: "planning" }),
      pilgrimPlannerApi.getPlans({ page: 1, limit: 100, status: "locked" }),
      pilgrimPlannerApi.getPlans({ page: 1, limit: 100, status: "ongoing" }),
    ]);

    const allPlans = [
      ...(planningRes?.data?.planners || []),
      ...(lockedRes?.data?.planners || []),
      ...(ongoingRes?.data?.planners || []),
    ];

    const nextStart = parseDateOnly(startDate);
    const nextEnd = parseDateOnly(endDate || startDate);

    return allPlans.some((p) => {
      const existingStart = parseDateOnly(p.start_date || "");
      const existingEnd = parseDateOnly(p.end_date || p.start_date || "");

      if (
        Number.isNaN(existingStart.getTime()) ||
        Number.isNaN(existingEnd.getTime())
      ) {
        return false;
      }

      return nextStart <= existingEnd && existingStart <= nextEnd;
    });
  };

  const handleSiteSelect = (site: SiteInfo) => {
    if (selectedSites.length >= 10) {
      Toast.show({
        type: "error",
        text1: t("aiRoute.errors.maxSites", { defaultValue: "Tối đa 10 địa điểm" }),
      });
      return;
    }
    setSelectedSites([...selectedSites, site]);
  };

  const handleSiteRemove = (siteId: string) => {
    setSelectedSites(selectedSites.filter((s) => s.id !== siteId));
  };

  const handleNextStep = () => {
    if (currentStep === "selection") {
      if (selectedSites.length < 2) {
        setError(t("aiRoute.errors.minSites", { defaultValue: "Vui lòng chọn ít nhất 2 địa điểm" }));
        return;
      }
      setError("");
      setCurrentStep("configuration");
    } else if (currentStep === "configuration") {
      handleGenerateRoute();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === "configuration") {
      setCurrentStep("selection");
    } else if (currentStep === "result") {
      // Allow going back to configuration without losing AI result
      setCurrentStep("configuration");
    }
  };

  const handleGenerateRoute = async () => {
    if (!isStartDateValid(config.startDate)) {
      return;
    }

    setCurrentStep("loading");
    setIsLoading(true);
    setError("");
    setIsAISlow(false);
    clearAISlowTimer();

    // Set timeout to show "slow response" message
    aiSlowTimerRef.current = setTimeout(() => {
      setIsAISlow(true);
      Toast.show({
        type: "info",
        text1: t("aiRoute.loading.slowTitle", { defaultValue: "AI đang xử lý" }),
        text2: t("aiRoute.loading.slowMessage", { 
          defaultValue: "AI đang mất nhiều thời gian hơn bình thường. Vui lòng chờ thêm chút..." 
        }),
        visibilityTime: 5000,
      });
    }, AI_SUGGESTION_SLOW_THRESHOLD_MS);

    try {
      const response = await aiService.suggestRoute({
        site_ids: selectedSites.map((s) => s.id),
        start_date: config.startDate,
        max_days: config.maxDays,
        transport_mode: config.transportMode,
        priority: normalizePriorityForApi(config.priority) as any,
        number_of_people: config.numberOfPeople,
      });

      clearAISlowTimer();
      setIsAISlow(false);

      if (response.success) {
        setAiResult(response);
        setCurrentStep("result");
      } else {
        setError(response.message || t("aiRoute.errors.apiFailed", { defaultValue: "AI không thể tạo lộ trình" }));
        setCurrentStep("configuration");
      }
    } catch (err: any) {
      clearAISlowTimer();
      setIsAISlow(false);
      const errorMessage = getApiErrorMessage(
        err,
        t("aiRoute.errors.networkError", { defaultValue: "Lỗi kết nối" }),
      );
      setError(errorMessage);
      setCurrentStep("configuration");
      
      Toast.show({
        type: "error",
        text1: t("aiRoute.errors.title", { defaultValue: "Không thể tạo lộ trình" }),
        text2: errorMessage,
      });
    } finally {
      setIsLoading(false);
      clearAISlowTimer();
      setIsAISlow(false);
    }
  };

  const handleCreatePlanner = async () => {
    if (!aiResult) return;

    setIsLoading(true);
    try {
      if (!isStartDateValid(aiResult.data.planner.start_date)) {
        setIsLoading(false);
        return;
      }

      const hasOverlap = await checkDateOverlap(
        aiResult.data.planner.start_date,
        aiResult.data.planner.end_date,
      );

      if (hasOverlap) {
        Toast.show({
          type: "error",
          text1: t("aiRoute.errors.dateOverlap", {
            defaultValue: "Trùng lịch với kế hoạch khác",
          }),
          text2: t("aiRoute.errors.dateOverlapHint", {
            defaultValue: "Vui lòng chọn ngày khác hoặc xóa kế hoạch cũ",
          }),
        });
        setIsLoading(false);
        return;
      }

      // Step 1: Create planner
      const numberOfPeople = aiResult.data.planner.number_of_people;
      
      // Validate number of people
      if (!numberOfPeople || numberOfPeople <= 0) {
        Toast.show({
          type: "error",
          text1: t("aiRoute.errors.invalidPeople", { defaultValue: "Số người không hợp lệ" }),
          text2: t("aiRoute.errors.invalidPeopleHint", { 
            defaultValue: "Số người phải lớn hơn 0" 
          }),
        });
        setIsLoading(false);
        return;
      }

      // Create payload
      const createPayload: any = {
        name: aiResult.data.planner.name,
        start_date: aiResult.data.planner.start_date,
        end_date: aiResult.data.planner.end_date,
        number_of_people: numberOfPeople,
        transportation: aiResult.data.planner.transportation as any,
      };

      // For group plans (≥2 people), add default deposit settings
      // User can edit these later in plan details if needed
      if (numberOfPeople > 1) {
        createPayload.deposit_amount = 2000; // Default 2,000 VND
        createPayload.penalty_percentage = 10; // Default 10%
      }

      const createResponse = await pilgrimPlannerApi.createPlan(createPayload);

      if (!createResponse.success || !createResponse.data) {
        const errorMsg =
          createResponse.message ||
          t("aiRoute.errors.createFailed", {
            defaultValue: "Không thể tạo kế hoạch",
          });
        if (errorMsg.includes("overlap") || errorMsg.includes("trùng")) {
          Toast.show({
            type: "error",
            text1: t("aiRoute.errors.dateOverlap", { 
              defaultValue: "Trùng lịch với kế hoạch khác" 
            }),
            text2: t("aiRoute.errors.dateOverlapHint", {
              defaultValue: "Vui lòng chọn ngày khác hoặc xóa kế hoạch cũ"
            }),
          });
        } else {
          Toast.show({
            type: "error",
            text1: t("aiRoute.errors.createFailed", { defaultValue: "Không thể tạo kế hoạch" }),
            text2: errorMsg,
          });
        }
        return;
      }

      const plannerId = createResponse.data.id;

      // Step 2: Add items to planner - use leg_number instead of day_number
      const itemsToAdd = aiResult.data.daily_itinerary.flatMap((day) =>
        day.items.map((item) => {
          const itemData: any = {
            site_id: item.site_id,
            leg_number: item.day_number, // API expects leg_number, not day_number
          };
          
          // Only add optional fields if they have values
          if (item.estimated_time) {
            itemData.estimated_time = item.estimated_time;
          }
          if (item.rest_duration) {
            // Convert AI format (e.g., "45m") to API format (e.g., "45 minutes")
            const converted = convertRestDuration(item.rest_duration);
            if (converted) {
              itemData.rest_duration = converted;
            }
          }
          if (item.travel_time_minutes !== undefined && item.travel_time_minutes !== null) {
            itemData.travel_time_minutes = item.travel_time_minutes;
          }
          if (item.note) {
            itemData.note = item.note;
          }
          
          return itemData;
        })
      );

      // Add items sequentially to avoid race condition with order_index
      let failedCount = 0;
      for (const itemData of itemsToAdd) {
        try {
          await pilgrimPlannerApi.addPlanItem(plannerId, itemData);
        } catch {
          failedCount++;
        }
      }
      
      // Check if any items failed
      if (failedCount > 0) {
        Toast.show({
          type: "info",
          text1: t("aiRoute.result.partialSuccess", { 
            defaultValue: "Đã tạo kế hoạch" 
          }),
          text2: t("aiRoute.result.someItemsFailed", {
            count: failedCount,
            defaultValue: `${failedCount} địa điểm không thể thêm vào`
          }),
        });
      } else {
        Toast.show({
          type: "success",
          text1: t("aiRoute.result.createSuccess", { defaultValue: "Đã tạo kế hoạch thành công!" }),
        });
      }
      
      // Reset navigation stack to remove AIRouteSuggestionScreen
      // So when user presses back from PlanDetailScreen, they go to PlannerScreen
      navigation.reset({
        index: 1,
        routes: [
          { name: "PlannerMain" },
          { name: "PlanDetailScreen", params: { planId: plannerId } }
        ]
      });
    } catch (err: any) {
      const errorMessage = getApiErrorMessage(
        err,
        t("aiRoute.errors.createError", { defaultValue: "Lỗi tạo kế hoạch" }),
      );
      Toast.show({
        type: "error",
        text1: t("aiRoute.errors.createError", { defaultValue: "Lỗi tạo kế hoạch" }),
        text2: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AISparkles size={20} color="#D4AF37" isAnimating={true} />
            <Text style={styles.headerTitle}>
              {t("aiRoute.title", { defaultValue: "AI Tạo Lộ Trình" })}
            </Text>
          </View>
          <View style={styles.headerRightSpacer} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <StepDot step={1} active={currentStep === "selection"} completed={["configuration", "loading", "result"].includes(currentStep)} label={t("aiRoute.steps.selection")} />
          <View style={styles.stepLine} />
          <StepDot step={2} active={currentStep === "configuration"} completed={["loading", "result"].includes(currentStep)} label={t("aiRoute.steps.configuration")} />
          <View style={styles.stepLine} />
          <StepDot step={3} active={currentStep === "loading"} completed={currentStep === "result"} label={t("aiRoute.steps.ai")} />
          <View style={styles.stepLine} />
          <StepDot step={4} active={currentStep === "result"} completed={false} label={t("aiRoute.steps.result")} />
        </View>

        {!!error && currentStep !== "loading" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Text style={{ color: "#B3261E", fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === "selection" && (
            <SiteSelectionStep
              selectedSites={selectedSites}
              onSiteAdd={handleSiteSelect}
              onSiteRemove={handleSiteRemove}
            />
          )}
          {currentStep === "configuration" && (
            <ConfigurationStep
              config={config}
              onChange={(updates) => setConfig({ ...config, ...updates })}
            />
          )}
          {currentStep === "loading" && (
            <View style={styles.loadingContainer}>
              <AISparkles size={64} color="#D4AF37" isAnimating={true} />
              <Text style={styles.loadingText}>
                {t("aiRoute.loading.message", { defaultValue: "AI đang tạo lộ trình tối ưu cho bạn..." })}
              </Text>
              {isAISlow && (
                <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>
                  {t("aiRoute.loading.slowMessage", {
                    defaultValue:
                      "AI đang mất nhiều thời gian hơn bình thường. Vui lòng chờ thêm chút...",
                  })}
                </Text>
              )}
            </View>
          )}
          {currentStep === "result" && aiResult && (
            <ResultStep result={aiResult} />
          )}
        </ScrollView>

        {/* Bottom Action Button */}
        {currentStep !== "loading" && (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            {currentStep === "selection" && (
              <TouchableOpacity
                style={[styles.primaryButton, selectedSites.length < 2 && styles.primaryButtonDisabled]}
                onPress={handleNextStep}
                disabled={selectedSites.length < 2}
              >
                <Text style={styles.primaryButtonText}>
                  {t("common.next", { defaultValue: "Tiếp theo" })}
                </Text>
              </TouchableOpacity>
            )}
            {currentStep === "configuration" && (
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={handlePreviousStep}>
                  <Text style={styles.secondaryButtonText}>
                    {t("common.back", { defaultValue: "Quay lại" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
                  <Text style={styles.primaryButtonText}>
                    {aiResult 
                      ? t("aiRoute.configuration.regenerate", { defaultValue: "Tạo lại lộ trình" })
                      : t("aiRoute.configuration.generate", { defaultValue: "Tạo lộ trình" })
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {currentStep === "result" && (
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.secondaryButton} 
                  onPress={handlePreviousStep}
                >
                  <Text style={styles.secondaryButtonText}>
                    {t("common.back", { defaultValue: "Quay lại" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 2 }]}
                  onPress={handleCreatePlanner}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {t("aiRoute.result.createPlanner", { defaultValue: "Tạo Planner" })}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

// Helper Components
const StepDot = ({ step, active, completed, label }: { step: number; active: boolean; completed: boolean; label: string }) => (
  <View style={styles.stepDotContainer}>
    <View style={[styles.stepDot, active && styles.stepDotActive, completed && styles.stepDotCompleted]}>
      {completed ? (
        <Ionicons name="checkmark" size={16} color={COLORS.white} />
      ) : (
        <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>{step}</Text>
      )}
    </View>
    <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
  </View>
);

// Helper Functions
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

// Convert AI rest_duration format (e.g., "45m", "1h", "2h30m") to API format (e.g., "45 minutes", "1 hour", "2 hours 30 minutes")
function convertRestDuration(duration: string | null | undefined): string | undefined {
  if (!duration) return undefined;
  
  const trimmed = duration.trim();
  if (!trimmed) return undefined;
  
  // If already in API format (e.g., "1 hour", "30 minutes", "2 hours 30 minutes"), return as-is
  if (/^\d+\s+(hour|hours|minute|minutes)(\s+\d+\s+(minute|minutes))?$/i.test(trimmed)) {
    return trimmed;
  }
  
  const lower = trimmed.toLowerCase();
  
  // Match patterns like "45m", "1h", "2h30m", "1h 30m"
  const hourMatch = lower.match(/(\d+)\s*h/);
  const minuteMatch = lower.match(/(\d+)\s*m(?!inute)/);
  
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
  
  if (hours === 0 && minutes === 0) {
    // Try to parse as plain number (assume minutes)
    const num = parseInt(lower, 10);
    if (!isNaN(num) && num > 0) {
      return `${num} minutes`;
    }
    return undefined;
  }
  
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minutes`);
  }
  
  return parts.join(" ");
}

export default AIRouteSuggestionScreen;
