import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ImageBackground,
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
import { MediaPickerModal } from '../../../../components/common/MediaPickerModal';
import { COLORS, SHADOWS, SPACING } from '../../../../constants/theme.constants';
import pilgrimJournalApi from '../../../../services/api/pilgrim/journalApi';
import pilgrimPlannerApi from '../../../../services/api/pilgrim/plannerApi';
import { CheckInEntity, PlanEntity } from '../../../../types/pilgrim/planner.types';
import { normalizeImageUrls, parsePostgresArray } from '../../../../utils/postgresArrayParser';

const { width } = Dimensions.get('window');
const FontDisplay = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const dedupeCheckInsByPlannerItem = (checkIns: CheckInEntity[]) =>
    Array.from(
        new Map(
            checkIns
                .filter((checkIn) => checkIn.planner_item_id)
                .map((checkIn) => [checkIn.planner_item_id, checkIn]),
        ).values(),
    );

const getJournalPlannerItemIds = (journal: any): string[] =>
    Array.from(
        new Set([
            ...parsePostgresArray(journal?.planner_item_id),
            ...parsePostgresArray(journal?.planner_item_ids),
        ]),
    );

const buildLocationFromCheckIns = (checkIns: CheckInEntity[]) =>
    Array.from(
        new Set(checkIns.map((checkIn) => checkIn.site?.name || '').filter(Boolean)),
    ).join(', ');

