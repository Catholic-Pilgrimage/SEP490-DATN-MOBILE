import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING } from '../../../../constants/guide.constants';

type TabType = 'active' | 'history';

// Mock data
const MOCK_ACTIVE_REQUESTS = [
  {
    id: '1',
    pilgrimName: 'Nguyễn Văn A',
    avatar: 'N',
    message: 'Xin hỏi giờ lễ chiều nay là mấy giờ ạ?',
    time: '5 phút trước',
    isSOS: false,
  },
  {
    id: '2',
    pilgrimName: 'Trần Thị B',
    avatar: 'T',
    message: 'Cần hỗ trợ y tế khẩn cấp',
    time: '10 phút trước',
    isSOS: true,
  },
  {
    id: '3',
    pilgrimName: 'Lê Văn C',
    avatar: 'L',
    message: 'Cho hỏi nhà vệ sinh ở đâu?',
    time: '15 phút trước',
    isSOS: false,
  },
];

const MOCK_HISTORY = [
  {
    id: '4',
    pilgrimName: 'Phạm Thị D',
    avatar: 'P',
    message: 'Đã được hỗ trợ về giờ lễ',
    time: 'Hôm qua',
    isSOS: false,
    resolved: true,
  },
];

const SupportScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const renderItem = ({ item }: { item: typeof MOCK_ACTIVE_REQUESTS[0] }) => (
    <TouchableOpacity
      style={[styles.requestCard, item.isSOS && styles.sosCard]}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, item.isSOS && styles.sosAvatar]}>
        {item.isSOS ? (
          <MaterialIcons name="warning" size={20} color={GUIDE_COLORS.sos} />
        ) : (
          <Text style={styles.avatarText}>{item.avatar}</Text>
        )}
      </View>
      <View style={styles.requestContent}>
        <View style={styles.requestHeader}>
          <Text style={styles.pilgrimName}>{item.pilgrimName}</Text>
          {item.isSOS && (
            <View style={styles.sosBadge}>
              <Text style={styles.sosBadgeText}>SOS</Text>
            </View>
          )}
        </View>
        <Text style={styles.requestMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={[styles.requestTime, item.isSOS && styles.sosTime]}>{item.time}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={GUIDE_COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={GUIDE_COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hỗ trợ</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Đang xử lý
          </Text>
          {MOCK_ACTIVE_REQUESTS.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{MOCK_ACTIVE_REQUESTS.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'active' ? MOCK_ACTIVE_REQUESTS : MOCK_HISTORY}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={64} color={GUIDE_COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Không có yêu cầu</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active' 
                ? 'Các yêu cầu hỗ trợ mới sẽ xuất hiện ở đây'
                : 'Lịch sử hỗ trợ sẽ xuất hiện ở đây'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.background,
  },
  header: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: GUIDE_COLORS.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    gap: GUIDE_SPACING.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.lg,
    borderRadius: 20,
    backgroundColor: GUIDE_COLORS.backgroundTertiary,
  },
  activeTab: {
    backgroundColor: GUIDE_COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: GUIDE_COLORS.textSecondary,
  },
  activeTabText: {
    color: GUIDE_COLORS.textOnPrimary,
  },
  tabBadge: {
    backgroundColor: GUIDE_COLORS.sos,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: GUIDE_SPACING.xs,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: GUIDE_COLORS.textOnPrimary,
  },
  listContent: {
    padding: GUIDE_SPACING.lg,
    paddingBottom: 100,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: 12,
    padding: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.sm,
    ...GUIDE_SHADOWS.sm,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
  },
  sosCard: {
    backgroundColor: GUIDE_COLORS.sosLight,
    borderColor: `${GUIDE_COLORS.sos}30`,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GUIDE_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GUIDE_SPACING.md,
  },
  sosAvatar: {
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 2,
    borderColor: GUIDE_COLORS.sos,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: GUIDE_COLORS.textOnPrimary,
  },
  requestContent: {
    flex: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GUIDE_SPACING.sm,
  },
  pilgrimName: {
    fontSize: 15,
    fontWeight: '600',
    color: GUIDE_COLORS.textPrimary,
  },
  sosBadge: {
    backgroundColor: GUIDE_COLORS.sos,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sosBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: GUIDE_COLORS.textOnPrimary,
  },
  requestMessage: {
    fontSize: 13,
    color: GUIDE_COLORS.textSecondary,
    marginTop: 4,
  },
  requestTime: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
    marginTop: 4,
  },
  sosTime: {
    color: GUIDE_COLORS.sos,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GUIDE_COLORS.textPrimary,
    marginTop: GUIDE_SPACING.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    color: GUIDE_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.xxl,
  },
});

export default SupportScreen;
