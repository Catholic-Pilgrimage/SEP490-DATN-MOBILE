import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { PilgrimNavigator } from './PilgrimNavigator';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  // For now, we'll just show the Pilgrim Navigator
  // Later we can add auth flow, splash screen, etc.
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={PilgrimNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

