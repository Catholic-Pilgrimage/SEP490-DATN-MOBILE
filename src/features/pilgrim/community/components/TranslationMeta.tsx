import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";

interface TranslationMetaProps {
  compact?: boolean;
  onShowOriginal: () => void;
  style?: StyleProp<ViewStyle>;
}

const TranslationMeta: React.FC<TranslationMetaProps> = ({
  compact = false,
  onShowOriginal,
  style,
}) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.row, compact && styles.rowCompact, style]}>
      <MaterialIcons
        name="g-translate"
        size={compact ? 13 : 14}
        color={COLORS.primary}
      />
      <Text style={[styles.label, compact && styles.labelCompact]}>
        {t("postDetail.translatedLabel", { defaultValue: "Translated" })}
      </Text>
      <Text style={[styles.separator, compact && styles.separatorCompact]}>
        |
      </Text>
      <TouchableOpacity
        onPress={onShowOriginal}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.action, compact && styles.actionCompact]}>
          {t("postDetail.viewOriginal", { defaultValue: "View original" })}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    marginTop: SPACING.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  rowCompact: {
    marginTop: 6,
  },
  label: {
    marginLeft: 6,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  labelCompact: {
    fontSize: 11,
  },
  separator: {
    marginHorizontal: 6,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textTertiary,
  },
  separatorCompact: {
    fontSize: 11,
  },
  action: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.primary,
    fontWeight: "700",
  },
  actionCompact: {
    fontSize: 11,
  },
});

export default TranslationMeta;
