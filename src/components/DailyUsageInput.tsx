import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Modal } from 'react-native';
import { DailyUsageService } from '../services/DailyUsageService';
import { LayoutService } from '../services/LayoutService';
import { AuthService } from '../services/firebase';
import { Layout, Room, Device } from '../types/layout';
import { formatTime } from '../utils/energyCalculations';

interface DailyUsageInputProps {
  visible: boolean;
  onClose: () => void;
  onUsageAdded?: () => void;
  preselectedRoom?: any;
  preselectedDevice?: any;
}

interface TimePickerProps {
  visible: boolean;
  initialTime: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
  title: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ visible, initialTime, onConfirm, onCancel, title }) => {
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');

  useEffect(() => {
    if (initialTime) {
      const [hour, minute] = initialTime.split(':');
      setSelectedHour(hour);
      setSelectedMinute(minute);
    }
  }, [initialTime]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.timePickerOverlay}>
        <View style={styles.timePickerContainer}>
          <Text style={styles.timePickerTitle}>{title}</Text>
          
          <View style={styles.timePickerRow}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <ScrollView style={styles.timePickerScroll}>
                {hours.map(hour => (
                  <TouchableOpacity
                    key={hour}
                    style={[styles.timePickerItem, selectedHour === hour && styles.timePickerItemSelected]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text style={[styles.timePickerItemText, selectedHour === hour && styles.timePickerItemTextSelected]}>
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <Text style={styles.timeSeparator}>:</Text>
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <ScrollView style={styles.timePickerScroll}>
                {minutes.map(minute => (
                  <TouchableOpacity
                    key={minute}
                    style={[styles.timePickerItem, selectedMinute === minute && styles.timePickerItemSelected]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text style={[styles.timePickerItemText, selectedMinute === minute && styles.timePickerItemTextSelected]}>
                      {minute}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          
          <View style={styles.timePickerButtons}>
            <TouchableOpacity style={styles.timePickerCancelButton} onPress={onCancel}>
              <Text style={styles.timePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.timePickerConfirmButton} 
              onPress={() => onConfirm(`${selectedHour}:${selectedMinute}`)}
            >
              <Text style={styles.timePickerConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DailyUsageInput: React.FC<DailyUsageInputProps> = ({
  visible,
  onClose,
  onUsageAdded,
  preselectedRoom,
  preselectedDevice,
}) => {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [customDeviceName, setCustomDeviceName] = useState('');
  const [customWattage, setCustomWattage] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [useCustomDevice, setUseCustomDevice] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLayout();
      
      // Set preselected values if provided
      if (preselectedRoom) {
        setSelectedRoom(preselectedRoom);
      }
      if (preselectedDevice) {
        setSelectedDevice(preselectedDevice);
        setUseCustomDevice(false);
      }
    }
  }, [visible, preselectedRoom, preselectedDevice]);

  const loadLayout = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        const userLayout = await LayoutService.getUserLayoutWithRooms(user.uid);
        setLayout(userLayout);
      }
    } catch (error) {
      console.error('Error loading layout:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRoom) {
      Alert.alert('Error', 'Please select a room');
      return;
    }

    let deviceData;
    if (useCustomDevice) {
      if (!customDeviceName.trim() || !customWattage) {
        Alert.alert('Error', 'Please enter device name and wattage');
        return;
      }
      deviceData = {
        deviceId: `custom_${Date.now()}`,
        deviceName: customDeviceName.trim(),
        wattage: parseFloat(customWattage),
        startTime,
        endTime,
      };
    } else {
      if (!selectedDevice) {
        Alert.alert('Error', 'Please select a device or create a custom one');
        return;
      }
      deviceData = {
        deviceId: selectedDevice.deviceId,
        deviceName: selectedDevice.deviceName,
        wattage: selectedDevice.wattage,
        startTime,
        endTime,
      };
    }

    // Validate times
    if (startTime === endTime) {
      Alert.alert('Error', 'Start time and end time cannot be the same');
      return;
    }

    setLoading(true);
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        await DailyUsageService.addUsageEntry(
          user.uid,
          selectedRoom.roomId,
          selectedRoom.roomName,
          deviceData
        );

        Alert.alert('Success', 'Usage entry added successfully');
        onUsageAdded?.();
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Error adding usage entry:', error);
      Alert.alert('Error', 'Failed to add usage entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedRoom(null);
    setSelectedDevice(null);
    setCustomDeviceName('');
    setCustomWattage('');
    setStartTime('08:00');
    setEndTime('18:00');
    setUseCustomDevice(false);
  };

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    setSelectedDevice(null); // Reset device selection when room changes
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Log Device Usage</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Room Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Room</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomList}>
              {layout?.rooms.map((room) => (
                <TouchableOpacity
                  key={room.roomId}
                  style={[
                    styles.roomCard,
                    selectedRoom?.roomId === room.roomId && styles.roomCardSelected,
                  ]}
                  onPress={() => handleRoomSelect(room)}
                >
                  <Ionicons 
                    name="home-outline" 
                    size={20} 
                    color={selectedRoom?.roomId === room.roomId ? '#fff' : Colors.primary} 
                  />
                  <Text style={[
                    styles.roomCardText,
                    selectedRoom?.roomId === room.roomId && styles.roomCardTextSelected,
                  ]}>
                    {room.roomName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Device Selection Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Selection</Text>
            <View style={styles.deviceModeContainer}>
              <TouchableOpacity
                style={[styles.modeButton, !useCustomDevice && styles.modeButtonActive]}
                onPress={() => setUseCustomDevice(false)}
              >
                <Text style={[styles.modeButtonText, !useCustomDevice && styles.modeButtonTextActive]}>
                  Existing Device
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, useCustomDevice && styles.modeButtonActive]}
                onPress={() => setUseCustomDevice(true)}
              >
                <Text style={[styles.modeButtonText, useCustomDevice && styles.modeButtonTextActive]}>
                  Custom Device
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Existing Device Selection */}
          {!useCustomDevice && selectedRoom && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Device</Text>
              {selectedRoom.devices.length > 0 ? (
                <View style={styles.deviceList}>
                  {selectedRoom.devices.map((device) => (
                    <TouchableOpacity
                      key={device.deviceId}
                      style={[
                        styles.deviceCard,
                        selectedDevice?.deviceId === device.deviceId && styles.deviceCardSelected,
                      ]}
                      onPress={() => setSelectedDevice(device)}
                    >
                      <View style={styles.deviceInfo}>
                        <Text style={[
                          styles.deviceName,
                          selectedDevice?.deviceId === device.deviceId && styles.deviceNameSelected,
                        ]}>
                          {device.deviceName}
                        </Text>
                        <Text style={[
                          styles.deviceWattage,
                          selectedDevice?.deviceId === device.deviceId && styles.deviceWattageSelected,
                        ]}>
                          {device.wattage}W
                        </Text>
                      </View>
                      <Ionicons 
                        name="flash-outline" 
                        size={20} 
                        color={selectedDevice?.deviceId === device.deviceId ? '#fff' : Colors.primary} 
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noDevicesContainer}>
                  <Text style={styles.noDevicesText}>No devices in this room</Text>
                  <Text style={styles.noDevicesSubtext}>Add devices to your room layout first, or use custom device option</Text>
                </View>
              )}
            </View>
          )}

          {/* Custom Device Input */}
          {useCustomDevice && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Custom Device Details</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Device Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={customDeviceName}
                  onChangeText={setCustomDeviceName}
                  placeholder="e.g., Living Room Fan"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Wattage (W)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customWattage}
                  onChangeText={setCustomWattage}
                  placeholder="e.g., 60"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage Time</Text>
            <View style={styles.timeContainer}>
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.timeLabel}>Start Time</Text>
                <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.timeLabel}>End Time</Text>
                <Text style={styles.timeValue}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Add Usage Entry</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Time Pickers */}
        <TimePicker
          visible={showStartTimePicker}
          initialTime={startTime}
          title="Select Start Time"
          onConfirm={(time) => {
            setStartTime(time);
            setShowStartTimePicker(false);
          }}
          onCancel={() => setShowStartTimePicker(false)}
        />

        <TimePicker
          visible={showEndTimePicker}
          initialTime={endTime}
          title="Select End Time"
          onConfirm={(time) => {
            setEndTime(time);
            setShowEndTimePicker(false);
          }}
          onCancel={() => setShowEndTimePicker(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  roomList: {
    flexDirection: 'row',
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roomCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roomCardText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  roomCardTextSelected: {
    color: '#fff',
  },
  deviceModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: Colors.primary,
  },
  deviceList: {
    gap: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deviceCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  deviceNameSelected: {
    color: '#fff',
  },
  deviceWattage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  deviceWattageSelected: {
    color: '#E5E7EB',
  },
  noDevicesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDevicesText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  noDevicesSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 20,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Time Picker Styles
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    minWidth: 300,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  timePickerScroll: {
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  timePickerItem: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  timePickerItemSelected: {
    backgroundColor: Colors.primary,
  },
  timePickerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  timePickerItemTextSelected: {
    color: '#fff',
  },
  picker: {
    width: 80,
    height: 120,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginHorizontal: 16,
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  timePickerCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  timePickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  timePickerConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});

export default DailyUsageInput;