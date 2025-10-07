import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthService } from '../services/firebase';
import { LayoutService } from '../services/LayoutService';
import { Layout, Room } from '../types/layout';
import { ROOM_ICONS } from '../constants/DeviceTypes';
import { calculateRoomEnergyConsumption } from '../utils/energyCalculations';
import { AlertModal } from '../components/AlertModal';
import { Colors } from '../constants/Colors';

const LayoutSummaryScreen = () => {
  const navigation = useNavigation();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const loadLayout = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        const userLayout = await LayoutService.getUserLayoutWithRooms(user.uid);
        setLayout(userLayout);
      }
    } catch (error) {
      console.error('Error loading layout:', error);
      showAlert('error', 'Error', 'Failed to load layout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) {
      showAlert('warning', 'Invalid Input', 'Please enter a room name.');
      return;
    }

    setSaving(true);
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        await LayoutService.addRoom(user.uid, newRoomName.trim());
        await loadLayout();
        setNewRoomName('');
        setShowAddRoomModal(false);
        showAlert('success', 'Room Added', `${newRoomName} has been added to your layout.`);
      }
    } catch (error) {
      console.error('Error adding room:', error);
      showAlert('error', 'Error', 'Failed to add room. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoomPress = (room: Room) => {
    // TODO: Navigate to RoomDetails screen when navigation is set up
    console.log('Navigate to room details:', room.roomName);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLayout();
    setRefreshing(false);
  };

  useEffect(() => {
    loadLayout();
  }, []);

  const getRoomIcon = (roomName: string): keyof typeof Ionicons.glyphMap => {
    return (ROOM_ICONS[roomName as keyof typeof ROOM_ICONS] || ROOM_ICONS.default) as keyof typeof Ionicons.glyphMap;
  };

  const totalEnergyConsumption = layout?.rooms?.reduce((total, room) => {
    return total + calculateRoomEnergyConsumption(room.devices || []);
  }, 0) || 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your layout...</Text>
      </View>
    );
  }

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
          <Text style={styles.title}>{layout?.layoutName || 'My Home'}</Text>
          <Text style={styles.subtitle}>
            {layout?.area} sq ft • {layout?.rooms?.length || 0} rooms
          </Text>
          {totalEnergyConsumption > 0 && (
            <View style={styles.energyBadge}>
              <Ionicons name="flash" size={16} color={Colors.primary} />
              <Text style={styles.energyText}>
                {totalEnergyConsumption.toFixed(2)} kWh/day
              </Text>
            </View>
          )}
        </View>

        {/* Rooms Grid */}
        <View style={styles.roomsContainer}>
          <Text style={styles.sectionTitle}>Rooms & Spaces</Text>
          <View style={styles.roomsGrid}>
            {layout?.rooms?.map((room) => {
              const roomEnergy = calculateRoomEnergyConsumption(room.devices || []);
              return (
                <TouchableOpacity
                  key={room.roomId}
                  style={styles.roomCard}
                  onPress={() => handleRoomPress(room)}
                >
                  <View style={styles.roomHeader}>
                    <View style={styles.roomIconContainer}>
                      <Ionicons 
                        name={getRoomIcon(room.roomName)} 
                        size={24} 
                        color={Colors.primary} 
                      />
                    </View>
                    <View style={styles.roomInfo}>
                      <Text style={styles.roomName}>{room.roomName}</Text>
                      <Text style={styles.deviceCount}>
                        {room.devices?.length || 0} devices
                      </Text>
                      {roomEnergy > 0 && (
                        <Text style={styles.roomEnergy}>
                          {roomEnergy.toFixed(2)} kWh/day
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                  </View>
                </TouchableOpacity>
              );
            })}
            
            {/* Add Room Button */}
            <TouchableOpacity
              style={styles.addRoomCard}
              onPress={() => setShowAddRoomModal(true)}
            >
              <Ionicons name="add-circle-outline" size={32} color={Colors.primary} />
              <Text style={styles.addRoomText}>Add Room</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty State */}
        {(!layout?.rooms || layout.rooms.length === 0) && (
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Rooms Added</Text>
            <Text style={styles.emptyText}>
              Start by adding rooms to your home layout to track energy usage.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddRoomModal(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Add Your First Room</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Room Modal */}
      <Modal
        visible={showAddRoomModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddRoomModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowAddRoomModal(false);
                setNewRoomName('');
              }}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Room</Text>
            <TouchableOpacity
              style={[styles.modalSaveButton, { opacity: saving ? 0.5 : 1 }]}
              onPress={handleAddRoom}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSaveText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Room Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Master Bedroom, Kitchen"
              value={newRoomName}
              onChangeText={setNewRoomName}
              autoFocus
              maxLength={30}
            />
            
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Common Rooms</Text>
              <View style={styles.suggestionsGrid}>
                {['Master Bedroom', 'Kitchen', 'Living Room', 'Bathroom', 'Dining Room', 'Study'].map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => setNewRoomName(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  energyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  energyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 4,
  },
  roomsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  roomsGrid: {
    gap: 16,
  },
  roomCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  deviceCount: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  roomEnergy: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  addRoomCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    minHeight: 100,
  },
  addRoomText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
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
  // Modal Styles
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
    minWidth: 60,
    alignItems: 'center',
  },
  modalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
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
    marginBottom: 24,
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default LayoutSummaryScreen;