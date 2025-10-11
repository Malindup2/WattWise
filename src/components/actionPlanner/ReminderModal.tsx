import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Task } from '../../types/actionPlanner';

type Props = {
  visible: boolean;
  task: Task;
  onClose: () => void;
  onMarkDone: (id: string) => void;
};

const ReminderModal = ({ visible, task, onClose, onMarkDone }: Props) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Reminder</Text>
          <Text style={styles.taskTitle}>{task.title}</Text>

          <TouchableOpacity
            onPress={() => {
              onMarkDone(task.id);
              onClose();
            }}
            style={styles.markDoneButton}
          >
            <Text style={styles.markDoneText}>Mark as Done</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 8,
  },
  taskTitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginBottom: 20,
  },
  markDoneButton: {
    padding: 12,
    backgroundColor: Colors.success,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  markDoneText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  closeButton: {
    padding: 12,
    backgroundColor: Colors.borderLight,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default ReminderModal;
