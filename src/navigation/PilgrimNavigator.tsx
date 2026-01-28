import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../constants/theme.constants';
import { useAuth } from '../contexts/AuthContext';
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
  const { user, isGuest, isAuthenticated, logout, exitGuestMode } = useAuth();

  const handleLogin = async () => {
    // Exit guest mode first, then navigate to Auth
    if (isGuest) {
      await exitGuestMode();
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      })
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                })
              );
            } catch (error) {
              console.error('Logout error:', error);
              // Still navigate to Auth even if logout fails
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                })
              );
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Thông tin cá nhân', requireAuth: true },
    { icon: 'notifications-outline', label: 'Thông báo', requireAuth: true },
    { icon: 'bookmark-outline', label: 'Đã lưu', requireAuth: true },
    { icon: 'time-outline', label: 'Lịch sử hành hương', requireAuth: true },
    { icon: 'settings-outline', label: 'Cài đặt', requireAuth: false },
    { icon: 'help-circle-outline', label: 'Trợ giúp', requireAuth: false },
    { icon: 'information-circle-outline', label: 'Về chúng tôi', requireAuth: false },
  ];

  const handleMenuPress = (item: typeof menuItems[0]) => {
    if (item.requireAuth && isGuest) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập để sử dụng tính năng này.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => handleLogin() },
        ]
      );
      return;
    }
    // TODO: Navigate to specific screen
    console.log('Navigate to:', item.label);
  };

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
            {isAuthenticated && (
              <TouchableOpacity style={profileStyles.editAvatarButton}>
                <MaterialIcons name="camera-alt" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={profileStyles.userName}>
            {isGuest ? 'Khách' : user?.fullName || 'Người hành hương'}
          </Text>
          <Text style={profileStyles.userEmail}>
            {isGuest ? 'Đăng nhập để trải nghiệm đầy đủ' : user?.email || ''}
          </Text>
        </View>

        {/* Guest Login Banner */}
        {isGuest && (
          <TouchableOpacity 
            style={profileStyles.loginBanner}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <View style={profileStyles.loginBannerContent}>
              <MaterialIcons name="login" size={24} color={PROFILE_COLORS.primary} />
              <View style={profileStyles.loginBannerText}>
                <Text style={profileStyles.loginBannerTitle}>Đăng nhập ngay</Text>
                <Text style={profileStyles.loginBannerSubtitle}>
                  Lưu địa điểm yêu thích, lên lịch hành hương và nhiều hơn nữa
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={PROFILE_COLORS.primary} />
          </TouchableOpacity>
        )}

        <View style={profileStyles.statsContainer}>
          <View style={profileStyles.statItem}>
            <Text style={profileStyles.statNumber}>0</Text>
            <Text style={profileStyles.statLabel}>Hành hương</Text>
          </View>
          <View style={profileStyles.statDivider} />
          <View style={profileStyles.statItem}>
            <Text style={profileStyles.statNumber}>0</Text>
            <Text style={profileStyles.statLabel}>Đã lưu</Text>
          </View>
          <View style={profileStyles.statDivider} />
          <View style={profileStyles.statItem}>
            <Text style={profileStyles.statNumber}>0</Text>
            <Text style={profileStyles.statLabel}>Đánh giá</Text>
          </View>
        </View>

        <View style={profileStyles.menuSection}>
          <Text style={profileStyles.menuTitle}>TÀI KHOẢN</Text>
          <View style={profileStyles.menuCard}>
            {menuItems.map((item, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  profileStyles.menuItem,
                  index < menuItems.length - 1 && profileStyles.menuItemBorder,
                ]}
                activeOpacity={0.7}
                onPress={() => handleMenuPress(item)}
              >
                <View style={profileStyles.menuItemLeft}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={22} 
                    color={PROFILE_COLORS.textMain} 
                  />
                  <Text style={profileStyles.menuItemText}>{item.label}</Text>
                </View>
                <View style={profileStyles.menuItemRight}>
                  {item.requireAuth && isGuest && (
                    <View style={profileStyles.lockBadge}>
                      <MaterialIcons name="lock" size={12} color={PROFILE_COLORS.textMuted} />
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={PROFILE_COLORS.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Login or Logout Button */}
        {isGuest ? (
          <TouchableOpacity 
            style={profileStyles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <MaterialIcons name="login" size={22} color="#fff" />
            <Text style={profileStyles.loginButtonText}>Đăng nhập / Đăng ký</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={profileStyles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialIcons name="logout" size={22} color={PROFILE_COLORS.danger} />
            <Text style={profileStyles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        )}

        <Text style={profileStyles.versionText}>Phiên bản 1.0.0</Text>
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
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    fontSize: 15,
    color: PROFILE_COLORS.textMain,
    fontWeight: '500',
  },
  lockBadge: {
    backgroundColor: PROFILE_COLORS.borderLight,
    borderRadius: 10,
    padding: 4,
  },
  loginBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PROFILE_COLORS.primaryLight,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(207, 170, 58, 0.3)',
  },
  loginBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  loginBannerText: {
    flex: 1,
  },
  loginBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PROFILE_COLORS.textMain,
  },
  loginBannerSubtitle: {
    fontSize: 13,
    color: PROFILE_COLORS.textMuted,
    marginTop: 2,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PROFILE_COLORS.primary,
    marginHorizontal: 24,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    ...SHADOWS.medium,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
