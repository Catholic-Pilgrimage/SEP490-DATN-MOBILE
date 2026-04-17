import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  MapPin,
  VietmapView,
  VietmapViewRef,
} from "../../../../components/map/VietmapView";
import { VIETMAP_CONFIG } from "../../../../config/map.config";
import { useAuth } from "../../../../contexts/AuthContext";
import { useConfirm } from "../../../../hooks/useConfirm";
import useI18n from "../../../../hooks/useI18n";
import { useClaimableSites, useVerification } from "../../../../hooks/useVerification";
import { ReactNativeFile } from "../../../../types/pilgrim/verification.types";
import {
  getFirstVerificationErrorI18nKey,
  resolveVerificationSiteTypeForApi,
  validateVerificationRequestForm,
} from "../../../../utils/validation";

type FormType = "new" | "transition";

const EMPTY_VERIFICATION_MAP_PINS: MapPin[] = [];

interface VietmapSearchItem {
  ref_id?: string;
  name?: string;
  address?: string;
  display?: string;
  lat?: number | string;
  lng?: number | string;
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const rankAddress = (value: string): number => {
  const hasNumber = /\d/.test(value);
  const hasSeparator = /[\/,\-]/.test(value);
  return (hasNumber ? 2000 : 0) + (hasSeparator ? 1000 : 0) + value.length;
};

const buildAddressFromReverseItem = (item: Record<string, unknown>): string => {
  const houseNo =
    normalizeText(item.housenumber) || normalizeText(item.house_number);
  const street =
    normalizeText(item.street) || normalizeText(item.street_name);
  const ward = normalizeText(item.ward);
  const district = normalizeText(item.district);
  const province = normalizeText(item.province) || normalizeText(item.city);

  const roadPart = [houseNo, street].filter(Boolean).join(" ").trim();
  const parts = [roadPart, ward, district, province].filter(Boolean);
  if (parts.length > 0) {
    return parts
      .filter((part, index, arr) => arr.indexOf(part) === index)
      .join(", ");
  }

  return (
    normalizeText(item.display) ||
    normalizeText(item.address) ||
    normalizeText(item.name)
  );
};

const VerificationRequestScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();
  const { t } = useI18n();
  const { confirm } = useConfirm();
  const {
    myRequest,
    isMyRequestLoading,
    refetchMyRequest,
    requestGuestVerification,
    isRequestingGuestVer,
    requestPilgrimVerification,
    isRequestingPilgrimVer,
    requestGuestTransition,
    isRequestingGuestTrans,
    requestPilgrimTransition,
    isRequestingPilgrimTrans,
  } = useVerification();

  const [formType, setFormType] = useState<FormType>("new");
  const [isEditing, setIsEditing] = useState(false);

