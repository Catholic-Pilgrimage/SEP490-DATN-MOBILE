import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { styles } from "./MonthCalendar.styles";

interface MonthCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  minDate?: Date;
}

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const generateCalendarDays = (year: number, month: number) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return days;
};

export const MonthCalendar = ({ selectedDate, onDateSelect, minDate }: MonthCalendarProps) => {
  const [calendarDate, setCalendarDate] = useState(() => {
    const selected = new Date(selectedDate);
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <View style={styles.calendarCard}>
      {/* Month Navigation */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={() => {
            const newDate = new Date(calendarDate);
            newDate.setMonth(newDate.getMonth() - 1);
            setCalendarDate(newDate);
          }}
          style={styles.calendarNavButton}
        >
          <Ionicons name="chevron-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.calendarMonthText}>
          {calendarDate.toLocaleDateString("vi-VN", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <TouchableOpacity
          onPress={() => {
            const newDate = new Date(calendarDate);
            newDate.setMonth(newDate.getMonth() + 1);
            setCalendarDate(newDate);
          }}
          style={styles.calendarNavButton}
        >
          <Ionicons name="chevron-forward" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.calendarDaysHeader}>
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <Text key={i} style={styles.calendarDayHeaderText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {generateCalendarDays(
          calendarDate.getFullYear(),
          calendarDate.getMonth(),
        ).map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.calendarDay} />;
          }

          const dateStr = `${calendarDate.getFullYear()}-${String(
            calendarDate.getMonth() + 1,
          ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isBeforeMin = minDate && new Date(dateStr) < minDate;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarDay,
                isSelected && styles.calendarDaySelected,
                isToday && !isSelected && styles.calendarDayToday,
                isBeforeMin && styles.calendarDayDisabled,
              ]}
              onPress={() => {
                if (!isBeforeMin) {
                  onDateSelect(dateStr);
                }
              }}
              disabled={isBeforeMin}
            >
              <Text
                style={[
                  styles.calendarDayText,
                  isSelected && styles.calendarDayTextSelected,
                  isToday && !isSelected && styles.calendarDayTextToday,
                  isBeforeMin && styles.calendarDayTextDisabled,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
