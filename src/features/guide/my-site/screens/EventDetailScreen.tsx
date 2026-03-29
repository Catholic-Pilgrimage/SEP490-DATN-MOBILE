import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIWriterInput } from '../../../../components/ui/AIWriterInput';
import { useConfirm } from '../../../../hooks/useConfirm';
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from '../../../../constants/guide.constants';

// Types
interface EventFormData {
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
}

// Input Field Component
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numberOfLines?: number;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  editable?: boolean;
  onPress?: () => void;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 1,
  icon,
  iconPosition = 'left',
  editable = true,
  onPress,
}) => {
  const inputContent = (
    <View style={styles.inputContainer}>
      {icon && iconPosition === 'left' && (
        <MaterialIcons
          name={icon}
          size={20}
          color={GUIDE_COLORS.primary}
          style={styles.inputIconLeft}
        />
      )}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          icon && iconPosition === 'left' && styles.inputWithIconLeft,
          icon && iconPosition === 'right' && styles.inputWithIconRight,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={GUIDE_COLORS.textMuted}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        editable={editable && !onPress}
      />
      {icon && iconPosition === 'right' && (
        <MaterialIcons
          name={icon}
          size={20}
          color={GUIDE_COLORS.primary}
          style={styles.inputIconRight}
        />
      )}
    </View>
  );

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          {inputContent}
        </TouchableOpacity>
      ) : (
        inputContent
      )}
    </View>
  );
};

// Section Header Component
interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderAccent} />
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
);

