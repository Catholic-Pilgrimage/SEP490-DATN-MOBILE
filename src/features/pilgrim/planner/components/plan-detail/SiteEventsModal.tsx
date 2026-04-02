import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../../../../constants/theme.constants";
import { SiteEvent } from "../../../../../types/pilgrim";

interface SiteEventsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  t: (key: string, options?: any) => string;
  styles: any;
  isLoading: boolean;
  events: SiteEvent[];
  onSelectEvent: (event: SiteEvent) => void;
}

export default function SiteEventsModal({
  visible,
  onClose,
  title,
  t,
  styles,
  isLoading,
  events,
  onSelectEvent,
}: SiteEventsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>{t("planner.close")}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.accent}
            style={{ marginTop: 40 }}
          />
        ) : events.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={48}
              color={COLORS.textSecondary}
            />
            <Text
              style={{
                color: COLORS.textSecondary,
                marginTop: 12,
                fontSize: 15,
                textAlign: "center",
              }}
            >
              Không có sự kiện sắp tới tại địa điểm này
            </Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(ev) => ev.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item: ev }) => {
              const dateStr = ev.start_date
                ? new Date(ev.start_date).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "";
              const endStr =
                ev.end_date && ev.end_date !== ev.start_date
                  ? ` – ${new Date(ev.end_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`
                  : "";
              const timeStr = ev.start_time ? ` lúc ${ev.start_time}` : "";

              return (
                <TouchableOpacity
                  style={[
                    styles.siteItem,
                    { alignItems: "flex-start", paddingVertical: 14 },
                  ]}
                  onPress={() => onSelectEvent(ev)}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: COLORS.accent,
                          borderRadius: 6,
                          padding: 6,
                        }}
                      >
                        <Ionicons
                          name="calendar"
                          size={16}
                          color={COLORS.textPrimary}
                        />
                      </View>
                      <Text
                        style={[styles.siteItemName, { flex: 1 }]}
                        numberOfLines={2}
                      >
                        {ev.name}
                      </Text>
                    </View>
                    <Text style={[styles.siteItemAddress, { marginLeft: 38 }]}>
                      📅 {dateStr}
                      {endStr}
                      {timeStr}
                    </Text>
                    {ev.location && (
                      <Text
                        style={[styles.siteItemAddress, { marginLeft: 38 }]}
                        numberOfLines={1}
                      >
                        📍 {ev.location}
                      </Text>
                    )}
                    {ev.description && (
                      <Text
                        style={[styles.siteItemAddress, { marginLeft: 38 }]}
                        numberOfLines={2}
                      >
                        {ev.description}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name="add-circle-outline"
                    size={24}
                    color={COLORS.accent}
                    style={{ marginTop: 2, alignSelf: "center" }}
                  />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}
