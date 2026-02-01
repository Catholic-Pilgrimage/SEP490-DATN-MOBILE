// MySite Stack Navigator - handles navigation within My Site feature
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { 
  MySiteScreen, 
  EventDetailScreen,
  MediaUploadScreen,
  MediaDetailScreen,
} from '../features/guide/my-site/screens';
import { MediaItem } from '../types/guide';

export type MySiteStackParamList = {
  MySiteHome: undefined;
  EventDetail: { eventId?: string };
  MediaUpload: undefined;
  MediaDetail: { media: MediaItem };
};

const Stack = createNativeStackNavigator<MySiteStackParamList>();

export const MySiteNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MySiteHome" component={MySiteScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="MediaUpload" component={MediaUploadScreen} />
      <Stack.Screen name="MediaDetail" component={MediaDetailScreen} />
    </Stack.Navigator>
  );
};

export default MySiteNavigator;
