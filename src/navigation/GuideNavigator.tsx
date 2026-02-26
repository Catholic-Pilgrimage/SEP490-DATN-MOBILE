// Local Guide tab navigator - 3 tabs: Home, My Site, Profile
import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS
} from "../constants/guide.constants";
import { DashboardScreen } from "../features/guide/dashboard/screens";
import { ProfileScreen } from "../features/guide/profile/screens";
import { ShiftsScreen } from "../features/guide/shifts/screens/ShiftsScreen";
import { MySiteNavigator } from "./MySiteNavigator";

export type GuideTabParamList = {
  Dashboard: undefined;
  MySite: undefined;
  Shifts: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<GuideTabParamList>();

type IconName =
  | "home"
  | "church"
  | "calendar-today"
  | "chat-bubble-outline"
  | "person-outline";

interface TabIconProps {
  name: IconName;
  focused: boolean;
  label: string;
  hasNotification?: boolean;
}

const TabIcon = ({ name, focused, label, hasNotification }: TabIconProps) => {
  return (
    <View style={styles.tabIconWrapper}>
      <View
        style={[styles.iconContainer, focused && styles.iconContainerFocused]}
      >
        <MaterialIcons
          name={
            focused
              ? name === "chat-bubble-outline"
                ? "chat-bubble"
                : name === "person-outline"
                  ? "person"
                  : name
              : name
          }
          size={26}
          color={focused ? GUIDE_COLORS.primary : GUIDE_COLORS.textMuted}
        />
        {hasNotification && <View style={styles.notificationDot} />}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
};

export const GuideNavigator = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom + 8,
          },
        ],
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} label={t("navigation.home", { defaultValue: "Trang chủ" })} />
          ),
        }}
      />
      <Tab.Screen
        name="MySite"
        component={MySiteNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="church" focused={focused} label={t("navigation.mySite", { defaultValue: "Site của tôi" })} />
          ),
        }}
      />
      <Tab.Screen
        name="Shifts"
        component={ShiftsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="calendar-today" focused={focused} label={t("navigation.shifts", { defaultValue: "Lịch" })} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person-outline" focused={focused} label={t("navigation.profile", { defaultValue: "Cá nhân" })} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: GUIDE_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.borderLight,
    paddingTop: 8,
    ...GUIDE_SHADOWS.lg,
  },
  tabIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
  },
  iconContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  iconContainerFocused: {
    // Glow effect for active tab
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: GUIDE_COLORS.textMuted,
    marginTop: 2,
  },
  tabLabelFocused: {
    color: GUIDE_COLORS.primary,
    fontWeight: "700",
  },
  notificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.error,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.surface,
  },
});

export default GuideNavigator;
