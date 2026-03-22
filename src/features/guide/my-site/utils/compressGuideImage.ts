/**
 * Shared image compression for guide media upload / replace file flows.
 */
import * as ImageManipulator from "expo-image-manipulator";

const COMPRESSION_CONFIG = {
  image: { maxWidth: 2000, maxHeight: 2000, quality: 0.8 },
  panorama: { maxWidth: 4096, maxHeight: 2048, quality: 0.85 },
} as const;

export type CompressableGuideImageType = "image" | "panorama";

export async function compressGuideImage(
  uri: string,
  type: CompressableGuideImageType,
): Promise<{ uri: string; width: number; height: number }> {
  const config = COMPRESSION_CONFIG[type];

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width: config.maxWidth,
          height: config.maxHeight,
        },
      },
    ],
    {
      compress: config.quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return {
    uri: manipulated.uri,
    width: manipulated.width,
    height: manipulated.height,
  };
}
