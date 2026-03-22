/**
 * Grid preview for uploaded video files (non-YouTube).
 * RN Image cannot decode .mp4 URLs. We avoid expo-video-thumbnails (native-only, needs rebuild).
 * Intentional "video card": gradient + play. Duration still shown by MediaTypeIcon in MediaTab.
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ImageStyle, StyleProp, View } from "react-native";

type Props = {
  style: StyleProp<ImageStyle>;
};

export const LocalVideoThumbnail: React.FC<Props> = ({ style }) => {
  return (
    <LinearGradient
      colors={["#3a3a3a", "#1c1c1c"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        style,
        {
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        },
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
        }}
      >
        <Ionicons name="play" size={22} color="rgba(255,255,255,0.95)" />
      </View>
    </LinearGradient>
  );
};