// Main Event Detail Screen
const EventDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { confirm, ConfirmModal } = useConfirm();

  const [formData, setFormData] = useState<EventFormData>({
    name: 'Morning Prayer at the Basilica',
    date: 'Oct 12, 2023',
    time: '09:00 AM',
    location: "St. Peter's Square, Vatican City",
    description:
      'Join us for a solemn procession beginning at the central square. We will recite the Rosary together as we walk towards the Grotto. Please bring comfortable shoes and water.',
  });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDatePress = () => {
    // TODO: Implement date picker
  };

  const handleTimePress = () => {
    // TODO: Implement time picker
  };

  const handleMapPress = () => {
    // TODO: Navigate to map screen
  };

  const handleAIGenerate = async (prompt: string): Promise<string> => {
    // TODO: Call AI API to generate description
    // Mock AI-generated content for demo
    const generatedContent = `${formData.name} là một sự kiện hành hương đặc biệt được tổ chức vào ngày ${formData.date} lúc ${formData.time} tại ${formData.location}.\n\nĐây là cơ hội tuyệt vời để cùng nhau cầu nguyện và tìm về với đức tin. Mọi người hãy mang theo nước uống và mặc trang phục thoải mái.`;
    return generatedContent;
  };

  const handleTranslate = async (): Promise<void> => {
    // TODO: Call translation API
    await confirm({
      type: 'info',
      iconName: 'language',
      title: 'Dịch thuật',
      message: 'Đang dịch sang ngôn ngữ khác...',
      confirmText: 'OK',
      showCancel: false,
    });
  };

  const handleSave = () => {
    // TODO: Implement save logic
  };

  const updateFormField = (field: keyof EventFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={GUIDE_COLORS.background} />

      {/* Sacred Background Watermark */}
      <View style={styles.backgroundWatermark}>
        <MaterialIcons
          name="star"
          size={400}
          color={GUIDE_COLORS.primary}
          style={styles.watermarkIcon}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back-ios" size={20} color={GUIDE_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Essentials */}
          <View style={styles.section}>
            <InputField
              label="Name of Pilgrimage"
              value={formData.name}
              onChangeText={updateFormField('name')}
              placeholder="e.g., Procession to the Grotto"
            />
          </View>

          {/* Section 2: Logistics */}
          <View style={styles.section}>
            <SectionHeader title="Logistics" />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <InputField
                  label="Date"
                  value={formData.date}
                  onChangeText={updateFormField('date')}
                  placeholder="Select Date"
                  icon="calendar-today"
                  iconPosition="left"
                  onPress={handleDatePress}
                />
              </View>
              <View style={styles.halfField}>
                <InputField
                  label="Time"
                  value={formData.time}
                  onChangeText={updateFormField('time')}
                  placeholder="Select Time"
                  icon="schedule"
                  iconPosition="left"
                  onPress={handleTimePress}
                />
              </View>
            </View>

            <InputField
              label="Meeting Point"
              value={formData.location}
              onChangeText={updateFormField('location')}
              placeholder="Select location or enter address"
              icon="location-on"
              iconPosition="right"
            />

            {/* Map Preview */}
            <TouchableOpacity style={styles.mapPreview} onPress={handleMapPress} activeOpacity={0.9}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFqv8Ne2PocHKQwsrwasp-UhUvtKXRMiUmww4ygD08V6leDhPNnpgxpQH8uNwvfqDsWcizd1zLKhnw7M7m1oOOG2Y-Y0VcBahp1fWpMXeRc0Q2CKAEoMwFqKO4dtV9qC71yuMHSVoUeUQ13TpJTOMT-4EgJywlFyyCd16e3qoGnft5N5c8XCwkmPTBo2ajMIMh6psb1kfn9fzYO-75hRcPhOzlsWIPuSrA9Uak7gawMj60XpmEzaKt8q4UjXSsZ9GEcbS7FzQiNY0',
                }}
                style={styles.mapImage}
              />
              <View style={styles.mapOverlay}>
                <View style={styles.mapLabel}>
                  <MaterialIcons name="map" size={14} color={GUIDE_COLORS.textPrimary} />
                  <Text style={styles.mapLabelText}>Tap to adjust location</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 3: Description with AI Writer */}
          <View style={styles.section}>
            <SectionHeader title="Description" />

            <AIWriterInput
              label="About this Event"
              value={formData.description}
              onChangeText={updateFormField('description')}
              placeholder="Describe the spiritual significance and itinerary..."
              onAIGenerate={handleAIGenerate}
              showTranslate={true}
              onTranslate={handleTranslate}
              maxLength={1000}
            />
          </View>

          {/* Bottom Spacing for Fixed Footer */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + GUIDE_SPACING.lg }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.9}>
          <Text style={styles.saveButtonText}>Save Event</Text>
          <MaterialIcons name="check" size={20} color={GUIDE_COLORS.backgroundDark} />
        </TouchableOpacity>
      </View>
      <ConfirmModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.background,
  },
  backgroundWatermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.03,
    zIndex: 0,
  },
  watermarkIcon: {
    transform: [{ rotate: '12deg' }],
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingVertical: GUIDE_SPACING.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.md,
    paddingBottom: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.background,
    borderBottomWidth: 0.5,
    borderBottomColor: GUIDE_COLORS.borderLight,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXL,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },

  // Sections
  section: {
    marginBottom: GUIDE_SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GUIDE_SPACING.lg,
  },
  sectionHeaderAccent: {
    width: 2,
    height: 16,
    backgroundColor: GUIDE_COLORS.primary,
    marginRight: GUIDE_SPACING.sm,
  },
  sectionHeaderText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // Row Layout
  row: {
    flexDirection: 'row',
    gap: GUIDE_SPACING.lg,
    marginBottom: GUIDE_SPACING.md,
  },
  halfField: {
    flex: 1,
  },

  // Field Container
  fieldContainer: {
    marginBottom: GUIDE_SPACING.md,
  },
  fieldLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.sm,
  },

  // Input
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 56,
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    paddingHorizontal: GUIDE_SPACING.lg,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    color: GUIDE_COLORS.textPrimary,
    ...GUIDE_SHADOWS.sm,
  },
  inputMultiline: {
    height: 160,
    paddingTop: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.lg,
    textAlignVertical: 'top',
  },
  inputWithIconLeft: {
    paddingLeft: 44,
  },
  inputWithIconRight: {
    paddingRight: 44,
  },
  inputIconLeft: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  inputIconRight: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
  },

  // Map Preview
  mapPreview: {
    width: '100%',
    height: 128,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    marginTop: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.sm,
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.md,
    backgroundColor: 'rgba(248, 248, 246, 0.85)',
  },
  mapLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GUIDE_SPACING.xs,
  },
  mapLabelText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingTop: GUIDE_SPACING.lg,
    backgroundColor: GUIDE_COLORS.background,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.borderLight,
    zIndex: 20,
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: GUIDE_SPACING.sm,
    height: 56,
    backgroundColor: GUIDE_COLORS.primary,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    ...GUIDE_SHADOWS.lg,
    shadowColor: GUIDE_COLORS.primary,
    shadowOpacity: 0.3,
  },
  saveButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.backgroundDark,
  },
});

export default EventDetailScreen;
