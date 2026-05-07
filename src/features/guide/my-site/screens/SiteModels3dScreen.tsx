/**
 * Màn xem mô hình 3D đã duyệt của site (GET /local-guide/site-media).
 * Full viewport — không panel caption như MediaDetail; slot dưới để sau này gắn thuyết minh (text → giọng nói).
 */
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUIDE_COLORS, GUIDE_SPACING } from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";
import { getSiteApprovedMedia } from "../../../../services/api/guide";
import { MediaItem } from "../../../../types/guide";
import { ModelViewerWebView } from "../components/ModelViewerWebView";
import { SiteModelNarrativePanel } from "../components/SiteModelNarrativePanel";
import { PREMIUM_COLORS } from "../constants";

const SiteModels3dScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MySiteStackParamList>>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: models = [], isLoading, refetch: refetchModels } = useQuery({
    queryKey: GUIDE_KEYS.siteModels3d(),
    queryFn: async () => {
      const res = await getSiteApprovedMedia({ type: "model_3d" });
      if (!res?.success) {
        throw new Error(res?.message || "Failed to load 3D models");
      }
      return res.data?.data ?? [];
    },
    staleTime: 1000 * 60,
  });

  const selected = models[selectedIndex];

  useEffect(() => {
    if (selectedIndex >= models.length) {
      setSelectedIndex(Math.max(0, models.length - 1));
    }
  }, [models.length, selectedIndex]);

  const labelFor = useCallback(
    (item: MediaItem, i: number) =>
      item.code?.trim() ||
      item.caption?.trim() ||
      t("siteModels3d.modelIndex", { index: i + 1 }),
    [t],
  );

  const pickerLabels = useMemo(
    () => models.map((m, i) => ({ id: m.id, label: labelFor(m, i) })),
    [models, labelFor],
  );

  const goPrev = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setSelectedIndex((i) => Math.min(models.length - 1, i + 1));
  }, [models.length]);

  const canPrev = models.length > 1 && selectedIndex > 0;
  const canNext = models.length > 1 && selectedIndex < models.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      <View style={[styles.header, { paddingTop: insets.top + GUIDE_SPACING.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text
          style={styles.headerTitle}
          numberOfLines={1}
          accessibilityRole="header"
          accessibilityLabel={t("siteModels3d.title")}
        >
          {t("siteModels3d.title")}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {models.length > 1 ? (
        <View style={styles.multiPicker}>
          <View style={styles.pickTitleRow}>
            <Text style={styles.pickTitle}>
              {t("siteModels3d.pickModel")}
            </Text>
            <Text
              style={styles.pickCounter}
              accessibilityLabel={t("siteModels3d.modelCounterA11y", {
                current: selectedIndex + 1,
                total: models.length,
              })}
            >
              {t("siteModels3d.modelCounterLabeled", {
                current: selectedIndex + 1,
                total: models.length,
              })}
            </Text>
          </View>
          <Text style={styles.pickHint} numberOfLines={2}>
            {t("siteModels3d.pickModelHint")}
          </Text>
          <View style={styles.pickerOuter}>
            <Pressable
              onPress={goPrev}
              disabled={!canPrev}
              style={({ pressed }) => [
                styles.pickerNavBtn,
                !canPrev && styles.pickerNavBtnDisabled,
                pressed && canPrev && styles.pickerNavBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("siteModels3d.prevModel")}
              accessibilityState={{ disabled: !canPrev }}
            >
              <MaterialIcons
                name="chevron-left"
                size={28}
                color={canPrev ? "#fff" : "rgba(255,255,255,0.28)"}
              />
            </Pressable>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerRow}
              style={styles.pickerScrollInner}
            >
              {pickerLabels.map((p, i) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedIndex(i)}
                  style={[
                    styles.pickerChip,
                    i === selectedIndex && styles.pickerChipActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={p.label}
                  accessibilityState={{ selected: i === selectedIndex }}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      i === selectedIndex && styles.pickerChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={goNext}
              disabled={!canNext}
              style={({ pressed }) => [
                styles.pickerNavBtn,
                !canNext && styles.pickerNavBtnDisabled,
                pressed && canNext && styles.pickerNavBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("siteModels3d.nextModel")}
              accessibilityState={{ disabled: !canNext }}
            >
              <MaterialIcons
                name="chevron-right"
                size={28}
                color={canNext ? "#fff" : "rgba(255,255,255,0.28)"}
              />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.viewerShell}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
            <Text style={styles.hint}>{t("siteModels3d.loading")}</Text>
          </View>
        ) : !selected ? (
          <View style={styles.centered}>
            <MaterialIcons name="view-in-ar" size={56} color={GUIDE_COLORS.gray500} />
            <Text style={styles.emptyTitle}>{t("siteModels3d.empty")}</Text>
            <Text style={styles.emptyHint}>{t("siteModels3d.emptyHint")}</Text>
            <Pressable
              style={styles.emptyCta}
              onPress={() =>
                navigation.navigate("MySiteHome", { initialTab: "media" })
              }
              accessibilityRole="button"
              accessibilityLabel={t("siteModels3d.emptyCta")}
            >
              <MaterialIcons name="photo-library" size={20} color="#1a1a1a" />
              <Text style={styles.emptyCtaText}>{t("siteModels3d.emptyCta")}</Text>
            </Pressable>
          </View>
        ) : (
          <ModelViewerWebView
            key={selected.id}
            modelUrl={selected.url}
            style={styles.viewer}
            fullscreen
          />
        )}
      </View>

      {selected ? (
        <SiteModelNarrativePanel
          key={selected.id}
          media={selected}
          bottomInset={Math.max(insets.bottom, GUIDE_SPACING.sm)}
          onRefreshModels={() => refetchModels()}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingBottom: GUIDE_SPACING.sm,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    paddingHorizontal: 4,
  },
  multiPicker: {
    paddingBottom: GUIDE_SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  pickTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingBottom: 4,
  },
  pickTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.92)",
  },
  pickCounter: {
    fontSize: 13,
    fontWeight: "700",
    color: PREMIUM_COLORS.gold,
    letterSpacing: 0.5,
  },
  pickHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingBottom: GUIDE_SPACING.sm,
    lineHeight: 16,
  },
  pickerOuter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.xs,
    gap: 4,
  },
  pickerNavBtn: {
    width: 40,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  pickerNavBtnDisabled: {
    opacity: 0.85,
  },
  pickerNavBtnPressed: {
    opacity: 0.7,
  },
  pickerScrollInner: {
    flex: 1,
    maxHeight: 48,
  },
  pickerRow: {
    paddingHorizontal: GUIDE_SPACING.xs,
    paddingBottom: GUIDE_SPACING.sm,
    gap: 8,
    alignItems: "center",
  },
  pickerChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    maxWidth: 200,
  },
  pickerChipActive: {
    backgroundColor: PREMIUM_COLORS.gold,
    borderColor: PREMIUM_COLORS.gold,
  },
  pickerChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  pickerChipTextActive: {
    color: "#1a1a1a",
  },
  viewerShell: {
    flex: 1,
    minHeight: 120,
  },
  viewer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 14,
    color: GUIDE_COLORS.gray500,
    textAlign: "center",
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: PREMIUM_COLORS.gold,
    borderRadius: 12,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },
});

export default SiteModels3dScreen;
