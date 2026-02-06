import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { CreatePlanRequest } from '../../../../types/pilgrim/planner.types';

const { width } = Dimensions.get('window');

// Mock Data for Date Strip (Sept 2024 for example, but effectively we want to generate valid dates)
const DAYS_IN_MONTH = 31;
const START_DAY_OFFSET = 0; // Starts sunday

const generateDays = () => {
    // Just a simple generation of 18 days for demo
    const days = [];
    const today = new Date();
    // Start from today - 2 days
    const start = new Date();
    start.setDate(today.getDate() - 2);

    for (let i = 0; i < 21; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push({
            date: d.getDate(),
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
            fullDate: d.toISOString().split('T')[0],
            isToday: d.getDate() === today.getDate() && d.getMonth() === today.getMonth(),
        });
    }
    return days;
};

const DAYS = generateDays();

const CreatePlanScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    // Form State
    const [name, setName] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [duration, setDuration] = useState(3); // Default 3 days
    const [budget, setBudget] = useState<'low' | 'medium' | 'high'>('medium');
    const [isPrivate, setIsPrivate] = useState(true);

    // Extra fields to satisfy API
    const [peopleCount, setPeopleCount] = useState(1);
    const [transportation, setTransportation] = useState('bus'); // Default bus

    const handleCreate = () => {
        const payload: CreatePlanRequest = {
            name,
            start_date: selectedDate,
            number_of_days: duration,
            number_of_people: peopleCount,
            transportation,
            budget_level: budget,
            is_public: !isPrivate,
        };
        console.log('Creating Plan:', payload);
        // Dispatch API call here
        navigation.goBack();
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />

                {/* Background Pattern */}
                <View style={styles.backgroundPattern} pointerEvents="none" />

                {/* Header */}
                <View style={[styles.header, { marginTop: insets.top }]}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.cancelText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Pilgrimage</Text>
                    <View style={{ width: 60 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Section 1: Name */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Name your Journey</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Camino de Santiago 2024"
                            placeholderTextColor={COLORS.textSecondary}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    {/* Section 2: Date Picker Strip */}
                    <View style={styles.section}>
                        <View style={styles.card}>
                            <View style={styles.monthHeader}>
                                <TouchableOpacity style={styles.iconButtonSmall}><Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} /></TouchableOpacity>
                                <Text style={styles.monthText}>{new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                                <TouchableOpacity style={styles.iconButtonSmall}><Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} /></TouchableOpacity>
                            </View>

                            <View style={styles.daysRow}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                    <Text key={i} style={styles.dayHeader}>{d}</Text>
                                ))}
                            </View>

                            <FlatList
                                horizontal
                                data={DAYS}
                                keyExtractor={(item) => item.fullDate}
                                scrollEnabled={true}
                                contentContainerStyle={{ paddingHorizontal: 4 }} // Align roughly
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item }) => {
                                    const isSelected = item.fullDate === selectedDate;
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.dayButton,
                                                isSelected && styles.dayButtonSelected
                                            ]}
                                            onPress={() => setSelectedDate(item.fullDate)}
                                        >
                                            <Text style={[
                                                styles.dayDate,
                                                isSelected && styles.dayDateSelected
                                            ]}>
                                                {item.date}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </View>
                    </View>

                    {/* Section 3: Duration Slider */}
                    <View style={styles.section}>
                        <View style={styles.card}>
                            <View style={styles.sliderHeader}>
                                <Text style={styles.label}>Duration</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                    <Text style={styles.durationValue}>{duration}</Text>
                                    <Text style={styles.durationUnit}> Days</Text>
                                </View>
                            </View>

                            <Slider
                                style={{ width: '100%', height: 40 }}
                                minimumValue={1}
                                maximumValue={30}
                                step={1}
                                value={duration}
                                onValueChange={setDuration}
                                minimumTrackTintColor={COLORS.accent}
                                maximumTrackTintColor={COLORS.border}
                                thumbTintColor={COLORS.accent}
                            />

                            <View style={styles.sliderLabels}>
                                <Text style={styles.sliderLabelMin}>1 Day</Text>
                                <Text style={styles.sliderLabelMax}>30+ Days</Text>
                            </View>
                        </View>
                    </View>

                    {/* Section 4: Budget Level */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Budget Level</Text>
                        <View style={styles.budgetContainer}>
                            {(['low', 'medium', 'high'] as const).map((level) => {
                                const isSelected = budget === level;
                                return (
                                    <TouchableOpacity
                                        key={level}
                                        style={[
                                            styles.budgetOption,
                                            isSelected && styles.budgetOptionSelected
                                        ]}
                                        onPress={() => setBudget(level)}
                                    >
                                        <Text style={[
                                            styles.budgetOptionText,
                                            isSelected && styles.budgetOptionTextSelected
                                        ]}>
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Section 5: Participants & Transport (API Requirement) */}
                    <View style={[styles.section, { flexDirection: 'row', gap: 12 }]}>
                        {/* People Counter */}
                        <View style={[styles.card, { flex: 1, padding: 12 }]}>
                            <Text style={styles.labelSmall}>Pilgrims</Text>
                            <View style={styles.counterRow}>
                                <TouchableOpacity
                                    onPress={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                                    style={styles.counterBtn}
                                >
                                    <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                                <Text style={styles.counterValue}>{peopleCount}</Text>
                                <TouchableOpacity
                                    onPress={() => setPeopleCount(Math.min(50, peopleCount + 1))}
                                    style={styles.counterBtn}
                                >
                                    <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Transport Selector (Simplified) */}
                        <View style={[styles.card, { flex: 1, padding: 12 }]}>
                            <Text style={styles.labelSmall}>Transport</Text>
                            <View style={styles.transportRow}>
                                {(['bus', 'car', 'walk'] as const).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.transportIcon,
                                            transportation === t && styles.transportIconSelected
                                        ]}
                                        onPress={() => setTransportation(t)}
                                    >
                                        <Ionicons
                                            name={t === 'bus' ? 'bus' : t === 'car' ? 'car' : 'walk'}
                                            size={20}
                                            color={transportation === t ? COLORS.white : COLORS.textSecondary}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Section 6: Privacy Toggle */}
                    <View style={styles.section}>
                        <View style={[styles.card, styles.privacyCard]}>
                            <View>
                                <Text style={styles.label}>Private Pilgrimage</Text>
                                <Text style={styles.helperText}>Only visible to you</Text>
                            </View>
                            <Switch
                                value={isPrivate}
                                onValueChange={setIsPrivate}
                                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                                thumbColor={COLORS.white}
                            />
                        </View>
                    </View>

                    <View style={{ height: 100 }} />

                </ScrollView>

                {/* Footer */}
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                        <Text style={styles.createButtonText}>Create & Plan Route</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.draftButton}>
                        <Text style={styles.draftButtonText}>Save as Draft</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundSoft,
    },
    backgroundPattern: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.05,
        backgroundColor: 'transparent',
        // Add pattern styling/image here if available
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        fontFamily: TYPOGRAPHY.fontFamily.display,
    },
    cancelButton: {
        padding: 8,
        marginLeft: -8,
    },
    cancelText: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    content: {
        padding: SPACING.lg,
    },
    section: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    labelSmall: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        height: 56,
        fontSize: TYPOGRAPHY.fontSize.md,
        color: COLORS.textPrimary,
        ...SHADOWS.subtle,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md,
        ...SHADOWS.subtle,
    },
    // Calendar Styling
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    monthText: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    iconButtonSmall: {
        padding: 4,
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
        paddingHorizontal: 12, // Align roughly with day buttons
    },
    dayHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textTertiary,
        width: 36,
        textAlign: 'center',
    },
    dayButton: {
        width: 36,
        height: 36,
        borderRadius: BORDER_RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 3, // Spacing
    },
    dayButtonSelected: {
        backgroundColor: COLORS.accent,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    dayDate: {
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    dayDateSelected: {
        color: COLORS.white, // Or contrast color
        fontWeight: 'bold',
    },

    // Slider Styling
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    durationValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.accent,
    },
    durationUnit: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    sliderLabelMin: { fontSize: 12, color: COLORS.textTertiary },
    sliderLabelMax: { fontSize: 12, color: COLORS.textTertiary },

    // Budget Styling
    budgetContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.03)', // Light gray bg
        padding: 4,
        borderRadius: BORDER_RADIUS.lg,
    },
    budgetOption: {
        flex: 1,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
    },
    budgetOptionSelected: {
        backgroundColor: COLORS.white,
        shadowColor: 'black',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 1,
    },
    budgetOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    budgetOptionTextSelected: {
        color: COLORS.textPrimary,
        fontWeight: '600',
    },

    // Counter & Transport
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.md,
        padding: 4,
    },
    counterBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.sm,
        ...SHADOWS.subtle,
    },
    counterValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    transportRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    transportIcon: {
        width: 36,
        height: 36,
        borderRadius: BORDER_RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    transportIconSelected: {
        backgroundColor: COLORS.accent,
    },

    // Privacy
    privacyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    helperText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.md,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: SPACING.md,
    },
    createButton: {
        backgroundColor: COLORS.accent,
        height: 48,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    createButtonText: {
        color: COLORS.textPrimary, // Mockup has dark text on yellow
        fontSize: 16,
        fontWeight: 'bold',
    },
    draftButton: {
        backgroundColor: 'transparent',
        height: 48,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    draftButtonText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CreatePlanScreen;