  // Form inputs
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteProvince, setSiteProvince] = useState("");
  const [siteType, setSiteType] = useState("");
  const [siteTypeOther, setSiteTypeOther] = useState("");
  const [siteRegion, setSiteRegion] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [existingSiteId, setExistingSiteId] = useState("");
  const [selectedSiteName, setSelectedSiteName] = useState("");
  const [selectedSiteClaimType, setSelectedSiteClaimType] = useState<"transition" | "unassigned" | null>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [certificate, setCertificate] = useState<ReactNativeFile | null>(null);

  // Site selection Modal state
  const [isSiteModalVisible, setIsSiteModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [claimTypeFilter, setClaimTypeFilter] = useState<"all" | "transition" | "unassigned">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [allSites, setAllSites] = useState<any[]>([]);
  
  // Use claimable sites hook separately
  const {
    data: claimableSitesData,
    isLoading: isSitesLoading,
    refetch: refetchClaimableSites,
    isFetching,
  } = useClaimableSites({ 
    search: searchQuery,
    page: currentPage,
    limit: 20,
    ...(claimTypeFilter !== "all" && { claim_type: claimTypeFilter })
  });

  // Reset when filter or search changes
  useEffect(() => {
    console.log('Filter/search changed, resetting to page 1');
    setCurrentPage(1);
    setAllSites([]);
  }, [claimTypeFilter, searchQuery]);

  // Refetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!isGuest) {
        refetchMyRequest();
      }
    }, [isGuest, refetchMyRequest])
  );

  // Accumulate sites when data changes
  useEffect(() => {
    console.log('Data effect triggered:', {
      hasData: !!claimableSitesData?.data,
      dataLength: claimableSitesData?.data?.length,
      currentPage,
      allSitesLength: allSites.length,
      pagination: claimableSitesData?.pagination
    });
    
    if (claimableSitesData?.data) {
      if (currentPage === 1) {
        // For page 1, replace all sites
        console.log('Setting allSites to page 1 data:', claimableSitesData.data.length);
        setAllSites(claimableSitesData.data);
      } else {
        // For subsequent pages, append to existing sites
        console.log('Appending page', currentPage, 'data:', claimableSitesData.data.length);
        setAllSites(prev => [...prev, ...claimableSitesData.data]);
      }
    }
  }, [claimableSitesData?.data, currentPage]);

  const handleLoadMore = () => {
    if (
      !isFetching && 
      claimableSitesData?.pagination && 
      currentPage < claimableSitesData.pagination.totalPages
    ) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Dropdown state — memoized so option arrays are stable across keystrokes
  const SITE_TYPE_OPTIONS: { label: string; value: string }[] = useMemo(
    () => [
      { label: t("verification.siteTypes.church"), value: "church" },
      { label: t("verification.siteTypes.shrine"), value: "shrine" },
      { label: t("verification.siteTypes.monastery"), value: "monastery" },
      { label: t("verification.siteTypes.center"), value: "center" },
      { label: t("verification.siteTypes.other"), value: "other" },
    ],
    [t],
  );
  const SITE_REGION_OPTIONS: { label: string; value: string }[] = useMemo(
    () => [
      { label: t("verification.regions.north"), value: "Bac" },
      { label: t("verification.regions.central"), value: "Trung" },
      { label: t("verification.regions.south"), value: "Nam" },
    ],
    [t],
  );

  const [isAddressMapVisible, setIsAddressMapVisible] = useState(false);
  const addressMapRef = useRef<VietmapViewRef>(null);
  const mapSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [addressPickCoords, setAddressPickCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pendingMapAddress, setPendingMapAddress] = useState<string | null>(
    null,
  );
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [addressMapSearchText, setAddressMapSearchText] = useState("");
  const [addressMapSearchResults, setAddressMapSearchResults] = useState<
    VietmapSearchItem[]
  >([]);
  const [isAddressMapSearching, setIsAddressMapSearching] = useState(false);

  const reverseGeocodeDetailedAddress = useCallback(
    async (coords: { latitude: number; longitude: number }) => {
      const fallback = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
      try {
        const url = `${VIETMAP_CONFIG.REVERSE_GEOCODING_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&lat=${coords.latitude}&lng=${coords.longitude}&display_type=1`;
        const res = await fetch(url);
        const data = await res.json();

        const candidates: Record<string, unknown>[] = Array.isArray(data)
          ? data.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          : Array.isArray(data?.value)
            ? data.value.filter(
                (x: unknown): x is Record<string, unknown> =>
                  !!x && typeof x === "object",
              )
            : [];

        const best = candidates
          .map(buildAddressFromReverseItem)
          .filter(Boolean)
          .sort((a, b) => rankAddress(b) - rankAddress(a))[0];

        return best || fallback;
      } catch {
        return fallback;
      }
    },
    [],
  );

  const addressSelectionPins = useMemo<MapPin[]>(() => {
    if (!addressPickCoords) return EMPTY_VERIFICATION_MAP_PINS;
    return [
      {
        id: "verification-address-pick",
        latitude: addressPickCoords.latitude,
        longitude: addressPickCoords.longitude,
        title: t("verification.addressMap.pickedPoint"),
        subtitle: pendingMapAddress ?? undefined,
        icon: "📍",
        color: "#D4AF37",
        markerType: "pick",
      },
    ];
  }, [addressPickCoords, pendingMapAddress, t]);

  const handleAddressMapPress = useCallback(
    async (e: { latitude: number; longitude: number }) => {
      setAddressPickCoords({
        latitude: e.latitude,
        longitude: e.longitude,
      });
      setIsReverseGeocoding(true);
      try {
        const addr = await reverseGeocodeDetailedAddress({
          latitude: e.latitude,
          longitude: e.longitude,
        });
        setPendingMapAddress(addr);
        setAddressMapSearchText(addr);
      } catch {
        setPendingMapAddress(
          `${e.latitude.toFixed(5)}, ${e.longitude.toFixed(5)}`,
        );
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [reverseGeocodeDetailedAddress],
  );

  const resolveSearchCoordinates = useCallback(async (item: VietmapSearchItem) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }

    if (!item.ref_id) return null;
    try {
      const detailUrl = `${VIETMAP_CONFIG.PLACE_DETAIL_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&refid=${item.ref_id}`;
      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();
      const detailLat = Number(detailData?.lat);
      const detailLng = Number(detailData?.lng);
      if (Number.isFinite(detailLat) && Number.isFinite(detailLng)) {
        return { latitude: detailLat, longitude: detailLng };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const runAddressMapSearch = useCallback(async (query: string) => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setAddressMapSearchResults([]);
      setIsAddressMapSearching(false);
      return;
    }
    try {
      setIsAddressMapSearching(true);
      const url = `${VIETMAP_CONFIG.SEARCH_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&text=${encodeURIComponent(keyword)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAddressMapSearchResults(data.slice(0, 6));
      } else {
        setAddressMapSearchResults([]);
      }
    } catch {
      setAddressMapSearchResults([]);
    } finally {
      setIsAddressMapSearching(false);
    }
  }, []);

  const handleAddressMapSearchChange = useCallback(
    (value: string) => {
      setAddressMapSearchText(value);
      if (mapSearchDebounceRef.current) {
        clearTimeout(mapSearchDebounceRef.current);
      }
      if (value.trim().length < 2) {
        setAddressMapSearchResults([]);
        setIsAddressMapSearching(false);
        return;
      }
      mapSearchDebounceRef.current = setTimeout(() => {
        void runAddressMapSearch(value);
      }, 350);
    },
    [runAddressMapSearch],
  );

  const handleAddressMapSearchResultPress = useCallback(
    async (item: VietmapSearchItem) => {
      const coords = await resolveSearchCoordinates(item);
      if (!coords) return;
      const label = item.name || item.display || item.address || "";
      setAddressMapSearchResults([]);
      setAddressPickCoords(coords);
      setIsReverseGeocoding(true);
      const reverseAddr = await reverseGeocodeDetailedAddress(coords);
      const bestAddr =
        rankAddress(reverseAddr) >= rankAddress(label) ? reverseAddr : label;
      setPendingMapAddress(bestAddr);
      setAddressMapSearchText(bestAddr);
      setIsReverseGeocoding(false);
      addressMapRef.current?.flyTo(coords.latitude, coords.longitude, 16);
    },
    [resolveSearchCoordinates, reverseGeocodeDetailedAddress],
  );

  useEffect(() => {
    return () => {
      if (mapSearchDebounceRef.current) {
        clearTimeout(mapSearchDebounceRef.current);
      }
    };
  }, []);
  const [isTypeDropdownVisible, setIsTypeDropdownVisible] = useState(false);
  const [isRegionDropdownVisible, setIsRegionDropdownVisible] = useState(false);

  // Handle site search
  const [isMediaPickerVisible, setMediaPickerVisible] = useState(false);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleMediaPicked = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled) {
      setCertificate({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName || "certificate.jpg",
        type: result.assets[0].mimeType || "image/jpeg",
      });
    }
  };

  const handleDocumentPicked = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/*",
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCertificate({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
        });
      }
    } catch {
      await confirm({
        title: t("verification.errors.title"),
        message: t("verification.errors.cannotPickDocument"),
        confirmText: "OK",
        showCancel: false,
      });
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        await confirm({
          title: t("verification.errors.permissionDenied"),
          message: t("verification.errors.libraryPermission"),
          confirmText: "OK",
          showCancel: false,
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        setCertificate({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || "certificate.jpg",
          type: result.assets[0].mimeType || "image/jpeg",
        });
      }
    } catch {
      await confirm({
        title: t("verification.errors.title"),
        message: t("verification.errors.cannotPickImage"),
        confirmText: "OK",
        showCancel: false,
      });
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        await confirm({
          title: t("verification.errors.permissionDenied"),
          message: t("verification.errors.cameraPermission"),
          confirmText: "OK",
          showCancel: false,
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        setCertificate({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || "certificate.jpg",
          type: result.assets[0].mimeType || "image/jpeg",
        });
      }
    } catch {
      await confirm({
        title: t("verification.errors.title"),
        message: t("verification.errors.cannotOpenCamera"),
        confirmText: "OK",
        showCancel: false,
      });
    }
  };

  const validateForm = async () => {
    const errors = validateVerificationRequestForm({
      formType,
      isGuest,
      applicantName,
      applicantEmail,
      applicantPhone,
      siteName,
      siteProvince,
      siteAddress,
      siteType,
      siteTypeOther,
      siteRegion,
      existingSiteId,
      transitionReason,
      introduction,
      selectedSiteClaimType,
    });
    const firstKey = getFirstVerificationErrorI18nKey(errors);
    if (firstKey) {
      await confirm({
        title: t("verification.errors.title"),
        message: t(firstKey),
        confirmText: "OK",
        showCancel: false,
      });
      return false;
    }
    
    // Check certificate is required
    if (!certificate) {
      await confirm({
        title: t("verification.errors.title"),
        message: t("verification.errors.certificateRequired"),
        confirmText: "OK",
        showCancel: false,
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      if (formType === "new") {
        if (isGuest) {
          await requestGuestVerification({
            applicant_email: applicantEmail,
            applicant_name: applicantName,
            applicant_phone: applicantPhone,
            site_name: siteName,
            site_address: siteAddress,
            site_province: siteProvince,
            site_type: resolveVerificationSiteTypeForApi(
              siteType,
              siteTypeOther,
            ),
            site_region: siteRegion,
            introduction,
            certificate: certificate || undefined,
          });
        } else {
          await requestPilgrimVerification({
            site_name: siteName,
            site_address: siteAddress,
            site_province: siteProvince,
            site_type: resolveVerificationSiteTypeForApi(
              siteType,
              siteTypeOther,
            ),
            site_region: siteRegion,
            introduction,
            certificate: certificate || undefined,
          });
        }
      } else {
        // Transition form
        if (isGuest) {
          await requestGuestTransition({
            applicant_email: applicantEmail,
            applicant_name: applicantName,
            applicant_phone: applicantPhone,
            existing_site_id: existingSiteId,
            transition_reason: transitionReason, // Will be validated by backend
            introduction,
            certificate: certificate || undefined,
          });
        } else {
          await requestPilgrimTransition({
            existing_site_id: existingSiteId,
            transition_reason: transitionReason, // Will be validated by backend
            introduction,
            certificate: certificate || undefined,
          });
        }
      }
      setIsEditing(false); // Go back to view if successful
      navigation.goBack();
    } catch (error) {
      // Error is handled in useVerification mutations
    }
  };

  const isSubmitting =
    isRequestingGuestVer ||
    isRequestingPilgrimVer ||
    isRequestingGuestTrans ||
    isRequestingPilgrimTrans;

  const renderInput = (
    label: string,
    value: string,
    setValue: (t: string) => void,
    placeholder: string,
    required = false,
    keyboardType: any = "default",
    multiline = false,
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={{ color: "#DC4C4C" }}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#A0ABC0"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );

  const renderDropdown = (
    label: string,
    value: string,
    setValue: (t: string) => void,
    options: { label: string; value: string }[],
    isVisible: boolean,
    setVisible: (v: boolean) => void,
    placeholder: string,
    required = false,
    onSelect?: (selectedValue: string) => void,
  ) => {
    const selectedLabel = options.find((o) => o.value === value)?.label;
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {label} {required && <Text style={{ color: "#DC4C4C" }}>*</Text>}
        </Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setVisible(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.pickerButtonText, !value && { color: "#A0ABC0" }]}
          >
            {selectedLabel || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#A0ABC0" />
        </TouchableOpacity>
        <Modal
          visible={isVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setVisible(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          >
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownTitle}>{label}</Text>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    value === option.value && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setValue(option.value);
                    onSelect?.(option.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === option.value && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Ionicons name="checkmark" size={18} color="#D4AF37" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const renderFormContent = () => (
    <View style={styles.formContainer}>
      {/* Tabs for Form Type */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, formType === "new" && styles.activeTab]}
          onPress={() => setFormType("new")}
        >
          <Text
            style={[styles.tabText, formType === "new" && styles.activeTabText]}
          >
            {t("verification.tabNew")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, formType === "transition" && styles.activeTab]}
          onPress={() => setFormType("transition")}
        >
          <Text
            style={[
              styles.tabText,
              formType === "transition" && styles.activeTabText,
            ]}
          >
            {t("verification.tabTransition")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Applicant Information for Guests */}
      {isGuest && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {t("verification.sectionApplicant")}
          </Text>
          {renderInput(
            t("verification.fields.fullName"),
            applicantName,
            setApplicantName,
            t("verification.fields.fullNamePlaceholder"),
            true,
          )}
          {renderInput(
            t("verification.fields.email"),
            applicantEmail,
            setApplicantEmail,
            t("verification.fields.emailPlaceholder"),
            true,
            "email-address",
          )}
          {renderInput(
            t("verification.fields.phone"),
            applicantPhone,
            setApplicantPhone,
            t("verification.fields.phonePlaceholder"),
            false,
            "phone-pad",
          )}
        </View>
      )}

      {/* Form Fields Based on Type */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          {formType === "new"
            ? t("verification.sectionNewSite")
            : t("verification.sectionTransition")}
        </Text>

        {formType === "new" ? (
          <>
            {renderInput(
              t("verification.fields.siteName"),
              siteName,
              setSiteName,
              t("verification.fields.siteNamePlaceholder"),
              true,
            )}
            {renderInput(
              t("verification.fields.province"),
              siteProvince,
              setSiteProvince,
              t("verification.fields.provincePlaceholder"),
              true,
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("verification.fields.address")}{" "}
                <Text style={{ color: "#DC4C4C" }}>*</Text>
              </Text>
              <View style={styles.addressRow}>
                <TextInput
                  style={[styles.input, styles.addressInput]}
                  value={siteAddress}
                  onChangeText={setSiteAddress}
                  placeholder={t("verification.fields.addressPlaceholder")}
                  placeholderTextColor="#A0ABC0"
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={styles.mapPickButton}
                  onPress={() => {
                    setPendingMapAddress(null);
                    setAddressPickCoords(null);
                    setIsAddressMapVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("verification.addressMap.pickOnMap")}
                >
                  <Ionicons name="map-outline" size={22} color="#2E5F8A" />
                </TouchableOpacity>
              </View>
            </View>
            {renderDropdown(
              t("verification.fields.siteType"),
              siteType,
              setSiteType,
              SITE_TYPE_OPTIONS,
              isTypeDropdownVisible,
              setIsTypeDropdownVisible,
              t("verification.fields.siteTypePlaceholder"),
              true,
              (v) => {
                if (v !== "other") setSiteTypeOther("");
              },
            )}
            {siteType === "other" &&
              renderInput(
                t("verification.fields.siteTypeOther"),
                siteTypeOther,
                setSiteTypeOther,
                t("verification.fields.siteTypeOtherPlaceholder"),
                true,
              )}
            {renderDropdown(
              t("verification.fields.region"),
              siteRegion,
              setSiteRegion,
              SITE_REGION_OPTIONS,
              isRegionDropdownVisible,
              setIsRegionDropdownVisible,
              t("verification.fields.regionPlaceholder"),
              true,
            )}
          </>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("verification.fields.selectSite")}{" "}
                <Text style={{ color: "#DC4C4C" }}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setIsSiteModalVisible(true)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedSiteName && { color: "#A0ABC0" },
                  ]}
                >
                  {selectedSiteName ||
                    t("verification.fields.selectSitePlaceholder")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6C8CA3" />
              </TouchableOpacity>
            </View>
            {/* Only show transition reason field for transition type */}
            {selectedSiteClaimType === "transition" && renderInput(
              t("verification.fields.transitionReason"),
              transitionReason,
              setTransitionReason,
              t("verification.fields.transitionReasonPlaceholder"),
              true, // Required for transition type
              "default",
              true,
            )}
          </>
        )}
      </View>

      {/* Extra Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          {t("verification.sectionExtra")}
        </Text>
        {renderInput(
          t("verification.fields.introduction"),
          introduction,
          setIntroduction,
          t("verification.fields.introductionPlaceholder"),
          false,
          "default",
          true,
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t("verification.fields.certificate")}{" "}
            <Text style={{ color: "#DC4C4C" }}>*</Text>
          </Text>
          {certificate ? (
            <View style={styles.certPreviewContainer}>
              {certificate.type?.startsWith("image") ? (
                <Image
                  source={{ uri: certificate.uri }}
                  style={styles.certPreviewImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.certPreviewDocIcon}>
                  <Ionicons name="document-outline" size={40} color="#D4AF37" />
                </View>
              )}
              <View style={styles.certPreviewInfo}>
                <Text style={styles.certPreviewName} numberOfLines={2}>
                  {certificate.name}
                </Text>
                <TouchableOpacity 
                  onPress={() => setCertificate(null)}
                  style={styles.certRemoveBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC4C4C" />
                  <Text style={styles.certRemoveText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.certPickerRow}>
              <TouchableOpacity
                style={styles.certPickerBtn}
                onPress={takePhoto}
              >
                <Ionicons name="camera-outline" size={22} color="#D4AF37" />
                <Text style={styles.certPickerBtnText}>
                  {t("verification.cert.takePhoto")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.certPickerBtn}
                onPress={pickImageFromLibrary}
              >
                <Ionicons name="image-outline" size={22} color="#D4AF37" />
                <Text style={styles.certPickerBtnText}>
                  {t("verification.cert.library")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.certPickerBtn}
                onPress={handleDocumentPicked}
              >
                <Ionicons name="document-outline" size={22} color="#D4AF37" />
                <Text style={styles.certPickerBtnText}>
                  {t("verification.cert.document")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setIsEditing(false)}
        >
          <Text style={styles.cancelBtnText}>
            {t("verification.actions.cancel")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {t("verification.actions.submit")}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={isAddressMapVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          setIsAddressMapVisible(false);
          setAddressPickCoords(null);
          setPendingMapAddress(null);
          setAddressMapSearchText("");
          setAddressMapSearchResults([]);
        }}
      >
        <SafeAreaView style={styles.addressMapModal} edges={["top", "bottom"]}>
          <View style={styles.addressMapHeader}>
            <TouchableOpacity
              onPress={() => {
                setIsAddressMapVisible(false);
                setAddressPickCoords(null);
                setPendingMapAddress(null);
                setAddressMapSearchText("");
                setAddressMapSearchResults([]);
              }}
              style={styles.addressMapClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={26} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.addressMapTitle}>
              {t("verification.addressMap.title")}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.addressMapHint}>
            {t("verification.addressMap.hint")}
          </Text>
          <View style={styles.addressMapSearchWrap}>
            <View style={styles.addressMapSearchBar}>
              <Ionicons name="search" size={18} color="#6C8CA3" />
              <TextInput
                style={styles.addressMapSearchInput}
                value={addressMapSearchText}
                onChangeText={handleAddressMapSearchChange}
                placeholder={t("verification.fields.addressPlaceholder")}
                placeholderTextColor="#98A8B8"
                returnKeyType="search"
              />
              {isAddressMapSearching ? (
                <ActivityIndicator size="small" color="#D4AF37" />
              ) : addressMapSearchText.length > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    setAddressMapSearchText("");
                    setAddressMapSearchResults([]);
                  }}
                >
                  <Ionicons name="close" size={18} color="#6C8CA3" />
                </TouchableOpacity>
              ) : null}
            </View>
            {addressMapSearchResults.length > 0 && (
              <View style={styles.addressMapSearchResultList}>
                {addressMapSearchResults.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.ref_id || item.name || "r"}-${idx}`}
                    style={styles.addressMapSearchResultItem}
                    onPress={() => {
                      void handleAddressMapSearchResultPress(item);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="location-outline" size={16} color="#D4AF37" />
                    <View style={styles.addressMapSearchResultTextWrap}>
                      <Text style={styles.addressMapSearchResultTitle} numberOfLines={1}>
                        {item.name || item.display || item.address || "Địa điểm"}
                      </Text>
                      {!!item.address && (
                        <Text
                          style={styles.addressMapSearchResultSubtitle}
                          numberOfLines={1}
                        >
                          {item.address}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={styles.addressMapContainer}>
            <VietmapView
              ref={addressMapRef}
              style={StyleSheet.absoluteFill}
              pins={addressSelectionPins}
              showUserLocation
              showInfoCards={false}
              tapRelocatesPin
              onMapPress={handleAddressMapPress}
            />
            {isReverseGeocoding && (
              <View style={styles.addressMapLoading}>
                <ActivityIndicator size="small" color="#D4AF37" />
              </View>
            )}
          </View>
          {pendingMapAddress ? (
            <View style={styles.addressMapFooter}>
              <Text style={styles.addressMapPreview} numberOfLines={4}>
                {pendingMapAddress}
              </Text>
              <TouchableOpacity
                style={styles.addressMapApplyBtn}
                onPress={() => {
                  setSiteAddress(pendingMapAddress);
                  setIsAddressMapVisible(false);
                  setPendingMapAddress(null);
                  setAddressPickCoords(null);
                }}
              >
                <Text style={styles.addressMapApplyText}>
                  {t("verification.addressMap.apply")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Site Selection Modal */}
      <Modal
        visible={isSiteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSiteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("verification.modal.title")}
              </Text>
              <TouchableOpacity
                onPress={() => setIsSiteModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#D4AF37"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder={t("verification.modal.searchPlaceholder")}
                placeholderTextColor="#A0ABC0"
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>

            {/* Filter chips */}
            <View style={styles.filterChipsContainer}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  claimTypeFilter === "all" && styles.filterChipActive,
                ]}
                onPress={() => setClaimTypeFilter("all")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    claimTypeFilter === "all" && styles.filterChipTextActive,
                  ]}
                >
                  {t("verification.filter.all")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  claimTypeFilter === "unassigned" && styles.filterChipActive,
                ]}
                onPress={() => setClaimTypeFilter("unassigned")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    claimTypeFilter === "unassigned" && styles.filterChipTextActive,
                  ]}
                >
                  {t("verification.claimType.unassigned")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  claimTypeFilter === "transition" && styles.filterChipActive,
                ]}
                onPress={() => setClaimTypeFilter("transition")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    claimTypeFilter === "transition" && styles.filterChipTextActive,
                  ]}
                >
                  {t("verification.claimType.transition")}
                </Text>
              </TouchableOpacity>
            </View>

            {(isSitesLoading || isFetching) && currentPage === 1 ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#D4AF37" />
              </View>
            ) : (
              <FlatList
                data={allSites}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.siteItem}
                    onPress={() => {
                      setExistingSiteId(item.id);
                      setSelectedSiteName(item.name);
                      setSelectedSiteClaimType(item.claim_type);
                      setIsSiteModalVisible(false);
                    }}
                  >
                    <View style={styles.siteItemContent}>
                      {item.cover_image && (
                        <Image
                          source={{ uri: item.cover_image }}
                          style={styles.siteItemImage}
                          resizeMode="cover"
                        />
                      )}
                      <View style={styles.siteItemInfo}>
                        <View style={styles.siteItemHeader}>
                          <Text style={styles.siteItemName} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <View
                            style={[
                              styles.claimTypeBadge,
                              item.claim_type === "unassigned"
                                ? styles.claimTypeBadgeUnassigned
                                : styles.claimTypeBadgeTransition,
                            ]}
                          >
                            <Text
                              style={[
                                styles.claimTypeBadgeText,
                                item.claim_type === "unassigned"
                                  ? styles.claimTypeBadgeTextUnassigned
                                  : styles.claimTypeBadgeTextTransition,
                              ]}
                            >
                              {item.claim_type === "unassigned"
                                ? t("verification.claimType.unassigned")
                                : t("verification.claimType.transition")}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.siteItemAddress} numberOfLines={2}>
                          {item.address}
                        </Text>
                        {item.current_manager && (
                          <Text style={styles.siteItemManager} numberOfLines={1}>
                            {t("verification.currentManager")}: {item.current_manager.full_name}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {t("verification.modal.empty")}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  isFetching && currentPage > 1 ? (
                    <View style={styles.loadMoreContainer}>
                      <ActivityIndicator size="small" color="#D4AF37" />
                      <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
                    </View>
                  ) : null
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );

  return (
    <ImageBackground
      source={require("../../../../../assets/images/verification-bg.png")}
      style={styles.container}
      resizeMode="cover"
      fadeDuration={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("verification.headerTitle")}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {myRequest && !isEditing ? (
            <View style={styles.card}>
              <Ionicons
                name={
                  myRequest.status.toLowerCase() === "approved"
                    ? "checkmark-circle"
                    : myRequest.status.toLowerCase() === "rejected"
                      ? "close-circle"
                      : "briefcase"
                }
                size={48}
                color={
                  myRequest.status.toLowerCase() === "approved"
                    ? "#1E8E3E"
                    : myRequest.status.toLowerCase() === "rejected"
                      ? "#D93025"
                      : "#D4AF37"
                }
                style={styles.icon}
              />
              <Text style={styles.title}>
                {myRequest.status.toLowerCase() === "approved"
                  ? t("verification.status.approved.title")
                  : myRequest.status.toLowerCase() === "rejected"
                    ? t("verification.status.rejected.title")
                    : t("verification.status.pending.title")}
              </Text>
              <Text style={styles.description}>
                {myRequest.status.toLowerCase() === "approved"
                  ? t("verification.status.approved.description")
                  : myRequest.status.toLowerCase() === "rejected"
                    ? t("verification.status.rejected.description")
                    : t("verification.status.pending.description")}
              </Text>

              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t("verification.details.requestCode")}
                  </Text>
                  <Text style={styles.detailValue}>{myRequest.code}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t("verification.details.requestStatus")}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          myRequest.status.toLowerCase() === "approved"
                            ? "#E6F4EA"
                            : myRequest.status.toLowerCase() === "rejected"
                              ? "#FDECEA"
                              : "#FFF4E5",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            myRequest.status.toLowerCase() === "approved"
                              ? "#1E8E3E"
                              : myRequest.status.toLowerCase() === "rejected"
                                ? "#D93025"
                                : "#E37400",
                        },
                      ]}
                    >
                      {myRequest.status.toLowerCase() === "approved"
                        ? t("verification.statusValues.approved")
                        : myRequest.status.toLowerCase() === "rejected"
                          ? t("verification.statusValues.rejected")
                          : t("verification.statusValues.pending")}
                    </Text>
                  </View>
                </View>
                {myRequest.site_name && (
                  <View style={styles.siteDetailSection}>
                    <Text style={styles.detailLabel}>
                      {t("verification.details.registeredSite")}
                    </Text>
                    <View style={styles.siteDetailContent}>
                      {myRequest.site_cover_image ? (
                        <Image
                          source={{ uri: myRequest.site_cover_image }}
                          style={styles.siteDetailImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.siteDetailImage, styles.siteDetailImagePlaceholder]}>
                          <Ionicons name="image-outline" size={24} color="#A0ABC0" />
                        </View>
                      )}
                      <Text style={styles.siteDetailName}>
                        {myRequest.site_name}
                      </Text>
                    </View>
                  </View>
                )}
                {myRequest.rejection_reason && (
                  <View
                    style={[
                      styles.detailRow,
                      { flexDirection: "column", alignItems: "flex-start" },
                    ]}
                  >
                    <Text style={styles.detailLabel}>
                      {t("verification.details.rejectionReason")}
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: "#D93025", marginTop: 4 },
                      ]}
                    >
                      {myRequest.rejection_reason}
                    </Text>
                  </View>
                )}
              </View>

              {myRequest.status.toLowerCase() === "rejected" && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.primaryButtonText}>
                    {t("verification.actions.newRequest")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : isEditing || !myRequest ? (
            renderFormContent()
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  loadingText: {
    marginTop: 12,
    color: "#6C8CA3",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6C8CA3",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  detailsContainer: {
    width: "100%",
    backgroundColor: "rgba(253, 248, 240, 0.8)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244, 228, 186, 0.6)",
    marginBottom: 24,
    gap: 12, // React Native >= 0.71 supports gap
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  siteDetailSection: {
    gap: 8,
  },
  siteDetailContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    padding: 10,
    borderRadius: 8,
  },
  siteDetailImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E5E0D8",
  },
  siteDetailImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  siteDetailName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    lineHeight: 20,
  },
  detailLabel: {
    color: "#6C8CA3",
    fontWeight: "500",
    fontSize: 14,
  },
  detailValue: {
    color: "#1A1A1A",
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  primaryButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Form Styles
  formContainer: {
    width: "100%",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(253, 248, 240, 0.85)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontWeight: "600",
    color: "#6C8CA3",
  },
  activeTabText: {
    color: "#D4AF37",
    fontWeight: "bold",
  },
  sectionCard: {
    backgroundColor: "rgba(253, 248, 240, 0.92)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#B8860B",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255, 251, 240, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  addressInput: {
    flex: 1,
    minHeight: 88,
    paddingTop: 12,
  },
  mapPickButton: {
    width: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(46, 95, 138, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  addressMapModal: {
    flex: 1,
    backgroundColor: "#F8F6F0",
  },
  addressMapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addressMapClose: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  addressMapTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1A1A1A",
    flex: 1,
    textAlign: "center",
  },
  addressMapHint: {
    fontSize: 13,
    color: "#6C8CA3",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  addressMapSearchWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  addressMapSearchBar: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(46, 95, 138, 0.25)",
    backgroundColor: "rgba(255,255,255,0.96)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  addressMapSearchInput: {
    flex: 1,
    color: "#1A1A1A",
    fontSize: 15,
    paddingVertical: 0,
  },
  addressMapSearchResultList: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(46, 95, 138, 0.18)",
    overflow: "hidden",
    maxHeight: 220,
  },
  addressMapSearchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46, 95, 138, 0.08)",
  },
  addressMapSearchResultTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  addressMapSearchResultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  addressMapSearchResultSubtitle: {
    marginTop: 1,
    fontSize: 12,
    color: "#6C8CA3",
  },
  addressMapContainer: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E0D8",
  },
  addressMapLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  addressMapFooter: {
    padding: 16,
    backgroundColor: "rgba(253, 248, 240, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "rgba(212, 175, 55, 0.3)",
  },
  addressMapPreview: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 12,
  },
  addressMapApplyBtn: {
    backgroundColor: "#D4AF37",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  addressMapApplyText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  imagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FDF8F0",
  },
  imagePickerText: {
    marginLeft: 10,
    color: "#D4AF37",
    flex: 1,
  },
  removeCertBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  removeCertText: {
    color: "#DC4C4C",
    fontSize: 13,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#EAE6DF",
  },
  cancelBtnText: {
    color: "#6C8CA3",
    fontWeight: "bold",
    fontSize: 16,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#D4AF37",
  },
  submitBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 251, 240, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerButtonText: {
    fontSize: 15,
    color: "#1A1A1A",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 22, 18, 0.52)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "rgba(253, 248, 240, 0.98)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
    borderBottomWidth: 0,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.22)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 251, 240, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
  },
  filterChipsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  filterChipActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B7355",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  loadMoreText: {
    fontSize: 13,
    color: "#6C8CA3",
  },
  siteItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.18)",
  },
  siteItemContent: {
    flexDirection: "row",
    gap: 12,
  },
  siteItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#E5E0D8",
  },
  siteItemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  siteItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },
  siteItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
    lineHeight: 20,
  },
  claimTypeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  claimTypeBadgeUnassigned: {
    backgroundColor: "#E6F4EA",
  },
  claimTypeBadgeTransition: {
    backgroundColor: "#FFF4E5",
  },
  claimTypeBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  claimTypeBadgeTextUnassigned: {
    color: "#1E8E3E",
  },
  claimTypeBadgeTextTransition: {
    color: "#E37400",
  },
  siteItemAddress: {
    fontSize: 13,
    color: "#6C8CA3",
    marginBottom: 4,
    lineHeight: 18,
  },
  siteItemManager: {
    fontSize: 12,
    color: "#8B7355",
    fontStyle: "italic",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#6C8CA3",
    fontSize: 15,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdownContainer: {
    backgroundColor: "#FDF8F0",
    borderRadius: 16,
    width: "100%",
    paddingVertical: 8,
    elevation: 8,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.2)",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.12)",
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(212, 175, 55, 0.1)",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#3D3D3D",
  },
  dropdownItemTextSelected: {
    color: "#D4AF37",
    fontWeight: "600",
  },
  certPickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  certPickerBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#FFFBF0",
  },
  certPickerBtnText: {
    fontSize: 13,
    color: "#D4AF37",
    fontWeight: "600",
    textAlign: "center",
  },
  certPreviewContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderRadius: 12,
    backgroundColor: "#FFFBF0",
    alignItems: "center",
  },
  certPreviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#E5E0D8",
  },
  certPreviewDocIcon: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#FDF8F0",
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  certPreviewInfo: {
    flex: 1,
    gap: 8,
  },
  certPreviewName: {
    fontSize: 14,
    color: "#3D3D3D",
    fontWeight: "500",
  },
  certRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  certRemoveText: {
    color: "#DC4C4C",
    fontSize: 13,
    fontWeight: "500",
  },
  certPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderRadius: 12,
    backgroundColor: "#FFFBF0",
  },
});

export default VerificationRequestScreen;
