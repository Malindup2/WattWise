import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Device } from '../../types/layout';
import { DEVICE_PRESETS } from '../../constants/DeviceTypes';
import { formatTime, calculateDuration } from '../../utils/energyCalculations';
import { Colors } from '../../constants/Colors';

interface AddEditDeviceModalProps {
  visible: boolean;
  device?: Device | null;
  onSave: (deviceData: {
    deviceName: string;
    wattage: number;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  onClose: () => void;
}

const AddEditDeviceModal: React.FC<AddEditDeviceModalProps> = ({
  visible,
  device,
  onSave,
  onClose,
}) => {
  const [deviceName, setDeviceName] = useState('');
  const [wattage, setWattage] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('23:00');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [editingTimeType, setEditingTimeType] = useState<'start' | 'end'>('start');
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const isEditing = !!device;

  // Initialize form when modal opens or device changes
  useEffect(() => {
    if (visible) {
      if (device) {
        setDeviceName(device.deviceName);
        setWattage(device.wattage.toString());
        setStartTime(device.usage[0]?.start || '19:00');
        setEndTime(device.usage[0]?.end || '23:00');
        setSelectedPreset(null);
      } else {
        resetForm();
      }
    }
  }, [visible, device]);

  const resetForm = () => {
    setDeviceName('');
    setWattage('');
    setStartTime('19:00');
    setEndTime('23:00');
    setSelectedPreset(null);
  };

  const handlePresetSelect = (preset: typeof DEVICE_PRESETS[0]) => {
    setDeviceName(preset.name);
    setWattage(preset.wattage.toString());
    setSelectedPreset(preset.name);
  };

  const openTimeSelector = (type: 'start' | 'end') => {
    setEditingTimeType(type);
    setShowTimeModal(true);
  };

  const handleTimeSelect = (time: string) => {
    if (editingTimeType === 'start') {
      setStartTime(time);
    } else {
      setEndTime(time);
    }
    setShowTimeModal(false);
  };

  const validateForm = (): string | null => {
    if (!deviceName.trim()) {
      return 'Please enter a device name';
    }
    if (!wattage.trim() || isNaN(Number(wattage)) || Number(wattage) <= 0) {
      return 'Please enter a valid wattage';
    }
    if (Number(wattage) > 10000) {
      return 'Wattage seems too high. Please check the value.';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        deviceName: deviceName.trim(),
        wattage: Number(wattage),
        startTime,
        endTime,
      });
      resetForm();
    } catch (error) {
      console.error('Error saving device:', error);
    } finally {
      setSaving(false);
    }
  };

  const totalHours = calculateDuration(startTime, endTime);
  const dailyConsumption = (Number(wattage) || 0) * totalHours / 1000; // kWh

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
          <Text style={styles.modalTitle}>
            {isEditing ? 'Edit Device' : 'Add Device'}
          </Text>
          <TouchableOpacity
            style={[styles.modalSaveButton, { opacity: saving ? 0.5 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.modalSaveText}>
                {isEditing ? 'Update' : 'Add'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Device Presets (only for new devices) */}
          {!isEditing && (
            <View style={styles.presetsContainer}>
              <Text style={styles.sectionTitle}>Common Devices</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsScroll}
              >
                {DEVICE_PRESETS.slice(0, 10).map((preset) => (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetCard,
                      selectedPreset === preset.name && styles.presetCardSelected
                    ]}
                    onPress={() => handlePresetSelect(preset)}
                  >
                    <View style={styles.presetIcon}>
                      <Ionicons 
                        name={preset.icon as keyof typeof Ionicons.glyphMap} 
                        size={20} 
                        color={selectedPreset === preset.name ? Colors.primary : '#64748b'} 
                      />
                    </View>
                    <Text style={[
                      styles.presetName,
                      selectedPreset === preset.name && styles.presetNameSelected
                    ]}>
                      {preset.name}
                    </Text>
                    <Text style={[
                      styles.presetWattage,
                      selectedPreset === preset.name && styles.presetWattageSelected
                    ]}>
                      {preset.wattage}W
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Device Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Device Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Living Room TV"
              value={deviceName}
              onChangeText={setDeviceName}
              maxLength={50}
            />
          </View>

          {/* Wattage */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Power Consumption (Watts)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 100"
              value={wattage}
              onChangeText={setWattage}
              keyboardType="numeric"
              maxLength={5}
            />
            <Text style={styles.inputHint}>
              Check the device label or manual for wattage information
            </Text>
          </View>

          {/* Usage Time */}
          <View style={styles.timeContainer}>
            <Text style={styles.sectionTitle}>Usage Schedule</Text>
            
            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimeSelector('start')}
                >
                  <Ionicons name="time-outline" size={20} color="#64748b" />
                  <Text style={styles.timeText}>{formatTime(startTime)}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.timeArrow}>
                <Ionicons name="arrow-forward" size={20} color="#64748b" />
              </View>
              
              <View style={styles.timeInput}>
                <Text style={styles.timeLabel}>End Time</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimeSelector('end')}
                >
                  <Ionicons name="time-outline" size={20} color="#64748b" />
                  <Text style={styles.timeText}>{formatTime(endTime)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Usage Summary */}
          {wattage && Number(wattage) > 0 && (
            <View style={styles.summaryContainer}>
              <Text style={styles.sectionTitle}>Daily Usage Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <Text style={styles.summaryValue}>{totalHours} hours</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Daily Consumption</Text>
                  <Text style={styles.summaryValue}>
                    {dailyConsumption.toFixed(2)} kWh
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Custom Time Selector Modal */}
        <Modal
          visible={showTimeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimeModal(false)}
        >
          <View style={styles.timeModalOverlay}>
            <View style={styles.timeModalContent}>
              <Text style={styles.timeModalTitle}>
                Select {editingTimeType === 'start' ? 'Start' : 'End'} Time
              </Text>
              
              <ScrollView style={styles.timeOptionsContainer}>
                {Array.from({ length: 24 }, (_, hour) => 
                  ['00', '30'].map(minute => {
                    const timeValue = `${hour.toString().padStart(2, '0')}:${minute}`;
                    const isSelected = (editingTimeType === 'start' ? startTime : endTime) === timeValue;
                    
                    return (
                      <TouchableOpacity
                        key={timeValue}
                        style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
                        onPress={() => handleTimeSelect(timeValue)}
                      >
                        <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}>
                          {formatTime(timeValue)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ).flat()}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.timeModalCloseButton}
                onPress={() => setShowTimeModal(false)}
              >
                <Text style={styles.timeModalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  modalSaveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  modalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  presetsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  presetsScroll: {
    paddingRight: 20,
  },
  presetCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(73, 176, 45, 0.05)',
  },
  presetIcon: {
    marginBottom: 8,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
  presetNameSelected: {
    color: Colors.primary,
  },
  presetWattage: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  presetWattageSelected: {
    color: Colors.primary,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  timeContainer: {
    marginBottom: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeText: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 8,
    fontWeight: '500',
  },
  timeArrow: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Time Modal Styles
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  timeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  timeOptionsContainer: {
    maxHeight: 300,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  timeOptionSelected: {
    backgroundColor: Colors.primary,
  },
  timeOptionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  timeModalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
  },
  timeModalCloseText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default AddEditDeviceModal;