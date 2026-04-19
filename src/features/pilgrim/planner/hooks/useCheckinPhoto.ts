import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { useConfirm } from "../../../../hooks/useConfirm";

export type CheckinPhotoResult = {
  uri: string;
  width: number;
  height: number;
};

/**
 * Hook xử lý chụp/chọn ảnh check-in.
 * Backend yêu cầu ảnh bắt buộc khi check-in (multipart field: "photo").
 *
 * Sử dụng kết hợp với CheckinPhotoSheet (bottom sheet) thay vì Alert hệ thống.
 */
export const useCheckinPhoto = () => {
  const [picking, setPicking] = useState(false);
  const { confirm } = useConfirm();

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      await confirm({
        title: "Cần quyền truy cập Camera",
        message: "Để check-in, bạn cần cho phép ứng dụng sử dụng Camera.",
        confirmText: "OK",
        showCancel: false,
      });
      return false;
    }
    return true;
  }, [confirm]);

  const requestGalleryPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return true;
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      await confirm({
        title: "Cần quyền truy cập Thư viện ảnh",
        message: "Để check-in, bạn cần cho phép ứng dụng truy cập thư viện ảnh.",
        confirmText: "OK",
        showCancel: false,
      });
      return false;
    }
    return true;
  }, [confirm]);

  /** Mở Camera để chụp ảnh check-in */
  const takePhoto = useCallback(async (): Promise<CheckinPhotoResult | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    try {
      setPicking(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
        exif: false,
      });

      if (result.canceled || !result.assets?.length) return null;

      const asset = result.assets[0];
      return { uri: asset.uri, width: asset.width, height: asset.height };
    } catch {
      Toast.show({
        type: "error",
        text1: "Không thể mở Camera",
        text2: "Vui lòng thử lại hoặc chọn ảnh từ thư viện",
      });
      return null;
    } finally {
      setPicking(false);
    }
  }, [requestCameraPermission]);

  /** Mở thư viện ảnh để chọn ảnh check-in */
  const pickFromGallery = useCallback(async (): Promise<CheckinPhotoResult | null> => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return null;

    try {
      setPicking(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
        exif: false,
      });

      if (result.canceled || !result.assets?.length) return null;

      const asset = result.assets[0];
      return { uri: asset.uri, width: asset.width, height: asset.height };
    } catch {
      Toast.show({
        type: "error",
        text1: "Không thể mở Thư viện ảnh",
        text2: "Vui lòng thử lại hoặc chụp ảnh mới",
      });
      return null;
    } finally {
      setPicking(false);
    }
  }, [requestGalleryPermission]);

  return { picking, takePhoto, pickFromGallery };
};
