/**
 * Shared UI helpers for event category (slug ↔ label, gradients).
 * Slugs are sent to the backend as `category` (string, max 100).
 */

import { MaterialIcons } from "@expo/vector-icons";

export interface CategoryItem {
  value: string;
  labelKey: string; // i18n key instead of hardcoded label
}

export interface CategoryGroup {
  groupLabelKey: string; // i18n key instead of hardcoded label
  icon: keyof typeof MaterialIcons.glyphMap;
  items: CategoryItem[];
}

type TranslateFunction = (key: string, options?: { defaultValue?: string }) => string;

export const getEventCategoryGroups = (t: TranslateFunction): CategoryGroup[] => [
  {
    groupLabelKey: "eventCategories.groupLiturgy",
    icon: "church",
    items: [
      { value: "solemn_feast", labelKey: "eventCategories.solemnFeast" },
      { value: "sacrament_mass", labelKey: "eventCategories.sacramentMass" },
      { value: "procession", labelKey: "eventCategories.procession" },
      { value: "adoration", labelKey: "eventCategories.adoration" },
    ],
  },
  {
    groupLabelKey: "eventCategories.groupCommunity",
    icon: "groups",
    items: [
      { value: "patron_feast", labelKey: "eventCategories.patronFeast" },
      { value: "festival", labelKey: "eventCategories.festival" },
      { value: "performance", labelKey: "eventCategories.performance" },
      { value: "sports", labelKey: "eventCategories.sports" },
    ],
  },
  {
    groupLabelKey: "eventCategories.groupFormation",
    icon: "auto-stories",
    items: [
      { value: "retreat", labelKey: "eventCategories.retreat" },
      { value: "camp", labelKey: "eventCategories.camp" },
      { value: "course", labelKey: "eventCategories.course" },
    ],
  },
  {
    groupLabelKey: "eventCategories.groupCharity",
    icon: "volunteer-activism",
    items: [
      { value: "pilgrimage", labelKey: "eventCategories.pilgrimage" },
      { value: "charity", labelKey: "eventCategories.charity" },
    ],
  },
];

// Legacy constant for backward compatibility (uses Vietnamese as fallback)
export const EVENT_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    groupLabelKey: "Phụng vụ & Bí tích",
    icon: "church",
    items: [
      { value: "solemn_feast", labelKey: "Lễ Trọng / Tuần Thánh" },
      { value: "sacrament_mass", labelKey: "Thánh Lễ Bí tích" },
      { value: "procession", labelKey: "Rước kiệu / Cung nghinh" },
      { value: "adoration", labelKey: "Chầu lượt / Tuần chầu" },
    ],
  },
  {
    groupLabelKey: "Cộng đoàn & Lễ hội",
    icon: "groups",
    items: [
      { value: "patron_feast", labelKey: "Lễ Bổn mạng" },
      { value: "festival", labelKey: "Hội chợ / Lễ hội" },
      { value: "performance", labelKey: "Văn nghệ / Thánh ca" },
      { value: "sports", labelKey: "Đại hội / Hội thao" },
    ],
  },
  {
    groupLabelKey: "Đào tạo & Tâm linh",
    icon: "auto-stories",
    items: [
      { value: "retreat", labelKey: "Tĩnh tâm" },
      { value: "camp", labelKey: "Sa mạc / Cắm trại" },
      { value: "course", labelKey: "Khóa học / Giáo lý" },
    ],
  },
  {
    groupLabelKey: "Bác ái & Ngoại vụ",
    icon: "volunteer-activism",
    items: [
      { value: "pilgrimage", labelKey: "Hành hương" },
      { value: "charity", labelKey: "Bác ái / Từ thiện" },
    ],
  },
];

export interface GradientTheme {
  colors: [string, string];
  icon: keyof typeof MaterialIcons.glyphMap;
}

export const CATEGORY_GROUP_GRADIENTS: Record<string, GradientTheme> = {
  solemn_feast: { colors: ["#4A1942", "#B8860B"], icon: "church" },
  sacrament_mass: { colors: ["#4A1942", "#B8860B"], icon: "church" },
  procession: { colors: ["#4A1942", "#B8860B"], icon: "church" },
  adoration: { colors: ["#4A1942", "#B8860B"], icon: "church" },
  patron_feast: { colors: ["#5D4037", "#E67E22"], icon: "groups" },
  festival: { colors: ["#5D4037", "#E67E22"], icon: "groups" },
  performance: { colors: ["#5D4037", "#E67E22"], icon: "groups" },
  sports: { colors: ["#5D4037", "#E67E22"], icon: "groups" },
  retreat: { colors: ["#1A535C", "#4ECDC4"], icon: "auto-stories" },
  camp: { colors: ["#1A535C", "#4ECDC4"], icon: "auto-stories" },
  course: { colors: ["#1A535C", "#4ECDC4"], icon: "auto-stories" },
  pilgrimage: { colors: ["#6B2737", "#E88D97"], icon: "volunteer-activism" },
  charity: { colors: ["#6B2737", "#E88D97"], icon: "volunteer-activism" },
};

