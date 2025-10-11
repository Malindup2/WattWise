import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { ForumPost } from '../types';

interface PostMenuProps {
  post: ForumPost | null;
  onEdit: (post: ForumPost) => void;
  onDelete: (post: ForumPost) => void;
  onClose: () => void;
}

export const PostMenu: React.FC<PostMenuProps> = ({ post, onEdit, onDelete, onClose }) => {
  if (!post) return null;

  return (
    <View style={styles.menuOverlay}>
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.menuCard} onPress={() => {}}>
          <TouchableOpacity style={styles.menuItem} onPress={() => onEdit(post)}>
            <Ionicons name="create-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.menuItemText}>Edit Post</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => onDelete(post)}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete Post</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCancel} onPress={onClose}>
            <Text style={styles.menuCancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};
