import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../constants/theme.constants';
import ExploreScreen from '../features/pilgrim/explore/screens/ExploreScreen';
import SiteDetailScreen from '../features/pilgrim/site/screens/SiteDetailScreen';

const Tab = createBottomTabNavigator();
const ExploreStack = createNativeStackNavigator();

// Explore Stack Navigator
const ExploreStackNavigator = () => {
  return (
    <ExploreStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
        // iOS-like smooth transitions
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        // Gesture configurations
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
      <ExploreStack.Screen 
        name="SiteDetail" 
        component={SiteDetailScreen}
        options={{
          // Simple, smooth slide transition
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
          presentation: 'card',
          // Optimized transition specs
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 300,
                useNativeDriver: true,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 250,
                useNativeDriver: true,
              },
            },
          },
          // Simple slide with fade (no scale to avoid jank)
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.2],
                }),
              },
            };
          },
        }}
      />
    </ExploreStack.Navigator>
  );
};

// Placeholder screens
const CommunityScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Cộng đồng</Text>
  </View>
);

const PlannerScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Lịch trình</Text>
  </View>
);

const LocationScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Vị trí</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Hồ sơ</Text>
  </View>
);

export const PilgrimNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.fontSize.xs,
          fontWeight: TYPOGRAPHY.fontWeight.medium,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Hành hương':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'Cộng đồng':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Lịch trình':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Vị trí':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'Hồ sơ':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size || 24} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Hành hương" 
        component={ExploreStackNavigator}
      />
      <Tab.Screen 
        name="Cộng đồng" 
        component={CommunityScreen}
      />
      <Tab.Screen 
        name="Lịch trình" 
        component={PlannerScreen}
      />
      <Tab.Screen 
        name="Vị trí" 
        component={LocationScreen}
      />
      <Tab.Screen 
        name="Hồ sơ" 
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
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

