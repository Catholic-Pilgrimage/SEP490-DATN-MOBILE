import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '../../../../constants/theme.constants';
import { useFriendship } from '../hooks/useFriendship';
import { FriendListItemComp } from '../components/FriendListItem';
import { useConfirm } from '../../../../hooks/useConfirm';

type Tab = 'friends' | 'requests';

export default function FriendListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    loading, 
    friends, 
    pendingRequests, 
    fetchFriends, 
    fetchPendingRequests, 
    respondToRequest, 
    removeFriend 
  } = useFriendship();

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriends();
    } else {
      fetchPendingRequests();
    }
  }, [activeTab, fetchFriends, fetchPendingRequests]);

  const onRefresh = () => {
    if (activeTab === 'friends') {
      fetchFriends();
    } else {
      fetchPendingRequests();
    }
  };

  const handleRemoveFriend = async (friendId: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Hủy kết bạn?',
      message: `Bạn có chắc muốn hủy kết bạn với ${name}?`,
      confirmText: 'Đồng ý',
      cancelText: 'Hủy',
      type: 'warning'
    });

    if (isConfirmed) {
      await removeFriend(friendId, name);
    }
  };

  const handleAddFriend = async () => {
    if (!addEmail.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập Email người bạn muốn kết nối");
      return;
    }
    
    setIsSubmitting(true);
    // Since we don't have a lookup API, we assume the backend handles lookup by email 
    // but the current API takes addresseeId.
    // Wait, the friendshipApi.sendFriendRequest takes addresseeId (UUID).
    // If I can't find the ID from Email, I can't send the request.
    
    // Suggestion: The user should probably use a Search API.
    // For now, I'll alert that this needs a Search User API.
    Alert.alert("Tính năng đang phát triển", "Hiện tại cần API tìm kiếm người dùng theo Email để lấy ID. Bạn hãy kết bạn trực tiếp từ danh sách thành viên trong Lịch trình nhé!");
    setIsSubmitting(false);
    setShowAddModal(false);
  };

  const filteredData = (activeTab === 'friends' ? friends : pendingRequests).filter(item => 
    item.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    item.user.email.toLowerCase().includes(search.toLowerCase())
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={activeTab === 'friends' ? "people-outline" : "mail-outline"} 
        size={64} 
        color="#D1D5DB" 
      />
      <Text style={styles.emptyText}>
        {activeTab === 'friends' ? "Chưa có bạn bè nào" : "Không có lời mời kết bạn"}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bạn bè</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="person-add-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Tìm kiếm..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Bạn bè</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Lời mời</Text>
          {pendingRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.friendship_id}
        renderItem={({ item }) => (
          <FriendListItemComp 
            item={item} 
            onAccept={() => respondToRequest(item.friendship_id, 'accept')}
            onReject={() => respondToRequest(item.friendship_id, 'reject')}
            onRemove={() => handleRemoveFriend(item.user.id, item.user.full_name)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> : renderEmpty()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      />

      {/* ADD FRIEND MODAL */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm bạn mới</Text>
            <Text style={styles.modalSub}>Nhập email người bạn muốn kết nối</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="example@gmail.com"
              value={addEmail}
              onChangeText={setAddEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.submitBtn]} 
                onPress={handleAddFriend}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Gửi lời mời</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE5',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  searchSection: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E1D8',
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.xs,
    fontSize: 15,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE5',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: '#9CA3AF',
  },
  addBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: SPACING.lg,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: BORDER_RADIUS.md,
    height: 50,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
  },
  cancelBtnText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
