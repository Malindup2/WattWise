import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

// Mock data for the dashboard
const mockUsageData = {
  currentMonth: 342, // kWh
  previousMonth: 385, // kWh
  saving: 11.2, // percentage
  dailyAvg: 11.4, // kWh per day
  tips: [
    {
      id: '1',
      title: 'Lower thermostat by 2°C',
      savings: 5,
      icon: 'thermometer-outline',
    },
    {
      id: '2',
      title: 'Switch to LED bulbs',
      savings: 8,
      icon: 'bulb-outline',
    },
    {
      id: '3',
      title: 'Unplug idle electronics',
      savings: 4,
      icon: 'power-outline',
    },
    {
      id: '4',
      title: 'Use energy-efficient appliances',
      savings: 10,
      icon: 'home-outline',
    },
  ],
};

interface HomeScreenProps {
  username?: string;
  onLogout?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ username = 'User', onLogout }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [usageData, setUsageData] = useState(mockUsageData);

  // Simulating data fetch on pull refresh
  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      // Randomly adjust some values to simulate live data
      const updatedData = {
        ...mockUsageData,
        currentMonth: Math.floor(mockUsageData.currentMonth * (0.95 + Math.random() * 0.1)),
        dailyAvg: +(mockUsageData.dailyAvg * (0.95 + Math.random() * 0.1)).toFixed(1),
      };
      setUsageData(updatedData);
      setRefreshing(false);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {username}</Text>
          <Text style={styles.headerText}>Welcome to WattWise</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Usage Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Energy Usage</Text>
          <View style={styles.usageSummary}>
            <View style={styles.usageItem}>
              <Text style={styles.usageValue}>{usageData.currentMonth} kWh</Text>
              <Text style={styles.usageLabel}>This Month</Text>
            </View>
            <View style={styles.usageDivider} />
            <View style={styles.usageItem}>
              <Text style={styles.usageValue}>{usageData.dailyAvg} kWh</Text>
              <Text style={styles.usageLabel}>Daily Average</Text>
            </View>
          </View>

          {/* Savings Info */}
          <View style={styles.savingContainer}>
            <View style={styles.savingIconContainer}>
              <Ionicons name="trending-down" size={22} color={Colors.success} />
            </View>
            <Text style={styles.savingText}>
              You're using <Text style={styles.savingValue}>{usageData.saving}%</Text> less energy
              than last month
            </Text>
          </View>
        </View>

        {/* Energy Saving Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Energy Saving Tips</Text>
          <FlatList
            data={usageData.tips}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tipsList}
            renderItem={({ item }) => (
              <View style={styles.tipCard}>
                <View style={styles.tipIconContainer}>
                  <Ionicons name={item.icon as any} size={24} color={Colors.primary} />
                </View>
                <Text style={styles.tipTitle}>{item.title}</Text>
                <Text style={styles.tipSaving}>Save up to {item.savings}%</Text>
              </View>
            )}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="analytics-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Energy Predictor</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="list-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Action Planner</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="help-circle-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Energy Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="people-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Community</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 4,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  usageSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  usageItem: {
    alignItems: 'center',
    flex: 1,
  },
  usageValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  usageDivider: {
    width: 1,
    height: '80%',
    backgroundColor: Colors.border,
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    borderRadius: 8,
    padding: 12,
  },
  savingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  savingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  savingValue: {
    color: Colors.success,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  tipsSection: {
    marginBottom: 20,
  },
  tipsList: {
    paddingRight: 20,
  },
  tipCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 160,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  tipSaving: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

export default HomeScreen;
