import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../../../../../constants/theme.constants';
import { useFriendship } from '../../../profile/hooks/useFriendship';
import { FriendshipListItem } from '../../../../../types/pilgrim';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (friends: FriendshipListItem[]) => void;
  alreadyInvitedEmails: string[];
}

export const FriendPickerModal: React.FC<Props> = ({ 
  visible, 
  onClose, 
  onSelect,
  alreadyInvitedEmails 
}) => {
  const { friends, fetchFriends, loading } = useFriendship();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      fetchFriends();
      setSelectedIds(new Set());
    }
  }, [visible, fetchFriends]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    const selected = friends.filter(f => selectedIds.has(f.friendship_id));
    onSelect(selected);
    onClose();
  };

  // Filter out friends already in the plan
  const availableFriends = friends.filter(f => !alreadyInvitedEmails.includes(f.user.email.toLowerCase()));

  const renderItem = ({ item }: { item: FriendshipListItem }) => {
    const isSelected = selectedIds.has(item.friendship_id);
    return (
      <TouchableOpacity 
        style={[styles.friendItem, isSelected && styles.selectedItem]} 
        onPress={() => toggleSelect(item.friendship_id)}
      >
        {item.user.avatar_url ? (
          <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.initialsAvatar]}>
            <Text style={styles.initialsText}>{(() => {
              const name = item.user.full_name || '';
              const parts = name.trim().split(' ');
              if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
              return name.substring(0, 2).toUpperCase();
            })()}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{item.user.full_name}</Text>
          <Text style={styles.email}>{item.user.email}</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Chọn từ bạn bè</Text>
              <View style={styles.proHint}>
                <Ionicons name="sparkles" size={12} color="#B45309" />
                <Text style={styles.proHintText}>Không cần cọc cho bạn bè</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} color={COLORS.primary} />
          ) : (
            <FlatList
              data={availableFriends}
              keyExtractor={item => item.friendship_id}
              renderItem={renderItem}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    {friends.length === 0 ? "Bạn chưa có bạn bè nào" : "Tất cả bạn bè đã có trong danh sách"}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.list}
            />
          )}

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
            <Text style={styles.countText}>{selectedIds.size} đã chọn</Text>
            <TouchableOpacity 
              style={[styles.confirmBtn, selectedIds.size === 0 && styles.disabledBtn]} 
              disabled={selectedIds.size === 0}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmBtnText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  proHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  proHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 4,
  },
  list: {
    padding: SPACING.md,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedItem: {
    backgroundColor: '#F3F4F6',
    borderColor: COLORS.primary + '20',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
  },
  initialsAvatar: {
    backgroundColor: '#E5E1D8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  initialsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B8860B',
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  email: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  footer: {
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  countText: {
    flex: 1,
    fontSize: 15,
    color: '#6B7280',
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  disabledBtn: {
    backgroundColor: '#D1D5DB',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  loader: {
    marginTop: 50,
  },
  empty: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 15,
  }
});
