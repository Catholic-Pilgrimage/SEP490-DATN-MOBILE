import React from "react";
import { StyleSheet, View } from "react-native";
import { MapPin, VietmapView } from "../../../../../components/map/VietmapView";

type Props = {
  pins: MapPin[];
  center: { latitude: number; longitude: number; zoom?: number };
  showUserLocation?: boolean;
  height?: number;
};

export default function PlanMap({
  pins,
  center,
  showUserLocation = false,
  height = 220,
}: Props) {
  return (
    <View style={[styles.container, { height }]}>
      <VietmapView
        initialRegion={center}
        pins={pins}
        scrollEnabled
        showInfoCards
        showUserLocation={showUserLocation}
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, overflow: "hidden" },
  map: { flex: 1 },
});
