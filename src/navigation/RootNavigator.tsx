import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import SplashScreen from '../features/auth/screens/SplashScreen';
import { AuthNavigator } from './AuthNavigator';
import { GuideNavigator } from './GuideNavigator';
import { PilgrimNavigator } from './PilgrimNavigator';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;        
  GuideMain: undefined;  
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};
