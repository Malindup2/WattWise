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
import {
  DEVICE_PRESETS,
  HOUSEHOLD_DEVICE_PRESETS,
  INDUSTRIAL_DEVICE_PRESETS,
} from '../../constants/DeviceTypes';
import { Colors } from '../../constants/Colors';

interface AddEditDeviceModalProps {
  visible: boolean;
  device?: Device | null;
  layoutType?: 'household' | 'industrial';
  onSave: (deviceData: {
    deviceName: string;
    wattage: number;
  }) => Promise<void>;
  onClose: () => void;
}

const AddEditDeviceModal: React.FC<AddEditDeviceModalProps> = ({
  visible,
  device,
  layoutType = 'household',
  onSave,
  onClose,
}) => {
  const [deviceName, setDeviceName] = useState('');
  const [wattage, setWattage] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const isEditing = !!device;

  // Get the appropriate device presets based on layout type
  const devicePresets =
    layoutType === 'industrial' ? INDUSTRIAL_DEVICE_PRESETS : HOUSEHOLD_DEVICE_PRESETS;

  // Initialize form when modal opens or device changes
  useEffect(() => {
    if (visible) {
      if (device) {
        setDeviceName(device.deviceName);
        setWattage(device.wattage.toString());
        setSelectedPreset(null);
      } else {
        resetForm();
      }
    }
  }, [visible, device]);

  const resetForm = () => {
    setDeviceName('');
    setWattage('');
    setSelectedPreset(null);
  };

  const handlePresetSelect = (
    preset: (typeof HOUSEHOLD_DEVICE_PRESETS | typeof INDUSTRIAL_DEVICE_PRESETS)[0]
  ) => {
    setDeviceName(preset.name);
    setWattage(preset.wattage.toString());
    setSelectedPreset(preset.name);
  };

  const validateForm = (): string | null => {
    if (!deviceName.trim()) {
      return 'Please enter a device name';
    }
    if (!wattage.trim() || isNaN(Number(wattage)) || Number(wattage) <= 0) {
      return 'Please enter a valid wattage';
    }

    // Different wattage limits based on layout type
    const maxWattage = layoutType === 'industrial' ? 50000 : 10000;
    const layoutTypeName =
      layoutType === 'industrial' ? 'industrial equipment' : 'household devices';

    if (Number(wattage) > maxWattage) {
      return `Wattage seems too high for ${layoutTypeName}. Maximum allowed: ${maxWattage.toLocaleString()}W`;
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
      });
      resetForm();
    } catch (error) {
      console.error('Error saving device:', error);
    } finally {
      setSaving(false);
    }
  };

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
          <Text style={styles.modalTitle}>{isEditing ? 'Edit Device' : 'Add Device'}</Text>
          <TouchableOpacity
            style={[styles.modalSaveButton, { opacity: saving ? 0.5 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.modalSaveText}>{isEditing ? 'Update' : 'Add'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Device Presets (only for new devices) */}
          {!isEditing && (
            <View style={styles.presetsContainer}>
              <Text style={styles.sectionTitle}>
                {layoutType === 'industrial' ? 'Industrial Equipment' : 'Common Devices'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsScroll}
              >
                {devicePresets.slice(0, 10).map(preset => (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetCard,
                      selectedPreset === preset.name && styles.presetCardSelected,
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
                    <Text
                      style={[
                        styles.presetName,
                        selectedPreset === preset.name && styles.presetNameSelected,
                      ]}
                    >
                      {preset.name}
                    </Text>
                    <Text
                      style={[
                        styles.presetWattage,
                        selectedPreset === preset.name && styles.presetWattageSelected,
                      ]}
                    >
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
              placeholder={layoutType === 'industrial' ? 'e.g., 15000' : 'e.g., 100'}
              value={wattage}
              onChangeText={setWattage}
              keyboardType="numeric"
              maxLength={6}
            />
            <Text style={styles.inputHint}>
              {layoutType === 'industrial'
                ? 'Industrial equipment wattage (max: 50,000W). Check equipment specifications.'
                : 'Check the device label or manual for wattage information (max: 10,000W)'}
            </Text>
          </View>

        </ScrollView>
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
});

export default AddEditDeviceModal;
