import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../../types/actionPlanner';
import { Colors } from '../../constants/Colors';

type Props = {
  task: Task;
  onToggleComplete: (id: string) => void;
  isHighImpact?: boolean; // Highlight top task
};

const TaskCard = ({ task, onToggleComplete, isHighImpact = false }: Props) => {
  return (
    <TouchableOpacity
      onPress={() => onToggleComplete(task.id)}
      style={[
        styles.card,
        {
          backgroundColor: task.completed ? Colors.successLight : Colors.background,
          borderColor: isHighImpact ? Colors.primary : Colors.border,
          borderWidth: isHighImpact ? 2 : 1,
        },
      ]}
    >
      <Text style={[styles.title, task.completed && { textDecorationLine: 'line-through' }]}>
        {task.title}
      </Text>
      <Text style={styles.description}>{task.description}</Text>
      <Text style={styles.stats}>
        💡 {task.energySaved ?? 0} kWh | 💰 ${task.moneySaved ?? 0}
      </Text>

      {task.recurrence && (
        <Text style={styles.recurrence}>
          🔁 {task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)}
        </Text>
      )}
      {task.scheduledDate && (
        <Text style={styles.scheduled}>
          📅 {task.scheduledDate}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginVertical: 6,
    borderRadius: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontWeight: '700',
    color: Colors.textPrimary,
    fontSize: 16,
  },
  description: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 14,
  },
  stats: {
    color: Colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },
  recurrence: {
    color: Colors.warning,
    marginTop: 4,
    fontSize: 12,
  },
  scheduled: {
    color: Colors.textLight,
    marginTop: 2,
    fontSize: 12,
  },
});

export default TaskCard;
