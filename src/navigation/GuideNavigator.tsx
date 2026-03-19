// Local Guide tab navigator - tabs for home, management, shifts, community, and profile.
import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
} from "../constants/guide.constants";
import { DashboardScreen } from "../features/guide/dashboard/screens";
import { ProfileScreen } from "../features/guide/profile/screens";
import { ShiftsScreen } from "../features/guide/shifts/screens/ShiftsScreen";
import { useNotifications } from "../hooks/useNotifications";
import { MySiteNavigator } from "./MySiteNavigator";
import {
  CommunityScreen,
  CreatePostScreen,
  PostDetailScreen,
} from "../features/pilgrim/community/screens";

export type GuideTabParamList = {
  Dashboard: undefined;
  MySite: undefined;
  Shifts: undefined;
  Community: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<GuideTabParamList>();
const CommunityStack = createNativeStackNavigator();

type IconName =
  | "home"
  | "assignment"
  | "calendar-today"
  | "people-outline"
  | "person-outline";

interface TabIconProps {
  name: IconName;
  focused: boolean;
  label: string;
  hasNotification?: boolean;
}

const GuideCommunityStackNavigator = () => (
  <CommunityStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: GUIDE_COLORS.background },
    }}
  >
    <CommunityStack.Screen
      name="GuideCommunityMain"
      component={CommunityScreen}
    />
    <CommunityStack.Screen name="CreatePost" component={CreatePostScreen} />
    <CommunityStack.Screen name="PostDetail" component={PostDetailScreen} />
  </CommunityStack.Navigator>
);

const TabIcon = ({ name, focused, label, hasNotification }: TabIconProps) => {
  return (
    <View style={styles.tabIconWrapper}>
      <View
        style={[styles.iconContainer, focused && styles.iconContainerFocused]}
      >
        <MaterialIcons
          name={
            focused
              ? name === "people-outline"
                ? "people"
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
  const { unreadCount } = useNotifications();

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
            <TabIcon
              name="home"
              focused={focused}
              label={t("navigation.home", { defaultValue: "Trang chủ" })}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MySite"
        component={MySiteNavigator}
        options={({ route }) => {
          const routeName =
            getFocusedRouteNameFromRoute(route) ?? "MySiteHome";
          const isHidden =
            routeName === "MediaDetail" || routeName === "MediaUpload";

          return {
            tabBarStyle: [
              styles.tabBar,
              {
                height: 70 + insets.bottom,
                paddingBottom: insets.bottom + 8,
                display: isHidden ? "none" : "flex",
              },
            ],
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name="assignment"
                focused={focused}
                label={t("navigation.manage", {
                  defaultValue: "Quản lý",
                })}
              />
            ),
          };
        }}
      />
      <Tab.Screen
        name="Shifts"
        component={ShiftsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="calendar-today"
              focused={focused}
              label={t("navigation.shifts", { defaultValue: "Lịch" })}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={GuideCommunityStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="people-outline"
              focused={focused}
              label={t("navigation.community", {
                defaultValue: "Cộng đồng",
              })}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="person-outline"
              focused={focused}
              label={t("navigation.profile", { defaultValue: "Cá nhân" })}
              hasNotification={unreadCount > 0}
            />
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