export const DEFAULT_EVENT_GRADIENT: GradientTheme = {
  colors: ["#3D2000", "#C7A94E"],
  icon: "event",
};

export const findCategoryByValue = (
  value: string,
  t?: TranslateFunction,
): { item: CategoryItem; group: CategoryGroup; label: string; groupLabel: string } | null => {
  const groups = t ? getEventCategoryGroups(t) : EVENT_CATEGORY_GROUPS;
  
  for (const group of groups) {
    const item = group.items.find((i) => i.value === value);
    if (item) {
      return {
        item,
        group,
        label: t ? t(item.labelKey) : item.labelKey,
        groupLabel: t ? t(group.groupLabelKey) : group.groupLabelKey,
      };
    }
  }
  return null;
};

/** Strip legacy "[Nhãn]" prefix from description (before backend stored category separately). */
export const stripLegacyCategoryTag = (desc: string): string =>
  desc.replace(/^\[.+?\]\s*/, "");

/**
 * Parse category from API + legacy description tag.
 * Prefer `category` from API when it matches a known slug; else infer from leading [label] in description.
 */
export const parseEventCategoryAndDescription = (input: {
  description?: string | null;
  category?: string | null;
}): { category: string; description: string } => {
  const desc = input.description || "";
  const apiCat = input.category?.trim() || "";

  if (apiCat) {
    return {
      category: apiCat,
      description: stripLegacyCategoryTag(desc),
    };
  }

  const match = desc.match(/^\[(.+?)\]\s*/);
  if (match) {
    const tagLabel = match[1];
    let catValue = "";
    for (const group of EVENT_CATEGORY_GROUPS) {
      const found = group.items.find((i) => i.labelKey === tagLabel);
      if (found) {
        catValue = found.value;
        break;
      }
    }
    return {
      category: catValue,
      description: desc.replace(/^\[.+?\]\s*/, ""),
    };
  }

  return { category: apiCat, description: desc };
};

/** Slug từ API hoặc suy ra từ tag [Nhãn] trong description (legacy). */
export const resolveEventCategorySlug = (
  event: { category?: string | null; description?: string | null },
): string | null => {
  const c = event.category?.trim();
  if (c) return c;
  const desc = event.description || "";
  const match = desc.match(/^\[(.+?)\]/);
  if (match) {
    const label = match[1];
    const fromLabel = EVENT_CATEGORY_GROUPS.flatMap((g) => g.items).find(
      (i) => i.labelKey === label,
    );
    return fromLabel?.value ?? null;
  }
  return null;
};

/** Nhãn hiển thị (tiếng Việt) hoặc slug nếu không khớp danh sách. */
export const getEventCategoryLabel = (
  event: {
    category?: string | null;
    description?: string | null;
  },
  t?: TranslateFunction,
): string | null => {
  const slug = resolveEventCategorySlug(event);
  if (!slug) return null;
  const found = findCategoryByValue(slug, t);
  return found?.label ?? slug;
};

/** Thumbnail gradient: prefer API slug, then legacy [label] in description. */
export const getCategoryGradientForList = (
  description?: string | null,
  categorySlug?: string | null,
): GradientTheme => {
  if (categorySlug && CATEGORY_GROUP_GRADIENTS[categorySlug]) {
    return CATEGORY_GROUP_GRADIENTS[categorySlug];
  }
  if (!description) return DEFAULT_EVENT_GRADIENT;
  const match = description.match(/^\[(.+?)\]/);
  if (match) {
    const label = match[1];
    const fromLabel = EVENT_CATEGORY_GROUPS.flatMap((g) => g.items).find(
      (i) => i.labelKey === label,
    );
    if (fromLabel?.value && CATEGORY_GROUP_GRADIENTS[fromLabel.value]) {
      return CATEGORY_GROUP_GRADIENTS[fromLabel.value];
    }
  }
  return DEFAULT_EVENT_GRADIENT;
};
