// Local Guide tab navigator
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_COLORS, GUIDE_SHADOWS } from '../constants/guide.constants';
import { DashboardScreen } from '../features/guide/dashboard/screens';
import { MySiteScreen } from '../features/guide/my-site/screens';
import { SupportScreen } from '../features/guide/support/screens';
import { ScheduleScreen } from '../features/guide/schedule/screens';

export type GuideTabParamList = {
  Dashboard: undefined;
  MySite: undefined;
  Support: undefined;
  Schedule: undefined;
};

const Tab = createBottomTabNavigator<GuideTabParamList>();

type IconName = 'dashboard' | 'church' | 'headset-mic' | 'calendar-today';

interface TabIconProps {
  name: IconName;
  focused: boolean;
}

const TabIcon = ({ name, focused }: TabIconProps) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <MaterialIcons
        name={name}
        size={24}
        color={focused ? GUIDE_COLORS.primary : GUIDE_COLORS.textMuted}
      />
    </View>
  );
};

export const GuideNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ],
        tabBarActiveTintColor: GUIDE_COLORS.primary,
        tabBarInactiveTintColor: GUIDE_COLORS.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Tổng quan',
          tabBarIcon: ({ focused }) => <TabIcon name="dashboard" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MySite"
        component={MySiteScreen}
        options={{
          tabBarLabel: 'Quản lý',
          tabBarIcon: ({ focused }) => <TabIcon name="church" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          tabBarLabel: 'Hỗ trợ',
          tabBarIcon: ({ focused }) => <TabIcon name="headset-mic" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          tabBarLabel: 'Ca trực',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar-today" focused={focused} />,
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
    ...GUIDE_SHADOWS.sm,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconContainer: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  iconContainerFocused: {
    backgroundColor: `${GUIDE_COLORS.primary}15`,
  },
});

export default GuideNavigator;