import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { DailyUsageService, DailyUsageSummary, DailyDeviceEntry } from '../services/DailyUsageService';
import { AuthService } from '../services/firebase';
import { formatTime } from '../utils/energyCalculations';
import AnimatedCounter from './AnimatedCounter';

interface DailyUsageDisplayProps {
  date?: string; // YYYY-MM-DD format, defaults to today
  onAddUsage?: () => void;
}

const DailyUsageDisplay: React.FC<DailyUsageDisplayProps> = ({ 
  date = new Date().toISOString().split('T')[0],
  onAddUsage 
}) => {
  const [dailyUsage, setDailyUsage] = useState<DailyUsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDailyUsage();
  }, [date]);

  const loadDailyUsage = async () => {
    setLoading(true);
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        const usage = await DailyUsageService.getDailyUsage(user.uid, date);
        setDailyUsage(usage);
      }
    } catch (error) {
      console.error('Error loading daily usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDailyUsage();
    setRefreshing(false);
  };

  const handleDeleteEntry = async (roomId: string, entryId: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this usage entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = AuthService.getCurrentUser();
              if (user) {
                await DailyUsageService.deleteUsageEntry(user.uid, date, roomId, entryId);
                await loadDailyUsage();
              }
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const renderUsageEntry = (entry: DailyDeviceEntry, roomId: string) => (
    <View key={entry.entryId} style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryInfo}>
          <Text style={styles.deviceName}>{entry.deviceName}</Text>
          <Text style={styles.deviceWattage}>{entry.wattage}W</Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteEntry(roomId, entry.entryId)}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.entryDetails}>
        <View style={styles.timeRange}>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.timeText}>
            {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
          </Text>
          <Text style={styles.durationText}>
            ({entry.duration.toFixed(1)}h)
          </Text>
        </View>
        
        <View style={styles.powerUsage}>
          <Ionicons name="flash-outline" size={14} color={Colors.primary} />
          <Text style={styles.powerText}>
            {entry.powerUsed.toFixed(2)} kWh
          </Text>
        </View>
      </View>
    </View>
  );

  const renderRoomUsage = (room: any) => (
    <View key={room.roomId} style={styles.roomCard}>
      <View style={styles.roomHeader}>
        <View style={styles.roomInfo}>
          <Ionicons name="home-outline" size={20} color={Colors.primary} />
          <Text style={styles.roomName}>{room.roomName}</Text>
        </View>
        <View style={styles.roomTotal}>
          <Text style={styles.roomTotalText}>
            {room.totalPowerUsed.toFixed(2)} kWh
          </Text>
        </View>
      </View>
      
      <View style={styles.entriesContainer}>
        {room.entries.map((entry: DailyDeviceEntry) => 
          renderUsageEntry(entry, room.roomId)
        )}
      </View>
    </View>
  );

  if (loading && !dailyUsage) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading usage data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.dateTitle}>{formatDate(date)}</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddUsage}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add Usage</Text>
        </TouchableOpacity>
      </View>

      {dailyUsage ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Daily Summary</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="flash" size={24} color={Colors.primary} />
              <AnimatedCounter
                value={dailyUsage.totalDailyUsage}
                style={styles.summaryValue}
                suffix=" kWh"
                decimals={2}
              />
            </View>
            <Text style={styles.summarySubtext}>
              Total energy consumption for {formatDate(date).toLowerCase()}
            </Text>
          </View>

          <View style={styles.roomsContainer}>
            <Text style={styles.sectionTitle}>Room Usage Breakdown</Text>
            {dailyUsage.rooms.map(renderRoomUsage)}
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="battery-dead-outline" size={48} color={Colors.textLight} />
          <Text style={styles.noDataTitle}>No Usage Data</Text>
          <Text style={styles.noDataText}>
            No energy usage recorded for {formatDate(date).toLowerCase()}.
          </Text>
          <TouchableOpacity style={styles.addFirstButton} onPress={onAddUsage}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addFirstButtonText}>Add First Entry</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  summaryCard: {
    margin: 20,
    padding: 20,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  summarySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  roomsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.lightGray,
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  roomTotal: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roomTotalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  entriesContainer: {
    padding: 16,
    gap: 12,
  },
  entryCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entryInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  deviceWattage: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  deleteButton: {
    padding: 4,
  },
  entryDetails: {
    gap: 6,
  },
  timeRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  durationText: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  powerUsage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  powerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DailyUsageDisplay;