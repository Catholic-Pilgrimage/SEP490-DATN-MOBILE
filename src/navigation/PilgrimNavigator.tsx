import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../constants/theme.constants';
import ExploreScreen from '../features/pilgrim/explore/screens/ExploreScreen';
import SiteDetailScreen from '../features/pilgrim/site/screens/SiteDetailScreen';

const Tab = createBottomTabNavigator();
const ExploreStack = createNativeStackNavigator();

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

const ExploreStackNavigator = () => {
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
      <ExploreStack.Screen 
        name="SiteDetail" 
        component={SiteDetailScreen}
        options={{
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
          presentation: 'card',
        }}
      />
    </ExploreStack.Navigator>
  );
};

const CommunityScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Cong dong</Text>
  </View>
);

const PlannerScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Lich trinh</Text>
  </View>
);

const LocationScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Vi tri</Text>
  </View>
);

const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleLogout = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      })
    );
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Thong tin ca nhan' },
    { icon: 'notifications-outline', label: 'Thong bao' },
    { icon: 'bookmark-outline', label: 'Da luu' },
    { icon: 'time-outline', label: 'Lich su hanh huong' },
    { icon: 'settings-outline', label: 'Cai dat' },
    { icon: 'help-circle-outline', label: 'Tro giup' },
    { icon: 'information-circle-outline', label: 'Ve chung toi' },
  ];

  return (
    <View style={profileStyles.container}>
      <LinearGradient
        colors={[PROFILE_COLORS.primaryLight, PROFILE_COLORS.backgroundLight]}
        style={profileStyles.headerGradient}
      />

      <ScrollView 
        contentContainerStyle={profileStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={profileStyles.profileHeader}>
          <View style={profileStyles.avatarContainer}>
            <LinearGradient
              colors={[PROFILE_COLORS.primary, '#b89530']}
              style={profileStyles.avatarGradient}
            >
              <MaterialIcons name="person" size={40} color="#fff" />
            </LinearGradient>
            <TouchableOpacity style={profileStyles.editAvatarButton}>
              <MaterialIcons name="camera-alt" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={profileStyles.userName}>Khach</Text>
          <Text style={profileStyles.userEmail}>Dang nhap de trai nghiem day du</Text>
        </View>

        <View style={profileStyles.statsContainer}>
          <View style={profileStyles.statItem}>
            <Text style={profileStyles.statNumber}>0</Text>
            <Text style={profileStyles.statLabel}>Hanh huong</Text>
          </View>
          <View style={profileStyles.statDivider} />
          <View style={profileStyles.statItem}>
            <Text style={profileStyles.statNumber}>0</Text>
            <Text style={profileStyles.statLabel}>Da luu</Text>
          </View>
          <View style={profileStyles.statDivider} />
          <View style={profileStyles.statItem}>
            <Text style={profileStyles.statNumber}>0</Text>
            <Text style={profileStyles.statLabel}>Danh gia</Text>
          </View>
        </View>

        <View style={profileStyles.menuSection}>
          <Text style={profileStyles.menuTitle}>TAI KHOAN</Text>
          <View style={profileStyles.menuCard}>
            {menuItems.map((item, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  profileStyles.menuItem,
                  index < menuItems.length - 1 && profileStyles.menuItemBorder,
                ]}
                activeOpacity={0.7}
              >
                <View style={profileStyles.menuItemLeft}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={22} 
                    color={PROFILE_COLORS.textMain} 
                  />
                  <Text style={profileStyles.menuItemText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={PROFILE_COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={profileStyles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialIcons name="logout" size={22} color={PROFILE_COLORS.danger} />
          <Text style={profileStyles.logoutText}>Dang xuat</Text>
        </TouchableOpacity>

        <Text style={profileStyles.versionText}>Phien ban 1.0.0</Text>
      </ScrollView>
    </View>
  );
};

export const PilgrimNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textTertiary,
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
            case 'Hanh huong':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'Cong dong':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Lich trinh':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Vi tri':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'Ho so':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size || 24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Hanh huong" component={ExploreStackNavigator} />
      <Tab.Screen name="Cong dong" component={CommunityScreen} />
      <Tab.Screen name="Lich trinh" component={PlannerScreen} />
      <Tab.Screen name="Vi tri" component={LocationScreen} />
      <Tab.Screen name="Ho so" component={ProfileScreen} />
    </Tab.Navigator>
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

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PROFILE_COLORS.backgroundLight,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PROFILE_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: PROFILE_COLORS.backgroundLight,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: PROFILE_COLORS.textMain,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: PROFILE_COLORS.textMuted,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: PROFILE_COLORS.surfaceLight,
    marginHorizontal: 24,
    borderRadius: 16,
    paddingVertical: 20,
    ...SHADOWS.small,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: PROFILE_COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: PROFILE_COLORS.textMuted,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: PROFILE_COLORS.borderLight,
    marginVertical: 8,
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: PROFILE_COLORS.textMuted,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: PROFILE_COLORS.surfaceLight,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: PROFILE_COLORS.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuItemText: {
    fontSize: 15,
    color: PROFILE_COLORS.textMain,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PROFILE_COLORS.dangerLight,
    marginHorizontal: 24,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(220, 76, 76, 0.3)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: PROFILE_COLORS.danger,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: PROFILE_COLORS.textMuted,
    marginTop: 24,
  },
});
