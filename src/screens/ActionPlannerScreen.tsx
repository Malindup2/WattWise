import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, Dimensions, Animated } from 'react-native';
import { Colors } from '../constants/Colors';
import { Task, GoalSection as GoalSectionType } from '../types/actionPlanner';
import GoalCard from '../components/actionPlanner/GoalCard';
import ProgressBar from '../components/actionPlanner/ProgressBar';
import EnergyEstimate from '../components/actionPlanner/EnergyEstimate';
import ReminderModal from '../components/actionPlanner/ReminderModal';
import { generateTasks } from '../services/blueprintService';
import { UserProfile } from '../types/userProfile';
import { Calendar } from 'react-native-calendars';
import type { MarkedDates } from 'react-native-calendars/src/types';

const screenWidth = Dimensions.get('window').width;

type GoalType = 'short' | 'medium' | 'long';

const ActionPlannerScreen: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [reminderTask, setReminderTask] = useState<Task | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadTasks = () => {
      const userProfile: UserProfile = {
        householdSize: 4,
        appliances: ['AC', 'Fridge', 'Washer'],
        energyUsage: 350,
      };
      const personalizedTasks = generateTasks(userProfile);
      setTasks(personalizedTasks);
      checkReminders(personalizedTasks);

      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    };
    loadTasks();
  }, []);

  const toggleComplete = (id: string) => {
    setTasks(prev => {
      const updated = prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t));
      checkReminders(updated);
      return updated;
    });
  };

  const handleMarkDone = (id: string) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: true } : t)));
  };

  const checkReminders = (tasksList: Task[]) => {
    const today = new Date().toISOString().split('T')[0];
    const taskToRemind = tasksList.find(task => task.reminderDate === today && !task.completed);
    if (taskToRemind) {
      setReminderTask(taskToRemind);
      setModalVisible(true);
    }
  };

  // ✅ Progress and summary
  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = tasks.length ? (completedTasks / tasks.length) * 100 : 0;
  const totalEnergy = tasks.reduce((sum, t) => sum + (t.energySaved || 0), 0);
  const totalMoney = tasks.reduce((sum, t) => sum + (t.moneySaved || 0), 0);

  const titleMap: Record<GoalType, string> = {
    short: 'Short-Term Goals',
    medium: 'Medium-Term Goals',
    long: 'Long-Term Goals',
  };

  // ✅ Group tasks into sections
  const goalSections: GoalSectionType[] = (['short', 'medium', 'long'] as GoalType[]).map(type => {
    const sectionTasks = tasks
      .filter(t => t.goalType === type)
      .sort((a, b) => ((b.energySaved ?? 0) + (b.moneySaved ?? 0)) - ((a.energySaved ?? 0) + (a.moneySaved ?? 0)));
    return {
      type,
      title: titleMap[type],
      tasks: sectionTasks,
    };
  });

  const getTimelineColor = (type: GoalType) => {
    switch (type) {
      case 'short': return Colors.success;
      case 'medium': return Colors.warning;
      case 'long': return Colors.error;
    }
  };

  const getIcon = (type: GoalType) => {
    switch (type) {
      case 'short': return '⚡';
      case 'medium': return '💡';
      case 'long': return '🏠';
    }
  };

  // ✅ Calendar date markings
  const markedDates: MarkedDates = {};
  tasks.forEach(task => {
    if (task.scheduledDate) {
      markedDates[task.scheduledDate] = {
        marked: true,
        dotColor: task.completed ? Colors.success : Colors.warning,
        selected: false,
      };
    }
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Energy Roadmap</Text>
        <Text style={styles.subtitle}>Step-by-step energy-saving actions</Text>

        <ProgressBar progress={progress} />
        <Text style={styles.progressText}>{Math.round(progress)}% Completed</Text>

        <EnergyEstimate energy={totalEnergy} money={totalMoney} />

        {/* ✅ Mini Calendar View */}
        <View style={styles.calendarContainer}>
          <Calendar
            markingType="dot"
            markedDates={markedDates}
            theme={{
              todayTextColor: Colors.primary,
              dotColor: Colors.warning,
              selectedDayBackgroundColor: Colors.success,
              monthTextColor: Colors.textPrimary,
              dayTextColor: Colors.textSecondary,
              arrowColor: Colors.primary,
            }}
          />
        </View>

        {/* ✅ Animated Goal Timeline */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {goalSections.map((section, index) => {
            const isLeft = index % 2 === 0;
            const color = getTimelineColor(section.type);

            return (
              <View key={section.type} style={styles.timelineItem}>
                <View style={styles.timelineLineContainer}>
                  {index !== goalSections.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: color }]} />
                  )}
                  <View style={[styles.timelineDot, { backgroundColor: color }]}>
                    <Text style={styles.dotIcon}>{getIcon(section.type)}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.cardWrapper,
                    isLeft ? { marginRight: screenWidth / 4 } : { marginLeft: screenWidth / 4 },
                  ]}
                >
                  <GoalCard section={section} onToggleComplete={toggleComplete} />
                </View>
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>

      {reminderTask && (
        <ReminderModal
          visible={modalVisible}
          task={reminderTask}
          onClose={() => setModalVisible(false)}
          onMarkDone={handleMarkDone}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 16 },
  progressText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 12 },

  calendarContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },

  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 40 },
  timelineLineContainer: { width: 40, alignItems: 'center' },
  timelineLine: { position: 'absolute', top: 16, bottom: 0, width: 4, borderRadius: 2 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotIcon: { fontSize: 12, color: Colors.textOnPrimary },
  cardWrapper: { flex: 1 },
});

export default ActionPlannerScreen;
