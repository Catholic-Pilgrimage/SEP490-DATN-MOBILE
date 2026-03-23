/**
 * Shared image compression for guide media upload / replace file flows.
 */
import * as ImageManipulator from "expo-image-manipulator";

const IMAGE_COMPRESSION = {
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 0.8,
} as const;

export async function compressGuideImage(
  uri: string,
): Promise<{ uri: string; width: number; height: number }> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width: IMAGE_COMPRESSION.maxWidth,
          height: IMAGE_COMPRESSION.maxHeight,
        },
      },
    ],
    {
      compress: IMAGE_COMPRESSION.quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return {
    uri: manipulated.uri,
    width: manipulated.width,
    height: manipulated.height,
  };
}
