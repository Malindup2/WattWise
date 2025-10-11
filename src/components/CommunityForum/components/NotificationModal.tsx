import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationData } from '../types';
import { Colors } from '../../../constants/Colors';

interface NotificationsModalProps {
  visible: boolean;
  notifications: NotificationData[];
  unreadCount: number;
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  notifications,
  unreadCount,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_comment':
        return 'chatbubble-outline';
      case 'upvote':
        return 'arrow-up-outline';
      case 'downvote':
        return 'arrow-down-outline';
      default:
        return 'notifications-outline';
    }
  };

const getNotificationMessage = (notification: NotificationData) => {
  switch (notification.type) {
    case 'new_comment':
      return `${notification.fromUserName} commented on your post: "${notification.postTitle}"`;
    case 'upvote':
      return `${notification.fromUserName} upvoted your post: "${notification.postTitle}"`;
    case 'downvote':
      return `${notification.fromUserName} downvoted your post: "${notification.postTitle}"`;
    default:
      return 'New notification';
  }
};

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Notifications</Text>
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.markAllReadButton} onPress={onMarkAllAsRead}>
              <Text style={styles.markAllReadText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.modalContent}>
          {notifications.length === 0 ? (
            <View style={styles.noNotificationsContainer}>
              <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
              <Text style={styles.noNotificationsTitle}>No notifications yet</Text>
              <Text style={styles.noNotificationsText}>
                You'll see notifications here when someone comments on your posts or interacts with your content.
              </Text>
            </View>
          ) : (
            notifications.map(notification => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.unreadNotification,
                ]}
                onPress={() => onMarkAsRead(notification.id)}
              >
                <View style={styles.notificationIcon}>
                  <Ionicons
                    name={getNotificationIcon(notification.type)}
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationText}>
                    {getNotificationMessage(notification)}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {notification.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                  </Text>
                  {notification.commentPreview && (
                    <Text style={styles.commentPreview}>
                      "{notification.commentPreview}"
                    </Text>
                  )}
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  noNotificationsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noNotificationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noNotificationsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
  },
  unreadNotification: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  commentPreview: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
    marginTop: 8,
  },
  markAllReadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    borderRadius: 16,
  },
  markAllReadText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationsModal;