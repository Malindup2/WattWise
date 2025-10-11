import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GoalSection as GoalSectionType, Task } from '../../types/actionPlanner';
import TaskCard from './TaskCard';
import { Colors } from '../../constants/Colors';

type Props = {
  section: GoalSectionType;
  onToggleComplete: (id: string) => void;
};

const GoalCard = ({ section, onToggleComplete }: Props) => {
  if (section.tasks.length === 0) {
    return null; // Hide section if no tasks
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{section.title}</Text>
      {section.tasks.map((task: Task, idx: number) => (
        <TaskCard
          key={task.id}
          task={task}
          onToggleComplete={onToggleComplete}
          isHighImpact={idx === 0} // Highlight the first/highest impact task
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
});

export default GoalCard;