export default function CreateJournalScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { journalId, plannerItemId: paramPlannerItemId } = route.params || {};
    const insets = useSafeAreaInsets();

    // State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [existingImages, setExistingImages] = useState<string[]>([]);

    // Media State
    const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [isMediaPickerVisible, setMediaPickerVisible] = useState(false);
    const [mediaType, setMediaType] = useState<'images' | 'videos'>('images');

    // Audio Recording State
    const [recording, setRecording] = useState<Audio.Recording | undefined>();
    const [recordingUri, setRecordingUri] = useState<string | undefined>();
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [sound, setSound] = useState<Audio.Sound | undefined>();
    const [isPlaying, setIsPlaying] = useState(false);

    // ── Step 1: Chọn kế hoạch đã hoàn thành (planner_id) ──
    const [completedPlanners, setCompletedPlanners] = useState<PlanEntity[]>([]);
    const [selectedPlanner, setSelectedPlanner] = useState<PlanEntity | null>(null);
    const [plannerLoading, setPlannerLoading] = useState(false);

    // ── Step 2: Chọn điểm check-in thuộc planner đó (planner_item_ids - multi-select) ──
    const [allCheckIns, setAllCheckIns] = useState<CheckInEntity[]>([]);
    const [filteredCheckIns, setFilteredCheckIns] = useState<CheckInEntity[]>([]);
    const [checkInLoading, setCheckInLoading] = useState(false);
    const [checkInsLoaded, setCheckInsLoaded] = useState(false);
    const [selectedPlannerItemIds, setSelectedPlannerItemIds] = useState<string[]>(
        paramPlannerItemId ? [paramPlannerItemId] : []
    );
    const [location, setLocation] = useState('');
    const [pendingEditSelection, setPendingEditSelection] = useState<{
        plannerId?: string;
        plannerName?: string;
        plannerItemIds: string[];
        location?: string;
    } | null>(null);
    const [editSelectionInitialized, setEditSelectionInitialized] = useState(false);

    useEffect(() => {
        setPendingEditSelection(null);
        setEditSelectionInitialized(false);
    }, [journalId]);

    useEffect(() => {
        fetchCompletedPlanners();
        fetchMyCheckIns();
        if (journalId) fetchJournalDetails();
    }, [journalId]);

    useEffect(() => {
        if (!journalId || !checkInsLoaded || !pendingEditSelection || editSelectionInitialized) {
            return;
        }

        const plannerChoice = pendingEditSelection.plannerId
            ? completedPlanners.find((planner) => planner.id === pendingEditSelection.plannerId) ||
              ({
                  id: pendingEditSelection.plannerId,
                  name: pendingEditSelection.plannerName || 'Kế hoạch hành hương',
                  user_id: '',
                  number_of_people: 0,
                  transportation: '',
                  status: 'completed',
                  share_token: '',
                  qr_code_url: '',
                  created_at: '',
                  updated_at: '',
              } as PlanEntity)
            : null;

        if (!plannerChoice) {
            const nextPlannerItemIds = pendingEditSelection.plannerItemIds;
            setSelectedPlannerItemIds(nextPlannerItemIds);
            setLocation(pendingEditSelection.location || '');
            setEditSelectionInitialized(true);
            return;
        }

        hydratePlannerSelection(plannerChoice, pendingEditSelection.plannerItemIds, {
            autoSelectSingle: false,
            fallbackLocation: pendingEditSelection.location,
        }).finally(() => {
            setEditSelectionInitialized(true);
        });
    }, [checkInsLoaded, completedPlanners, editSelectionInitialized, journalId, pendingEditSelection]);

    /** Fetch tất cả planner có status === 'completed' */
    const fetchCompletedPlanners = async () => {
        try {
            setPlannerLoading(true);
            const response = await pilgrimPlannerApi.getPlans({ limit: 100 });
            if (response.success && response.data?.planners) {
                const completed = response.data.planners.filter(p => p.status === 'completed');
                setCompletedPlanners(completed);
            }
        } catch (error) {
            console.error('Failed to fetch completed planners', error);
        } finally {
            setPlannerLoading(false);
        }
    };

    /** Fetch tất cả check-ins của user (chỉ lấy status='checked_in') */
    const fetchMyCheckIns = async () => {
        try {
            const response = await pilgrimPlannerApi.getMyCheckIns();
            if (response.success && response.data) {
                const rawData = response.data as CheckInEntity[] | { check_ins?: CheckInEntity[] };
                const all = Array.isArray(rawData) ? rawData : rawData.check_ins || [];
                const valid = dedupeCheckInsByPlannerItem(all.filter(
                    (c) => (!c.status || c.status === 'checked_in') && c.site && c.site.name
                ));
                setAllCheckIns(valid);

                // Nếu navigate từ planner item cụ thể
                if (paramPlannerItemId) {
                    const found = valid.find(c => c.planner_item_id === paramPlannerItemId);
                    if (found && found.site) {
                        setLocation(found.site.name);
                        setSelectedPlannerItemIds([found.planner_item_id]);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch check-ins', error);
        } finally {
            setCheckInsLoaded(true);
        }
    };

    /** User chọn kế hoạch → fetch detail để lấy items[], filter check-ins, reset chọn điểm */
    const hydratePlannerSelection = async (
        planner: PlanEntity,
        initialSelectedPlannerItemIds: string[] = [],
        options?: {
            autoSelectSingle?: boolean;
            fallbackLocation?: string;
        },
    ) => {
        setSelectedPlanner(planner);
        setFilteredCheckIns([]);
        setCheckInLoading(true);

        try {
            const detail = await pilgrimPlannerApi.getPlanDetail(planner.id);
            const plannerItems = detail?.data?.items ||
                Object.values(detail?.data?.items_by_day || {}).flat();
            const plannerItemIds = new Set(plannerItems.map((item: any) => item.id));
            const filtered = dedupeCheckInsByPlannerItem(allCheckIns.filter(c => plannerItemIds.has(c.planner_item_id)));
            const matchedCheckIns = filtered.filter((checkIn) =>
                initialSelectedPlannerItemIds.includes(checkIn.planner_item_id),
            );

            setFilteredCheckIns(filtered);

            if (matchedCheckIns.length > 0) {
                setSelectedPlannerItemIds(matchedCheckIns.map((checkIn) => checkIn.planner_item_id));
                setLocation(buildLocationFromCheckIns(matchedCheckIns));
                return;
            }

            if (options?.autoSelectSingle !== false && filtered.length === 1 && filtered[0].site) {
                setSelectedPlannerItemIds([filtered[0].planner_item_id]);
                setLocation(filtered[0].site.name);
                return;
            }

            setSelectedPlannerItemIds([]);
            setLocation(options?.fallbackLocation || '');
        } catch (error) {
            console.error('Failed to fetch planner detail', error);
            const filtered = dedupeCheckInsByPlannerItem(allCheckIns.filter(c => c.planner?.id === planner.id));
            const matchedCheckIns = filtered.filter((checkIn) =>
                initialSelectedPlannerItemIds.includes(checkIn.planner_item_id),
            );

            setFilteredCheckIns(filtered);

            if (matchedCheckIns.length > 0) {
                setSelectedPlannerItemIds(matchedCheckIns.map((checkIn) => checkIn.planner_item_id));
                setLocation(buildLocationFromCheckIns(matchedCheckIns));
                return;
            }

            setSelectedPlannerItemIds([]);
            setLocation(options?.fallbackLocation || '');
        } finally {
            setCheckInLoading(false);
        }
    };

    const handleSelectPlanner = async (planner: PlanEntity) => {
        setEditSelectionInitialized(true);
        await hydratePlannerSelection(planner);
        return;
        /*
            // Fetch chi tiết planner để lấy danh sách items[]
            const detail = await pilgrimPlannerApi.getPlanDetail(planner.id);
            const plannerItems = detail?.data?.items || 
                Object.values(detail?.data?.items_by_day || {}).flat();

            // Lấy set id của các planner items
            const plannerItemIds = new Set(plannerItems.map((item: any) => item.id));

            // Filter check-ins: chỉ giữ những check-in có planner_item_id trong planner này
            const filtered = dedupeCheckInsByPlannerItem(allCheckIns.filter(c => plannerItemIds.has(c.planner_item_id)));
            setFilteredCheckIns(filtered);

            // Nếu chỉ có 1 check-in, tự động chọn luôn
            if (filtered.length === 1 && filtered[0].site) {
                setSelectedPlannerItemIds([filtered[0].planner_item_id]);
                setLocation(filtered[0].site.name);
            }
        } catch (error) {
            console.error('Failed to fetch planner detail', error);
            const filtered = dedupeCheckInsByPlannerItem(allCheckIns.filter(c => c.planner?.id === planner.id));
            setFilteredCheckIns(filtered);
        } finally {
            setCheckInLoading(false);
        }
        */
    };

    /** Toggle chọn / bỏ chọn điểm check-in */
    const handleSelectLocation = (checkIn: CheckInEntity) => {
        if (!checkIn.site) return;
        const id = checkIn.planner_item_id;
        setSelectedPlannerItemIds(prev => {
            const isSelected = prev.includes(id);
            const next = isSelected ? prev.filter(x => x !== id) : Array.from(new Set([...prev, id]));
            // Cập nhật location text
            const selectedCheckIns = filteredCheckIns.filter(c => next.includes(c.planner_item_id));
            setLocation(selectedCheckIns.map(c => c.site?.name || '').filter(Boolean).join(', '));
            return next;
        });
    };

    const handlePickMedia = async (type: 'images' | 'videos') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'images'
                ? ImagePicker.MediaTypeOptions.Images
                : ImagePicker.MediaTypeOptions.Videos,
            allowsMultipleSelection: type === 'images',
            quality: 0.8,
            videoMaxDuration: 300, // 5 phút
        });

        if (!result.canceled && result.assets.length > 0) {
            if (type === 'images') {
                setSelectedImages(prev => [...prev, ...result.assets].slice(0, 10));
            } else {
                // Chỉ cho chọn 1 video
                setSelectedVideos([result.assets[0]]);
            }
        }
    };

    const handleMediaPicked = (result: ImagePicker.ImagePickerResult) => {
        if (!result.canceled) {
            if (mediaType === 'images') {
                setSelectedImages((prev) => [...prev, ...result.assets].slice(0, 10));
            } else {
                setSelectedVideos([result.assets[0]]);
            }
        }
        setMediaPickerVisible(false);
    };

    const handleRemoveMedia = (index: number, type: 'images' | 'videos' = 'images') => {
        if (type === 'images') {
            setSelectedImages((prev) => prev.filter((_, i) => i !== index));
        } else {
            setSelectedVideos([]);
        }
    };

    const handleRecordAudio = async () => {
        try {
            console.log('Starting audio recording...');
            // Request permissions
            const permission = await Audio.requestPermissionsAsync();
            console.log('Audio permission:', permission);
            if (!permission.granted) {
                Alert.alert(
                    'Quyền truy cập',
                    'Cần quyền truy cập microphone để ghi âm. Vui lòng cấp quyền trong cài đặt.'
                );
                return;
            }

            // If already recording, stop it
            if (recording) {
                await handleStopRecording();
                return;
            }

            // Configure audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                interruptionModeIOS: 1, // DoNotMix
                shouldDuckAndroid: true,
                interruptionModeAndroid: 1, // DoNotMix
                playThroughEarpieceAndroid: false,
            });

            console.log('Creating recording...');
            // Start recording
            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            console.log('Recording created successfully');

            setRecording(newRecording);
            setIsRecording(true);
            setRecordingDuration(0);

            // Update duration every second
            newRecording.setOnRecordingStatusUpdate((status) => {
                if (status.isRecording && status.durationMillis) {
                    setRecordingDuration(Math.floor(status.durationMillis / 1000));
                }
            });
        } catch (error) {
            console.error('Failed to start recording:', error);
            Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm. Vui lòng thử lại.');
        }
    };

    const handleStopRecording = async () => {
        if (!recording) return;

        try {
            const status = await recording.getStatusAsync();
            console.log('Recording status before stop:', status);
            
            // Save final duration
            if (status.durationMillis) {
                setRecordingDuration(Math.floor(status.durationMillis / 1000));
            }
            
            // Get URI before stopping
            const uri = recording.getURI();
            console.log('Recording URI:', uri);
            
            // Only unload if recording is still loaded
            if (status.canRecord || status.isRecording) {
                await recording.stopAndUnloadAsync();
            }
            
            setRecordingUri(uri || undefined);
            setRecording(undefined);
            setIsRecording(false);

            if (uri) {
                Alert.alert('Thành công', 'Đã lưu ghi âm. Nhấn nút play để nghe lại.');
            }

            // Reset audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });
        } catch (error) {
            console.error('Failed to stop recording:', error);
            setRecording(undefined);
            setIsRecording(false);
            Alert.alert('Lỗi', 'Không thể dừng ghi âm.');
        }
    };

    const handlePlayAudio = async () => {
        if (!recordingUri) {
            console.warn('No recording URI available');
            return;
        }

        console.log('Playing audio from URI:', recordingUri);

        try {
            // If sound exists and is playing, pause it
            if (sound && isPlaying) {
                await sound.pauseAsync();
                setIsPlaying(false);
                return;
            }

            // If sound exists and is paused, resume it
            if (sound && !isPlaying) {
                await sound.playAsync();
                setIsPlaying(true);
                return;
            }

            // Set audio mode for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            // Create new sound if doesn't exist
            console.log('Creating audio sound...');
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: recordingUri },
                { shouldPlay: true }
            );
            console.log('Audio sound created successfully');
            setSound(newSound);
            setIsPlaying(true);

            // Auto cleanup when finished
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    newSound.unloadAsync().catch(console.error);
                    setSound(undefined);
                    setIsPlaying(false);
                }
            });
        } catch (error) {
            console.error('Failed to play audio:', error);
            setIsPlaying(false);
            Alert.alert('Lỗi', 'Không thể phát âm thanh. Vui lòng thử ghi âm lại.');
        }
    };

    const handleDeleteAudio = () => {
        Alert.alert(
            'Xóa ghi âm',
            'Bạn có chắc muốn xóa ghi âm này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (sound) {
                                await sound.unloadAsync();
                                setSound(undefined);
                            }
                        } catch (error) {
                            console.error('Failed to unload sound:', error);
                        }
                        setRecordingUri(undefined);
                        setRecordingDuration(0);
                        setIsPlaying(false);
                    },
                },
            ]
        );
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recording) {
                recording.getStatusAsync().then((status) => {
                    if (status.canRecord || status.isRecording) {
                        recording.stopAndUnloadAsync().catch(console.error);
                    }
                }).catch(console.error);
            }
            if (sound) {
                sound.unloadAsync().catch(console.error);
            }
        };
    }, [recording, sound]);

    const fetchJournalDetails = async () => {
        try {
            setInitialLoading(true);
            const response = await pilgrimJournalApi.getJournalDetail(journalId);
            if (response.success && response.data) {
                const data = response.data;
                const plannerItemIds = getJournalPlannerItemIds(data);
                const plannerId = data.planner?.id || data.planner_id;
                const plannerName = data.planner?.name;
                const fallbackLocation = data.site?.name || '';

                setTitle(data.title);
                setContent(data.content);
                setSelectedPlannerItemIds(plannerItemIds);
                setLocation(fallbackLocation);
                if (data.image_url) {
                    setExistingImages(normalizeImageUrls(data.image_url));
                }
                if (plannerId) {
                    setSelectedPlanner(
                        completedPlanners.find((planner) => planner.id === plannerId) ||
                        ({
                            id: plannerId,
                            name: plannerName || 'Kế hoạch hành hương',
                            user_id: '',
                            number_of_people: 0,
                            transportation: '',
                            status: 'completed',
                            share_token: '',
                            qr_code_url: '',
                            created_at: '',
                            updated_at: '',
                        } as PlanEntity),
                    );
                }
                setPendingEditSelection({
                    plannerId,
                    plannerName,
                    plannerItemIds,
                    location: fallbackLocation,
                });
                // Load existing audio if available
                if (data.audio_url) {
                    setRecordingUri(data.audio_url);
                    // Optionally set duration if backend provides it
                    // setRecordingDuration(data.audio_duration || 0);
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load journal details');
            navigation.goBack();
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSave = async (privacy: 'private' | 'public') => {
        if (!title.trim() || !content.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và nội dung');
            return;
        }

        // Validate: phải chọn ít nhất 1 điểm check-in khi tạo mới
        if (!journalId && selectedPlannerItemIds.length === 0) {
            Alert.alert('Yêu cầu check-in trước', 'Vui lòng chọn ít nhất một địa điểm bạn đã check-in.');
            return;
        }

        setLoading(true);
        try {
            const plannerItemIds = Array.from(new Set(selectedPlannerItemIds.filter(Boolean)));

            if (journalId) {
                // UPDATE
                // Prepare new image URIs (only send newly selected images)
                const imageUris = selectedImages.map(img => img.uri);

                if (plannerItemIds.length === 0) {
                    Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một địa điểm đã check-in');
                    return;
                }

                await pilgrimJournalApi.updateJournal(journalId, {
                    title,
                    content,
                    planner_item_ids: plannerItemIds,
                    planner_id: selectedPlanner?.id || pendingEditSelection?.plannerId,
                    privacy,
                    images: imageUris.length > 0 ? imageUris : undefined,
                    video: selectedVideos[0]?.uri || undefined,
                    audio: recordingUri,
                });
                Alert.alert(
                    "Thành công", 
                    `Đã cập nhật nhật ký${
                        imageUris.length > 0 ? ` (+${imageUris.length} ảnh mới)` : ''
                    }${recordingUri ? ' với audio' : ''}`
                );
            } else {
                // CREATE - ít nhất 1 planner_item_id là required
                if (plannerItemIds.length === 0) {
                    Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một địa điểm đã check-in');
                    return;
                }

                // Prepare image URIs
                const imageUris = selectedImages.map(img => img.uri);

                await pilgrimJournalApi.createJournal({
                    title: title.trim(),
                    content: content.trim(),
                    planner_item_ids: plannerItemIds,
                    planner_id: selectedPlanner?.id || undefined,
                    privacy,
                    images: imageUris.length > 0 ? imageUris : undefined,
                    video: selectedVideos[0]?.uri || undefined,
                    audio: recordingUri,
                });
                Alert.alert(
                    "Đã tạo", 
                    `Đã tạo nhật ký tâm linh${
                        imageUris.length > 0 ? ` với ${imageUris.length} ảnh` : ''
                    }${recordingUri ? ' và ghi âm' : ''}`
                );
            }
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            Alert.alert("Lỗi", error?.message || "Không thể lưu nhật ký");
        } finally {
            setLoading(false);
        }
    };

    // Mock images for UI if empty
    const displayImages = selectedImages.length > 0 
        ? selectedImages.map((img, i) => ({ id: `new-${i}`, uri: img.uri })) 
        : existingImages.map(uri => ({ id: uri, uri }));

    if (initialLoading) {
        return (
            <ImageBackground source={require('../../../../../assets/images/bg3.jpg')} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} resizeMode="cover">
                <StatusBar barStyle="dark-content" />
                <ActivityIndicator size="large" color={COLORS.accent} />
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={require('../../../../../assets/images/bg3.jpg')} style={styles.container} resizeMode="cover">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 0) }]}>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{journalId ? 'Cập nhật nhật ký' : 'Viết nhật ký tâm linh'}</Text>

                <TouchableOpacity style={styles.iconButton}>
                    <MaterialIcons name="bookmark-border" size={24} color={COLORS.accent} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.contentJSON, { paddingBottom: 150 }]} // Padding for footer
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── STEP 1: Chọn kế hoạch hành hương đã hoàn thành (planner_id) ── */}
                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <MaterialIcons name="route" size={16} color={COLORS.accent} style={{ marginRight: 6 }} />
                            <Text style={styles.label}>Bước 1: Chọn kế hoạch</Text>
                            <View style={styles.completedBadge}>
                                <Text style={styles.completedBadgeText}>Đã hoàn thành</Text>
                            </View>
                        </View>

                        {plannerLoading ? (
                            <ActivityIndicator size="small" color={COLORS.accent} style={{ marginVertical: 8 }} />
                        ) : completedPlanners.length === 0 ? (
                            <Text style={styles.emptyHint}>Chưa có kế hoạch nào hoàn thành</Text>
                        ) : (
                            <View style={styles.chipWrapContainer}>
                                {completedPlanners.map((planner) => (
                                    <TouchableOpacity
                                        key={planner.id}
                                        style={[
                                            styles.chip,
                                            selectedPlanner?.id === planner.id && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }
                                        ]}
                                        onPress={() => handleSelectPlanner(planner)}
                                    >
                                        <MaterialIcons
                                            name="check-circle"
                                            size={16}
                                            color={selectedPlanner?.id === planner.id ? COLORS.white : COLORS.accent}
                                        />
                                        <Text style={[
                                            styles.chipText,
                                            selectedPlanner?.id === planner.id && { color: COLORS.white }
                                        ]} numberOfLines={1}>
                                            {planner.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* ── STEP 2: Chọn điểm check-in của kế hoạch đó (planner_item_id) ── */}
                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <MaterialIcons name="location-on" size={16} color={COLORS.accent} style={{ marginRight: 6 }} />
                            <Text style={styles.label}>Bước 2: Chọn địa điểm</Text>
                        </View>

                        <View style={styles.locationInput}>
                            <MaterialIcons name="location-on" size={20} color={COLORS.textSecondary} style={styles.locationIcon} />
                            <Text style={[styles.locationPlaceholder, location ? { color: COLORS.textPrimary } : {}]}>
                                {location || (selectedPlanner ? 'Chọn điểm đã check-in bên dưới' : 'Vui lòng chọn kế hoạch trước')}
                            </Text>
                        </View>

                        <Text style={{ fontSize: 12, color: COLORS.textTertiary, marginTop: 8, marginBottom: 4 }}>
                            {selectedPlanner
                                ? `Điểm đã check-in trong "${selectedPlanner.name}":`
                                : 'Chọn kế hoạch ở bước 1 để xem các điểm đã check-in'}
                        </Text>

                        {/* Chips check-in - chỉ hiện sau khi chọn planner */}
                        {(selectedPlanner || journalId) && (
                            checkInLoading ? (
                                <ActivityIndicator size="small" color={COLORS.accent} style={{ marginVertical: 10 }} />
                            ) : (
                                <View style={styles.chipWrapContainer}>
                                    {filteredCheckIns.length > 0 ? (
                                        filteredCheckIns.map((checkIn: CheckInEntity, index: number) => (
                                            <TouchableOpacity
                                                key={checkIn.id || index}
                                                style={[
                                                    styles.chip,
                                                    selectedPlannerItemIds.includes(checkIn.planner_item_id) && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }
                                                ]}
                                                onPress={() => handleSelectLocation(checkIn)}
                                            >
                                                <MaterialIcons
                                                    name={selectedPlannerItemIds.includes(checkIn.planner_item_id) ? "check-circle" : "radio-button-unchecked"}
                                                    size={16}
                                                    color={selectedPlannerItemIds.includes(checkIn.planner_item_id) ? COLORS.white : COLORS.accent}
                                                />
                                                <Text style={[
                                                    styles.chipText,
                                                    selectedPlannerItemIds.includes(checkIn.planner_item_id) && { color: COLORS.white }
                                                ]}>
                                                    {checkIn.site?.name || 'Địa điểm'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={{ color: COLORS.textSecondary, fontStyle: 'italic', padding: 10 }}>
                                            {selectedPlanner
                                                ? 'Bạn chưa check-in điểm nào trong kế hoạch này'
                                                : 'Không có địa điểm đã check-in'}
                                        </Text>
                                    )}
                                </View>
                            )
                        )}
                    </View>

                    {/* Reflection Editor */}
                    <View style={styles.editorContainer}>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Tiêu đề suy niệm..."
                            placeholderTextColor="rgba(138, 128, 96, 0.5)"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <View style={styles.divider} />

                        <View style={styles.toolbar}>
                            <View style={styles.toolbarGroup}>
                                <TouchableOpacity style={styles.toolbarBtn}>
                                    <MaterialIcons name="format-bold" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.toolbarBtn}>
                                    <MaterialIcons name="format-italic" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.toolbarBtn}>
                                    <MaterialIcons name="format-list-bulleted" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.toolbarDivider} />

                            <TouchableOpacity 
                                style={[styles.toolbarBtn, styles.micBtnMini]}
                                onPress={handleRecordAudio}
                            >
                                <MaterialIcons 
                                    name={isRecording ? "stop" : "mic"} 
                                    size={20} 
                                    color={isRecording ? "#FF0000" : COLORS.accent} 
                                />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.toolbarBtn, { marginLeft: 'auto' }]}
                                onPress={() => handlePickMedia('images')}
                            >
                                <MaterialIcons name="add-photo-alternate" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.multilineInput}
                            placeholder="Bạn cảm nhận gì trong giây phút này..."
                            placeholderTextColor="rgba(138, 128, 96, 0.4)"
                            multiline
                            textAlignVertical="top"
                            value={content}
                            onChangeText={setContent}
                        />
                    </View>

                    {/* Media Strip */}
                    <View style={styles.section}>
                        <View style={styles.mediaHeader}>
                            <Text style={styles.label}>Hình ảnh & Video</Text>
                            <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>
                                {displayImages.length + selectedVideos.length > 0
                                    ? `${displayImages.length} ảnh${selectedVideos.length > 0 ? ', 1 video' : ''}`
                                    : 'Tối đa 10 ảnh + 1 video'}
                            </Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                            {/* Nút thêm (ActionSheet) */}
                            <TouchableOpacity
                                style={styles.addMediaBtn}
                                onPress={() => {
                                    Alert.alert(
                                        'Thêm phương tiện',
                                        'Chọn loại tệp muốn thêm',
                                        [
                                            { text: '📷  Chọn ảnh', onPress: () => handlePickMedia('images') },
                                            { text: '🎬  Chọn video', onPress: () => handlePickMedia('videos') },
                                            { text: 'Huỷ', style: 'cancel' },
                                        ]
                                    );
                                }}
                            >
                                <MaterialIcons name="add-circle-outline" size={28} color={COLORS.accent} />
                                <Text style={styles.addMediaText}>Thêm</Text>
                            </TouchableOpacity>

                            {/* Thumbnails ảnh */}
                            {displayImages.map((img, index) => (
                                <View key={img.id || index} style={styles.mediaItem}>
                                    <Image source={{ uri: img.uri }} style={styles.mediaImage} />
                                    <TouchableOpacity
                                        style={styles.removeMediaBtn}
                                        onPress={() => handleRemoveMedia(index, 'images')}
                                    >
                                        <MaterialIcons name="close" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Thumbnail video */}
                            {selectedVideos.map((vid, index) => (
                                <View key={index} style={styles.mediaItem}>
                                    {vid.uri ? (
                                        <Image source={{ uri: vid.uri }} style={styles.mediaImage} />
                                    ) : (
                                        <View style={[styles.mediaImage, { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }]}>
                                            <MaterialIcons name="videocam" size={30} color={COLORS.accent} />
                                        </View>
                                    )}
                                    <View style={styles.videoOverlay}>
                                        <MaterialIcons name="play-circle-filled" size={28} color="rgba(255,255,255,0.9)" />
                                    </View>
                                    <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600' }}>VID</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeMediaBtn}
                                        onPress={() => handleRemoveMedia(0, 'videos')}
                                    >
                                        <MaterialIcons name="close" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Audio Recording Section */}
                    {(isRecording || recordingUri) && (
                        <View style={styles.section}>
                            <Text style={styles.label}>Ghi âm</Text>
                            {isRecording ? (
                                <View style={styles.recordingIndicator}>
                                    <View style={styles.recordingDot} />
                                    <Text style={styles.recordingText}>
                                        Đang ghi âm... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                    </Text>
                                    <TouchableOpacity 
                                        style={styles.stopRecordingBtn}
                                        onPress={handleStopRecording}
                                    >
                                        <MaterialIcons name="stop" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ) : recordingUri ? (
                                <View style={styles.audioPlayer}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.playBtn,
                                            isPlaying && styles.playBtnActive
                                        ]}
                                        onPress={handlePlayAudio}
                                    >
                                        <MaterialIcons 
                                            name={isPlaying ? "pause" : "play-arrow"} 
                                            size={28} 
                                            color={isPlaying ? "#fff" : COLORS.accent} 
                                        />
                                    </TouchableOpacity>
                                    <View style={styles.audioInfo}>
                                        <Text style={styles.audioTitle}>Ghi âm của bạn</Text>
                                        <Text style={[
                                            styles.audioDuration,
                                            isPlaying && styles.audioDurationActive
                                        ]}>
                                            {isPlaying 
                                                ? "Đang phát..." 
                                                : recordingDuration > 0 
                                                    ? `${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}`
                                                    : '0:00'
                                            }
                                        </Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.deleteAudioBtn}
                                        onPress={handleDeleteAudio}
                                    >
                                        <MaterialIcons name="delete-outline" size={24} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Floating Mic Button */}
            <View style={styles.floatingMicContainer} pointerEvents="box-none">
                <TouchableOpacity 
                    style={[
                        styles.floatingMicBtn,
                        isRecording && styles.floatingMicBtnRecording
                    ]} 
                    activeOpacity={0.9}
                    onPress={handleRecordAudio}
                >
                    <MaterialIcons 
                        name={isRecording ? "stop" : "mic"} 
                        size={32} 
                        color={isRecording ? "#fff" : COLORS.textPrimary} 
                    />
                </TouchableOpacity>
            </View>

            {/* Media Picker Modal */}
            <MediaPickerModal
                visible={isMediaPickerVisible}
                onClose={() => setMediaPickerVisible(false)}
                onMediaPicked={handleMediaPicked}
                mediaTypes={mediaType}
                allowsMultipleSelection={true}
                selectionLimit={10}
                title={mediaType === 'images' ? 'Thêm ảnh' : 'Thêm video'}
            />

            {/* Fixed Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.footerContent}>
                    <TouchableOpacity
                        style={styles.btnSecondary}
                        onPress={() => handleSave('private')}
                        disabled={loading}
                    >
                        <Text style={styles.btnSecondaryText}>{loading ? "Đang lưu..." : "Lưu riêng tư"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={() => handleSave('public')}
                        disabled={loading}
                    >
                        <Text style={styles.btnPrimaryText}>{loading ? "Đang đăng..." : "Đăng công khai"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background, // Cream/beige from theme
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: 'rgba(253, 251, 247, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.02)',
        zIndex: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        fontFamily: FontDisplay,
        letterSpacing: -0.5,
    },
    contentJSON: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
    },
    section: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginLeft: 4,
    },
    locationInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface0,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        ...SHADOWS.subtle,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    locationIcon: {
        marginRight: 12,
    },
    locationPlaceholder: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    chevronIcon: {
        marginLeft: 12,
    },
    chipContainer: {
        marginTop: 12,
        paddingVertical: 4, // for shadow clipping
    },
    chipWrapContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        paddingVertical: 4,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface0,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 99,
        marginRight: 8,
        marginBottom: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: 'transparent',
        ...SHADOWS.subtle,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textSecondary,
        flexShrink: 1,
    },
    editorContainer: {
        backgroundColor: COLORS.surface0,
        borderRadius: 24,
        padding: 4,
        ...SHADOWS.subtle,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        marginBottom: SPACING.lg,
    },
    titleInput: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
        fontFamily: FontDisplay,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 20,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    toolbarGroup: {
        flexDirection: 'row',
        gap: 4,
    },
    toolbarBtn: {
        padding: 8,
        borderRadius: 8,
    },
    micBtnMini: {
        backgroundColor: 'rgba(236, 182, 19, 0.1)',
    },
    toolbarDivider: {
        width: 1,
        height: 16,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    multilineInput: {
        fontSize: 18,
        lineHeight: 28,
        color: COLORS.textPrimary,
        padding: 20,
        minHeight: 240,
        fontFamily: FontDisplay,
    },
    mediaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    linkText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.accent,
    },
    mediaRow: {
        gap: 12,
        paddingTop: 8,
        paddingBottom: 8,
    },
    addMediaBtn: {
        width: 96,
        height: 96,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'rgba(236, 182, 19, 0.4)',
        borderStyle: 'dashed',
        backgroundColor: 'rgba(236, 182, 19, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    addMediaText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.accent,
    },
    mediaItem: {
        width: 96,
        height: 96,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        ...SHADOWS.small,
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeMediaBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',

    },
    floatingMicContainer: {
        position: 'absolute',
        bottom: 110, // Adjusted to sit above footer
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 40,
    },
    floatingMicBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        shadowColor: COLORS.accent,
        shadowOpacity: 0.4,
        borderWidth: 4,
        borderColor: COLORS.surface0,
    },
    floatingMicBtnRecording: {
        backgroundColor: '#FF0000',
        shadowColor: '#FF0000',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 16,
        paddingHorizontal: 16,
    },
    footerContent: {
        flexDirection: 'row',
        gap: 16,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    btnSecondary: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    btnSecondaryText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.accent,
    },
    btnPrimary: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.subtle,
    },
    btnPrimaryText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary, // Or White depending on contrast, Mockup has dark text
    },
    // Audio Recording Styles
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderRadius: 12,
        padding: SPACING.md,
        marginTop: SPACING.sm,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF0000',
        marginRight: SPACING.sm,
    },
    recordingText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#FF0000',
    },
    stopRecordingBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FF0000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface0,
        borderRadius: 12,
        padding: SPACING.md,
        marginTop: SPACING.sm,
        ...SHADOWS.subtle,
    },
    playBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    playBtnActive: {
        backgroundColor: COLORS.accent,
    },
    audioInfo: {
        flex: 1,
    },
    audioTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    audioDuration: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    audioDurationActive: {
        color: COLORS.accent,
        fontWeight: '600',
    },
    deleteAudioBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Planner tag (hiển thị kế hoạch liên kết sau khi chọn check-in)
    plannerTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.25)',
        alignSelf: 'flex-start',
    },
    plannerTagText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    // Sub-text dưới chip (tên kế hoạch)
    chipSubText: {
        fontSize: 10,
        color: COLORS.textTertiary,
        marginTop: 1,
    },
    // Badge "Đã hoàn thành" xanh lá
    completedBadge: {
        marginLeft: 8,
        backgroundColor: 'rgba(39, 174, 96, 0.12)',
        borderRadius: 99,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(39, 174, 96, 0.3)',
    },
    completedBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#27ae60',
    },
    emptyHint: {
        fontSize: 13,
        color: COLORS.textTertiary,
        fontStyle: 'italic',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
});

