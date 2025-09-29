import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabKey = 'Home' | 'PredictiveModel' | 'ActionPlanner' | 'Forum' | 'Quizzes';

const ICONS: Record<TabKey, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  PredictiveModel: 'analytics-outline',
  ActionPlanner: 'list-outline',
  Forum: 'chatbubbles-outline',
  Quizzes: 'help-circle-outline',
};

const LABELS: Record<TabKey, string> = {
  Home: 'Home',
  PredictiveModel: 'Predictive',
  ActionPlanner: 'Planner',
  Forum: 'Forum',
  Quizzes: 'Quizzes',
};

const ORDER: TabKey[] = ['Home', 'PredictiveModel', 'ActionPlanner', 'Forum', 'Quizzes'];

const BottomMenu: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const current = route.name as TabKey;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      {ORDER.map(key => {
        const isActive = current === key;
        return (
          <TouchableOpacity
            key={key}
            style={styles.item}
            onPress={() => {
              if (!isActive) navigation.navigate(key);
            }}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={LABELS[key]}
          >
            <Ionicons
              name={ICONS[key]}
              size={24}
              color={isActive ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{LABELS[key]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 6,
  },
  item: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 6 },
  label: { fontSize: 12, color: Colors.textSecondary },
  labelActive: { color: Colors.primary, fontWeight: '700' },
});

export default BottomMenu;


