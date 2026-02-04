/**
 * AIWriterInput Component
 * Text input with AI Writer assistance button
 * Supports AI-generated content for descriptions
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SPACING,
} from "../../constants/guide.constants";
import { getSpacing, getFontSize } from "../../utils/responsive";

// Premium Colors
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F5E6B8",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  aiPurple: "#8B5CF6",
  aiPurpleDark: "#7C3AED",
};

interface AIWriterInputProps extends Omit<TextInputProps, "value" | "onChangeText"> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  required?: boolean;
  aiPromptContext?: string; // Context for AI (e.g., "Lễ Giáng Sinh")
  onAIGenerate?: (prompt: string) => Promise<string>;
  showTranslate?: boolean;
  onTranslate?: () => Promise<void>;
  error?: string;
}

export const AIWriterInput: React.FC<AIWriterInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = true,
  numberOfLines = 4,
  maxLength = 2000,
  required = false,
  aiPromptContext,
  onAIGenerate,
  showTranslate = false,
  onTranslate,
  error,
  ...textInputProps
}) => {
  const [isAILoading, setIsAILoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);

  const handleAIWrite = async () => {
    if (!onAIGenerate || isAILoading) return;

    setIsAILoading(true);
    try {
      const prompt = aiPromptContext || value || label;
      const generated = await onAIGenerate(prompt);
      if (generated) {
        onChangeText(generated);
      }
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!onTranslate || isTranslating) return;

    setIsTranslating(true);
    try {
      await onTranslate();
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Label Row */}
      <View style={styles.labelRow}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>

        {/* AI Writer Button */}
        {onAIGenerate && (
          <TouchableOpacity
            style={styles.aiButton}
            onPress={handleAIWrite}
            disabled={isAILoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[PREMIUM_COLORS.aiPurple, PREMIUM_COLORS.aiPurpleDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiButtonGradient}
            >
              {isAILoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={styles.aiIcon}>✨</Text>
                  <Text style={styles.aiButtonText}>AI Writer</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Text Input */}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          style={[
            styles.input,
            multiline && { height: numberOfLines * 24, textAlignVertical: "top" },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={GUIDE_COLORS.gray400}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          {...textInputProps}
        />

        {/* Character Count */}
        {maxLength && (
          <Text style={styles.charCount}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Translate Option */}
      {showTranslate && (
        <View style={styles.translateRow}>
          <TouchableOpacity
            style={styles.translateCheckbox}
            onPress={() => setAutoTranslate(!autoTranslate)}
          >
            <View style={[styles.checkbox, autoTranslate && styles.checkboxChecked]}>
              {autoTranslate && (
                <Ionicons name="checkmark" size={14} color="#FFF" />
              )}
            </View>
            <Text style={styles.translateLabel}>Auto Translate to English</Text>
          </TouchableOpacity>

          {value.length > 0 && (
            <TouchableOpacity
              style={styles.translateButton}
              onPress={handleTranslate}
              disabled={isTranslating}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color={PREMIUM_COLORS.aiPurple} />
              ) : (
                <>
                  <Ionicons name="language" size={16} color={PREMIUM_COLORS.aiPurple} />
                  <Text style={styles.translateButtonText}>Dịch ngay</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: getSpacing(GUIDE_SPACING.lg),
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getSpacing(GUIDE_SPACING.sm),
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: getFontSize(14),
    fontWeight: "600",
    color: PREMIUM_COLORS.charcoal,
  },
  required: {
    fontSize: getFontSize(14),
    color: "#E11D48",
    marginLeft: 4,
  },
  aiButton: {
    borderRadius: GUIDE_BORDER_RADIUS.full,
    overflow: "hidden",
  },
  aiButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  aiIcon: {
    fontSize: 14,
  },
  aiButtonText: {
    fontSize: getFontSize(12),
    fontWeight: "700",
    color: "#FFF",
  },
  inputContainer: {
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputError: {
    borderColor: "#E11D48",
  },
  input: {
    fontSize: getFontSize(14),
    color: PREMIUM_COLORS.charcoal,
    padding: getSpacing(GUIDE_SPACING.md),
    minHeight: 100,
  },
  charCount: {
    fontSize: getFontSize(11),
    color: GUIDE_COLORS.gray400,
    textAlign: "right",
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingBottom: getSpacing(GUIDE_SPACING.sm),
  },
  errorText: {
    fontSize: getFontSize(12),
    color: "#E11D48",
    marginTop: 4,
  },
  translateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: getSpacing(GUIDE_SPACING.sm),
  },
  translateCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: GUIDE_COLORS.gray300,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: PREMIUM_COLORS.aiPurple,
    borderColor: PREMIUM_COLORS.aiPurple,
  },
  translateLabel: {
    fontSize: getFontSize(13),
    color: GUIDE_COLORS.textSecondary,
  },
  translateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  translateButtonText: {
    fontSize: getFontSize(12),
    fontWeight: "600",
    color: PREMIUM_COLORS.aiPurple,
  },
});

export default AIWriterInput;
