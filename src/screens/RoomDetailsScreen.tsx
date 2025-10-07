import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthService } from '../services/firebase';
import { LayoutService } from '../services/LayoutService';
import { Room, Device } from '../types/layout';
import { DEVICE_PRESETS } from '../constants/DeviceTypes';
import { formatTime, calculatePowerUsage } from '../utils/energyCalculations';
import { AlertModal } from '../components/AlertModal';
import { Colors } from '../constants/Colors';
import { AddEditDeviceModal } from '../components/modals';

interface RoomDetailsProps {
  route: {
    params: {
      room: Room;
      layoutId: string;
    };
  };
}

const RoomDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { room: initialRoom } = (route.params as any) || {};
  
  const [room, setRoom] = useState<Room>(initialRoom);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  
  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const loadRoomData = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        const layout = await LayoutService.getUserLayoutWithRooms(user.uid);
        const updatedRoom = layout?.rooms?.find(r => r.roomId === room.roomId);
        if (updatedRoom) {
          setRoom(updatedRoom);
        }
      }
    } catch (error) {
      console.error('Error loading room data:', error);
      showAlert('error', 'Error', 'Failed to load room data. Please try again.');
    }
  };

  const handleAddDevice = async (deviceData: {
    deviceName: string;
    wattage: number;
    startTime: string;
    endTime: string;
  }) => {
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        await LayoutService.addDevice(user.uid, room.roomId, deviceData);
        await loadRoomData();
        setShowAddDeviceModal(false);
        showAlert('success', 'Device Added', `${deviceData.deviceName} has been added to ${room.roomName}.`);
      }
    } catch (error) {
      console.error('Error adding device:', error);
      showAlert('error', 'Error', 'Failed to add device. Please try again.');
    }
  };

  const handleEditDevice = async (deviceData: {
    deviceName: string;
    wattage: number;
    startTime: string;
    endTime: string;
  }) => {
    if (!editingDevice) return;
    
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        await LayoutService.updateDevice(user.uid, room.roomId, editingDevice.deviceId, deviceData);
        await loadRoomData();
        setEditingDevice(null);
        showAlert('success', 'Device Updated', `${deviceData.deviceName} has been updated.`);
      }
    } catch (error) {
      console.error('Error updating device:', error);
      showAlert('error', 'Error', 'Failed to update device. Please try again.');
    }
  };

  const handleDeleteDevice = async (device: Device) => {
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        await LayoutService.deleteDevice(user.uid, room.roomId, device.deviceId);
        await loadRoomData();
        showAlert('success', 'Device Removed', `${device.deviceName} has been removed from ${room.roomName}.`);
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      showAlert('error', 'Error', 'Failed to remove device. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoomData();
    setRefreshing(false);
  };

  const getDeviceIcon = (deviceName: string): keyof typeof Ionicons.glyphMap => {
    const preset = DEVICE_PRESETS.find(p => 
      p.name.toLowerCase() === deviceName.toLowerCase() ||
      deviceName.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    );
    return (preset?.icon as keyof typeof Ionicons.glyphMap) || 'flash-outline';
  };

  const totalRoomConsumption = room.devices?.reduce((total, device) => {
    return total + (device.totalPowerUsed || 0);
  }, 0) || 0;

  const totalDevices = room.devices?.length || 0;

  return (
    <View style={styles.container}>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{room.roomName}</Text>
            <Text style={styles.subtitle}>
              {totalDevices} devices • {totalRoomConsumption.toFixed(2)} kWh/day
            </Text>
          </View>
        </View>

        {/* Energy Summary */}
        {totalRoomConsumption > 0 && (
          <View style={styles.energySummary}>
            <View style={styles.energyCard}>
              <View style={styles.energyIcon}>
                <Ionicons name="flash" size={24} color={Colors.primary} />
              </View>
              <View style={styles.energyInfo}>
                <Text style={styles.energyValue}>{totalRoomConsumption.toFixed(2)} kWh</Text>
                <Text style={styles.energyLabel}>Daily Consumption</Text>
              </View>
            </View>
          </View>
        )}

        {/* Devices List */}
        <View style={styles.devicesContainer}>
          <View style={styles.devicesHeader}>
            <Text style={styles.sectionTitle}>Devices</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddDeviceModal(true)}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
              <Text style={styles.addButtonText}>Add Device</Text>
            </TouchableOpacity>
          </View>

          {room.devices && room.devices.length > 0 ? (
            <View style={styles.devicesList}>
              {room.devices.map((device) => (
                <View key={device.deviceId} style={styles.deviceCard}>
                  <View style={styles.deviceHeader}>
                    <View style={styles.deviceIconContainer}>
                      <Ionicons 
                        name={getDeviceIcon(device.deviceName)} 
                        size={24} 
                        color={Colors.primary} 
                      />
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{device.deviceName}</Text>
                      <Text style={styles.deviceWattage}>{device.wattage}W</Text>
                    </View>
                    <View style={styles.deviceActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setEditingDevice(device)}
                      >
                        <Ionicons name="create-outline" size={20} color="#64748b" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteDevice(device)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {device.usage && device.usage.length > 0 && (
                    <View style={styles.usageContainer}>
                      {device.usage.map((usage, index) => (
                        <View key={index} style={styles.usageItem}>
                          <View style={styles.usageTime}>
                            <Ionicons name="time-outline" size={16} color="#64748b" />
                            <Text style={styles.usageText}>
                              {formatTime(usage.start)} → {formatTime(usage.end)}
                            </Text>
                          </View>
                          <Text style={styles.usageHours}>
                            {usage.totalHours}h ({(device.totalPowerUsed || 0).toFixed(2)} kWh)
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyDevices}>
              <Ionicons name="flash-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No Devices Added</Text>
              <Text style={styles.emptyText}>
                Start tracking energy usage by adding devices to this room.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowAddDeviceModal(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.emptyButtonText}>Add Your First Device</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Device Modal */}
      <AddEditDeviceModal
        visible={showAddDeviceModal || !!editingDevice}
        device={editingDevice}
        onSave={editingDevice ? handleEditDevice : handleAddDevice}
        onClose={() => {
          setShowAddDeviceModal(false);
          setEditingDevice(null);
        }}
      />

      <AlertModal
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  energySummary: {
    padding: 20,
  },
  energyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  energyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  energyInfo: {
    flex: 1,
  },
  energyValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  energyLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  devicesContainer: {
    padding: 20,
  },
  devicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  devicesList: {
    gap: 12,
  },
  deviceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  deviceWattage: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usageContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  usageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  usageHours: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyDevices: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RoomDetailsScreen;