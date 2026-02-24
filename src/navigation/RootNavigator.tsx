
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ChangePasswordScreen from '../features/auth/screens/ChangePasswordScreen';
import SplashScreen from '../features/auth/screens/SplashScreen';
import { PersonalInfoScreen } from '../features/guide/profile/screens';
import SiteManagementScreen from '../features/guide/site-management/screens/SiteManagementScreen';
import { SOSDetailScreen, SOSListScreen } from '../features/guide/support/screens';
import SettingsScreen from '../features/shared/settings/screens/SettingsScreen';
import { AuthNavigator } from './AuthNavigator';
import { GuideNavigator } from './GuideNavigator';
import { PilgrimNavigator } from './PilgrimNavigator';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  GuideMain: undefined;
  // Guide Profile Screens
  PersonalInfo: undefined;
  SiteManagement: undefined;
  // Guide Support Screens
  SOSList: undefined;
  SOSDetail: { id: string };
  ChangePassword: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Splash"
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{
            animation: 'fade',
            animationTypeForReplace: 'pop',
          }}
        />
        <Stack.Screen
          name="Main"
          component={PilgrimNavigator}
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="GuideMain"
          component={GuideNavigator}
          options={{
            animation: 'fade',
          }}
        />
        {/* Guide Profile Screens */}
        <Stack.Screen
          name="PersonalInfo"
          component={PersonalInfoScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="SiteManagement"
          component={SiteManagementScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        {/* Guide Support Screens */}
        <Stack.Screen
          name="SOSList"
          component={SOSListScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="SOSDetail"
          component={SOSDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
