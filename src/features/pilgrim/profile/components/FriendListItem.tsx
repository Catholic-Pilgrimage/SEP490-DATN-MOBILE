import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '../../../../constants/theme.constants';
import { FriendshipListItem } from '../../../../types/pilgrim';

interface Props {
  item: FriendshipListItem;
  onAccept?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
}

export const FriendListItemComp: React.FC<Props> = ({ item, onAccept, onReject, onRemove }) => {
  const { user, status } = item;

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <View style={styles.card}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.initialsAvatar]}>
          <Text style={styles.initialsText}>{getInitials(user.full_name)}</Text>
        </View>
      )}
      
      <View style={styles.info}>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {status === 'pending' ? (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.btn, styles.acceptBtn]} 
            onPress={onAccept}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btn, styles.rejectBtn]} 
            onPress={onReject}
          >
            <Ionicons name="close" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.removeBtn} 
          onPress={onRemove}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#B8860B',
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  email: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#F3F4F6',
  },
  removeBtn: {
    padding: SPACING.sm,
  },
});
