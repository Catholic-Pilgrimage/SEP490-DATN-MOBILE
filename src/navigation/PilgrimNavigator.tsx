import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY } from '../constants/theme.constants';
import { CommunityScreen, CreatePostScreen,PostDetailScreen } from '../features/pilgrim/community/screens';
import { AllSitesScreen, ExploreScreen } from '../features/pilgrim/explore/screens';
import CreateJournalScreen from '../features/pilgrim/journal/screens/CreateJournalScreen';
import JournalDetailScreen from '../features/pilgrim/journal/screens/JournalDetailScreen';
import { JournalScreen } from '../features/pilgrim/journal/screens/JournalScreen';
import PlanChatScreen from '../features/pilgrim/planner/screens/PlanChatScreen';
import ActiveJourneyScreen from '../features/pilgrim/planner/screens/ActiveJourneyScreen';
import CreatePlanScreen from '../features/pilgrim/planner/screens/CreatePlanScreen';
import PlanDetailScreen from '../features/pilgrim/planner/screens/PlanDetailScreen';
import PlannerScreen from '../features/pilgrim/planner/screens/PlannerScreen';
import SiteDetailScreen from '../features/pilgrim/site/screens/SiteDetailScreen';


const Tab = createBottomTabNavigator();
const ExploreStack = createNativeStackNavigator();
const PlannerStack = createNativeStackNavigator();
const JournalStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();

const PROFILE_COLORS = {
  primary: '#cfaa3a',
  primaryLight: 'rgba(207, 170, 58, 0.1)',
  backgroundLight: '#fdfdfc',
  surfaceLight: '#ffffff',
  textMain: '#191710',
  textMuted: '#6C8CA3',
  borderLight: '#e4e0d3',
  danger: '#DC4C4C',
  dangerLight: '#FFF5F5',
};

const MainStack = createNativeStackNavigator();

const ExploreTab = () => {
  return (
    <ExploreStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
      }}
    >
      <ExploreStack.Screen
        name="ExploreMain"
        component={ExploreScreen}
        options={{
          animation: 'none',
        }}
      />
    </ExploreStack.Navigator>
  );
};

const JournalStackNavigator = () => (
  <JournalStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.background },
      animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
    }}
  >
    <JournalStack.Screen name="JournalMain" component={JournalScreen} />
    <JournalStack.Screen name="JournalDetailScreen" component={JournalDetailScreen} />
    <JournalStack.Screen
      name="CreateJournalScreen"
      component={CreateJournalScreen}
      options={{ presentation: 'modal' }}
    />
  </JournalStack.Navigator>
);

const PlannerStackNavigator = () => (
  <PlannerStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: {
        backgroundColor: COLORS.background,
      },
      animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
    }}
  >
    <PlannerStack.Screen name="PlannerMain" component={PlannerScreen} />
    <PlannerStack.Screen name="PlanDetailScreen" component={PlanDetailScreen} />
    <PlannerStack.Screen name="ActiveJourneyScreen" component={ActiveJourneyScreen} />
    <PlannerStack.Screen name="PlanChatScreen" component={PlanChatScreen} />
    <PlannerStack.Screen
      name="CreatePlanScreen"
      component={CreatePlanScreen}
      options={{ presentation: 'modal' }}
    />
  </PlannerStack.Navigator>
);

import { useTranslation } from 'react-i18next';
import EditProfileScreen from '../features/pilgrim/profile/screens/EditProfileScreen';
import FavoriteSitesScreen from '../features/pilgrim/profile/screens/FavoriteSitesScreen';
import OfflineDownloadsScreen from '../features/pilgrim/profile/screens/OfflineDownloadsScreen';
import ProfileScreen from '../features/pilgrim/profile/screens/ProfileScreen';
import SOSDetailScreen from '../features/pilgrim/profile/screens/SOSDetailScreen';
import WalletScreen from '../features/pilgrim/profile/screens/WalletScreen';
import SOSHistoryScreen from '../features/pilgrim/profile/screens/SOSHistoryScreen';

const ProfileStack = createNativeStackNavigator();

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: {
        backgroundColor: COLORS.background,
      },
      animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
    }}
  >
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="FavoriteSites" component={FavoriteSitesScreen} />
    <ProfileStack.Screen name="OfflineDownloads" component={OfflineDownloadsScreen} />
    <ProfileStack.Screen name="SOSHistory" component={SOSHistoryScreen} />
    <ProfileStack.Screen name="SOSDetail" component={SOSDetailScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="Wallet" component={WalletScreen} />
  </ProfileStack.Navigator>
);

const CommunityStackNavigator = () => (
  <CommunityStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.background },
      animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
    }}
  >
    <CommunityStack.Screen name="CommunityMain" component={CommunityScreen} />
    <CommunityStack.Screen
      name="CreatePost"
      component={CreatePostScreen}
      options={{ presentation: 'fullScreenModal' }}
    />
    <CommunityStack.Screen
      name="PostDetail"
      component={PostDetailScreen}
    />
  </CommunityStack.Navigator>
);


const BottomTabNavigator = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          height: 60 + (insets.bottom || 10),
          paddingBottom: insets.bottom || 10,
          paddingTop: 8,
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.fontSize.xs,
          fontWeight: TYPOGRAPHY.fontWeight.medium,
        },
        tabBarLabel: ({ focused, color }) => {
          let label = route.name;
          switch (route.name) {
            case 'Hanh huong':
              label = t('navigation.explore', { defaultValue: 'Khám phá' });
              break;
            case 'Nhat ky':
              label = t('navigation.journal', { defaultValue: 'Nhật ký' });
              break;
            case 'Lich trinh':
              // Map "Lich trinh" to "schedule" key which exists in translation
              label = t('navigation.schedule', { defaultValue: 'Lịch trình' });
              break;
            case 'Cong dong':
              label = t('navigation.community', { defaultValue: 'Cộng đồng' });
              break;
            case 'Ho so':
              label = t('navigation.profile', { defaultValue: 'Hồ sơ' });
              break;
          }
          return <Text style={{ color, fontSize: 10, fontWeight: '500' }}>{label}</Text>;
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Hanh huong':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'Nhat ky':
              iconName = focused ? 'book' : 'book-outline';
              break;
            case 'Lich trinh':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Cong dong':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Ho so':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size || 24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Hanh huong" component={ExploreTab} />
      <Tab.Screen name="Nhat ky" component={JournalStackNavigator} />
      <Tab.Screen name="Lich trinh" component={PlannerStackNavigator} />
      <Tab.Screen name="Cong dong" component={CommunityStackNavigator} />
      <Tab.Screen name="Ho so" component={ProfileStackNavigator} />
    </Tab.Navigator >
  );
};

export const PilgrimNavigator = () => {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={BottomTabNavigator} />
      <MainStack.Screen
        name="SiteDetail"
        component={SiteDetailScreen}
        options={{
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
          presentation: 'card',
        }}
      />
      <MainStack.Screen
        name="AllSites"
        component={AllSitesScreen}
        options={{
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
          presentation: 'card',
        }}
      />
    </MainStack.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  placeholderText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
