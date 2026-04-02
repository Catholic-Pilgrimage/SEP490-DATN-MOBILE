// MySite Stack Navigator - handles navigation within My Site feature
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  MySiteScreen,
  MediaUploadScreen,
  MediaDetailScreen,
  SiteModels3dScreen,
} from '../features/guide/my-site/screens';
import { EventDetailScreen } from '../features/guide/my-site/screens/EventDetailScreenNew';
import { EventItem, MediaItem } from '../types/guide';

export type MySiteStackParamList = {
  MySiteHome:
    | {
        initialTab?: "events" | "media" | "schedules" | "locations" | "reviews";
        reviewId?: string;
        autoOpenReply?: boolean;
      }
    | undefined;
  EventDetail: { event?: EventItem };
  MediaUpload: undefined;
  MediaDetail: { media: MediaItem };
  SiteModels3d: undefined;
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
      <Stack.Screen name="SiteModels3d" component={SiteModels3dScreen} />
    </Stack.Navigator>
  );
};

export default MySiteNavigator;
