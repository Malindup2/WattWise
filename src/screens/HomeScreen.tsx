import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AnimatedCounter from '../components/AnimatedCounter';
import { Colors } from '../constants/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthService } from '../services/firebase';
import { User } from 'firebase/auth';
import { FirestoreService } from '../services/firebase';
import { LayoutService } from '../services/LayoutService';
import { AlertModal } from '../components/AlertModal';
import { AddEditDeviceModal } from '../components/modals';
import { DEVICE_PRESETS, ROOM_ICONS } from '../constants/DeviceTypes';
import { Room } from '../types/layout';

// Extended layout type to handle both old and new layout structures
interface ExtendedLayout {
  id?: string;
  name?: string;           // for blueprint layouts
  layoutName?: string;     // for new layout structure
  imageUrl?: string;
  sections?: { name: string; count: number; }[];
  rooms?: Room[];
  area?: number;
  type?: string;
  createdAt?: any;
}
import {
  calculateDuration,
  calculatePowerUsage,
  calculateRoomEnergyConsumption,
  formatTime,
} from '../utils/energyCalculations';
import FloatingChatbot from '../components/FloatingChatbot';

const { width, height } = Dimensions.get('window');
const chartWidth = width - 60;

const HomeScreen = () => {
  const navigation = useNavigation();

  const [user, setUser] = useState<User | null>(null);
  const [userLayout, setUserLayout] = useState<ExtendedLayout | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [editingLayout, setEditingLayout] = useState<any>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // Device management state
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const [energyData, setEnergyData] = useState({
    totalConsumption: 2847,
    currentUsage: 3.2,
    monthlyBill: 284.5,
    efficiency: 87,
    predictions: [2.1, 2.8, 3.2, 2.9, 3.5, 4.1, 3.8],
    categories: {
      'Heat/Cool': 45,
      Appliances: 23,
      Lighting: 12,
      Electronics: 15,
      Other: 5,
    },
  });

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Week');

  const loadEnergyData = async () => {
    try {
      setTimeout(() => {
        setEnergyData(prev => ({
          ...prev,
          currentUsage: Math.random() * 5 + 2,
          efficiency: Math.floor(Math.random() * 15 + 80),
        }));
      }, 1000);
    } catch (error) {
      console.error('Error loading energy data:', error);
    }
  };

  const loadUserLayout = async () => {
    setLoadingLayout(true);
    try {
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        console.log('Loading layout for user:', currentUser.uid);
        // Try the new enhanced layout first
        const enhancedLayout = await LayoutService.getUserLayoutWithRooms(currentUser.uid);
        if (enhancedLayout) {
          console.log('Enhanced layout loaded:', enhancedLayout);
          
          // Convert new layout structure to include sections for backward compatibility
          const layoutWithSections = { ...enhancedLayout } as any;
          
          if (!layoutWithSections.sections && enhancedLayout.rooms) {
            // Convert rooms back to sections for display
            const sectionMap = new Map();
            console.log('Converting rooms to sections. Rooms:', enhancedLayout.rooms);
            
            enhancedLayout.rooms.forEach((room: any) => {
              const baseName = room.roomName.replace(/\s+\d+$/, ''); // Remove numbers at end
              if (sectionMap.has(baseName)) {
                sectionMap.set(baseName, sectionMap.get(baseName) + 1);
              } else {
                sectionMap.set(baseName, 1);
              }
            });
            
            layoutWithSections.sections = Array.from(sectionMap.entries()).map(([name, count]) => ({
              name,
              count
            }));
            
            console.log('Converted sections:', layoutWithSections.sections);
          }
          
          setUserLayout(layoutWithSections);
          console.log('Final layout with sections:', {
            sections: layoutWithSections.sections,
            hasLayout: !!layoutWithSections,
            layoutKeys: Object.keys(layoutWithSections)
          });
        } else {
          console.log('No enhanced layout found, trying old layout...');
          // Fallback to old layout structure
          const oldLayout = await FirestoreService.getUserLayout(currentUser.uid);
          console.log('Old layout loaded:', oldLayout);
          setUserLayout(oldLayout as ExtendedLayout);
        }
      } else {
        console.log('No current user found');
      }
    } catch (error) {
      console.error('Error loading user layout:', error);
    } finally {
      setLoadingLayout(false);
    }
  };

  const handleSaveLayout = async () => {
    if (!editingLayout || !user) return;

    try {
      const updates = {
        sections: editingLayout.sections,
        name: editingLayout.name,
        area: editingLayout.area,
        type: editingLayout.type || 'household',
        userId: user.uid,
      };

      // Use the new LayoutService instead of old FirestoreService
      await LayoutService.updateLayout(user.uid, updates);
      setUserLayout({ ...editingLayout, ...updates });
      setShowLayoutModal(false);
      setEditingLayout(null);

      setAlertType('success');
      setAlertTitle('Layout Updated!');
      setAlertMessage('Your home layout has been updated successfully. ');
      setAlertVisible(true);
    } catch (error) {
      console.error('Error saving layout:', error);

      setAlertType('error');
      setAlertTitle('Update Failed');
      setAlertMessage('Failed to save layout changes. Please check your connection and try again.');
      setAlertVisible(true);
    }
  };

  const handleAddSection = () => {
    if (!newSectionName.trim() || !editingLayout) return;

    const updatedSections = [...editingLayout.sections, { name: newSectionName.trim(), count: 1 }];
    setEditingLayout({ ...editingLayout, sections: updatedSections });
    setNewSectionName('');
    setShowAddSection(false);
  };

  const handleDeleteSection = (index: number) => {
    if (!editingLayout) return;

    const updatedSections = editingLayout.sections.filter((_: any, i: number) => i !== index);
    setEditingLayout({ ...editingLayout, sections: updatedSections });
  };

  const handleUpdateSectionCount = (index: number, count: number) => {
    if (!editingLayout || count < 1) return;

    const updatedSections = [...editingLayout.sections];
    updatedSections[index] = { ...updatedSections[index], count };
    setEditingLayout({ ...editingLayout, sections: updatedSections });
  };

  // Device management functions
  const handleAddDevice = async (deviceData: {
    deviceName: string;
    wattage: number;
    startTime: string;
    endTime: string;
  }) => {
    if (!selectedRoom || !user) return;

    try {
      // First ensure we have the enhanced layout structure
      await ensureEnhancedLayout();

      await LayoutService.addDevice(user.uid, selectedRoom.roomId, deviceData);
      await loadUserLayout();
      setShowDeviceModal(false);
      setSelectedRoom(null);

      setAlertType('success');
      setAlertTitle('Device Added!');
      setAlertMessage(`${deviceData.deviceName} has been added to ${selectedRoom.roomName}.`);
      setAlertVisible(true);
    } catch (error) {
      console.error('Error adding device:', error);
      setAlertType('error');
      setAlertTitle('Add Failed');
      setAlertMessage('Failed to add device. Please try again.');
      setAlertVisible(true);
    }
  };

  // Delete layout function
  const handleDeleteLayout = async () => {
    if (!userLayout || !user) return;
    setDeleteConfirmVisible(true);
  };

  // Confirm delete layout
  const confirmDeleteLayout = async () => {
    if (!userLayout || !user) return;

    try {
      setDeleteConfirmVisible(false);
      await LayoutService.deleteLayout(user.uid);
      setUserLayout(null);
      
      setAlertType('success');
      setAlertTitle('Layout Deleted!');
      setAlertMessage('Your home layout has been deleted successfully.');
      setAlertVisible(true);
    } catch (error) {
      console.error('Error deleting layout:', error);
      setAlertType('error');
      setAlertTitle('Delete Failed');
      setAlertMessage('Failed to delete layout. Please try again.');
      setAlertVisible(true);
    }
  };

  const handleEditDevice = async (deviceData: {
    deviceName: string;
    wattage: number;
    startTime: string;
    endTime: string;
  }) => {
    if (!editingDevice || !selectedRoom || !user) return;

    try {
      await LayoutService.updateDevice(
        user.uid,
        selectedRoom.roomId,
        editingDevice.deviceId,
        deviceData
      );
      await loadUserLayout();
      setShowDeviceModal(false);
      setEditingDevice(null);
      setSelectedRoom(null);

      setAlertType('success');
      setAlertTitle('Device Updated!');
      setAlertMessage(`${deviceData.deviceName} has been updated successfully.`);
      setAlertVisible(true);
    } catch (error) {
      console.error('Error updating device:', error);
      setAlertType('error');
      setAlertTitle('Update Failed');
      setAlertMessage('Failed to update device. Please try again.');
      setAlertVisible(true);
    }
  };

  const handleDeleteDevice = async (device: any, room: any) => {
    if (!user) return;

    try {
      await LayoutService.deleteDevice(user.uid, room.roomId, device.deviceId);
      await loadUserLayout();

      setAlertType('success');
      setAlertTitle('Device Removed!');
      setAlertMessage(`${device.deviceName} has been removed from ${room.roomName}.`);
      setAlertVisible(true);
    } catch (error) {
      console.error('Error deleting device:', error);
      setAlertType('error');
      setAlertTitle('Delete Failed');
      setAlertMessage('Failed to remove device. Please try again.');
      setAlertVisible(true);
    }
  };

  // Ensure we have enhanced layout structure for device management
  const ensureEnhancedLayout = async () => {
    if (!user || !userLayout) return;

    // If already has rooms, we're good
    if (userLayout.rooms && userLayout.rooms.length > 0) return;

    // If has sections but no rooms, convert to enhanced structure
    if (userLayout.sections && userLayout.sections.length > 0) {
      const rooms = userLayout.sections.flatMap((section: any) =>
        Array.from({ length: section.count }, (_, index) => ({
          roomId: `${section.name.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`,
          roomName: section.count > 1 ? `${section.name} ${index + 1}` : section.name,
          devices: [],
        }))
      );

      const enhancedLayout = {
        layoutName: userLayout.name || 'My Home',
        area: userLayout.area || 1000,
        rooms: rooms,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save the enhanced structure to the new collection
      await LayoutService.updateLayout(user.uid, enhancedLayout);
    }
  };

  const openAddDeviceModal = (room: any) => {
    setSelectedRoom(room);
    setEditingDevice(null);
    setShowDeviceModal(true);
  };

  const openEditDeviceModal = (device: any, room: any) => {
    setSelectedRoom(room);
    setEditingDevice(device);
    setShowDeviceModal(true);
  };

  const toggleRoomExpansion = (roomId: string) => {
    setExpandedRoom(expandedRoom === roomId ? null : roomId);
  };

  const getDeviceIcon = (deviceName: string): keyof typeof Ionicons.glyphMap => {
    const preset = DEVICE_PRESETS.find(
      p =>
        p.name.toLowerCase() === deviceName.toLowerCase() ||
        deviceName.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    );
    return (preset?.icon as keyof typeof Ionicons.glyphMap) || 'flash-outline';
  };

  const getRoomIcon = (roomName: string): keyof typeof Ionicons.glyphMap => {
    return (ROOM_ICONS[roomName as keyof typeof ROOM_ICONS] ||
      ROOM_ICONS.default) as keyof typeof Ionicons.glyphMap;
  };

  const BLUEPRINT_LAYOUTS = [
    {
      id: 'bp_small_apartment',
      name: 'Small Apartment',
      area: 650,
      type: 'household' as const,
      sections: [
        { name: 'Bedroom', count: 1 },
        { name: 'Kitchen', count: 1 },
        { name: 'Living Room', count: 1 },
        { name: 'Bathroom', count: 1 },
      ],
    },
    {
      id: 'bp_medium_house',
      name: 'Medium House',
      area: 1500,
      type: 'household' as const,
      sections: [
        { name: 'Bedroom', count: 3 },
        { name: 'Kitchen', count: 1 },
        { name: 'Living Room', count: 1 },
        { name: 'Bathroom', count: 2 },
        { name: 'Garage', count: 1 },
        { name: 'Dining Room', count: 1 },
      ],
    },
    {
      id: 'bp_large_house',
      name: 'Large House',
      area: 2500,
      type: 'household' as const,
      sections: [
        { name: 'Bedroom', count: 4 },
        { name: 'Kitchen', count: 1 },
        { name: 'Living Room', count: 2 },
        { name: 'Bathroom', count: 3 },
        { name: 'Garage', count: 2 },
        { name: 'Dining Room', count: 1 },
        { name: 'Study', count: 1 },
        { name: 'Laundry Room', count: 1 },
      ],
    },
  ];

  const handleSelectBlueprint = async (blueprint: any) => {
    if (!user) return;

    try {
      const layoutData = {
        source: 'blueprint' as const,
        blueprintId: blueprint.id,
        sections: blueprint.sections,
        type: blueprint.type,
        name: blueprint.name,
        area: blueprint.area,
        userId: user.uid,
      };

      // Use new LayoutService for proper persistence
      await LayoutService.updateLayout(user.uid, layoutData);
      await loadUserLayout();
      setShowSelectionModal(false);

      setAlertType('success');
      setAlertTitle('Layout Selected!');
      setAlertMessage(
        `Perfect! ${blueprint.name} has been set as your home layout. Your energy insights are now personalized.`
      );
      setAlertVisible(true);
    } catch (error) {
      console.error('Error selecting layout:', error);

      setAlertType('error');
      setAlertTitle('Selection Failed');
      setAlertMessage(
        'Failed to save your layout selection. Please check your connection and try again.'
      );
      setAlertVisible(true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEnergyData();
    await loadUserLayout();
    setRefreshing(false);
  };

  useEffect(() => {
    loadEnergyData();
    setUser(AuthService.getCurrentUser());
    loadUserLayout();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const renderHeader = () => (
    <Animatable.View animation="fadeInDown" delay={200} style={styles.header}>
      <LinearGradient
        colors={['#0e9b6e', '#05986c', '#2da375']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>{getGreeting()}!</Text>
            <Text style={styles.userNameText}>
              {user?.email?.split('@')[0] || user?.displayName || 'User'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={20} color="#86efac" />
            <Text style={styles.statValue}>{energyData.efficiency}%</Text>
            <Text style={styles.statLabel}>Efficiency</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trending-down" size={20} color="#bbf7d0" />
            <Text style={styles.statValue}>-12%</Text>
            <Text style={styles.statLabel}>vs Last Month</Text>
          </View>
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  const renderMetricsGrid = () => (
    <Animatable.View animation="fadeInUp" delay={400} style={styles.metricsContainer}>
      <Text style={styles.sectionTitle}>Energy Overview</Text>
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: '#f0f9ff' }]}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Ionicons name="speedometer-outline" size={24} color="#3b82f6" />
          </View>
          <AnimatedCounter
            value={energyData.currentUsage}
            style={styles.metricValue}
            suffix=" kW"
            decimals={1}
          />
          <Text style={styles.metricLabel}>Current Usage</Text>
          <View style={styles.metricChange}>
            <Ionicons name="trending-up" size={12} color="#ef4444" />
            <Text style={[styles.changeText, { color: '#ef4444' }]}>+5.2%</Text>
          </View>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#f3e8ff' }]}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
            <Ionicons name="calendar-outline" size={24} color="#a855f7" />
          </View>
          <AnimatedCounter
            value={energyData.totalConsumption}
            style={styles.metricValue}
            suffix=" kWh"
          />
          <Text style={styles.metricLabel}>Monthly Total</Text>
          <View style={styles.metricChange}>
            <Ionicons name="trending-down" size={12} color="#22c55e" />
            <Text style={[styles.changeText, { color: '#22c55e' }]}>-8.1%</Text>
          </View>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#fff7ed' }]}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
            <Ionicons name="card-outline" size={24} color="#f97316" />
          </View>
          <AnimatedCounter
            value={energyData.monthlyBill}
            style={styles.metricValue}
            prefix="LKR"
            decimals={2}
          />
          <Text style={styles.metricLabel}>Est. Bill</Text>
          <View style={styles.metricChange}>
            <Ionicons name="trending-down" size={12} color="#22c55e" />
            <Text style={[styles.changeText, { color: '#22c55e' }]}>-12.3%</Text>
          </View>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#f0fdf4' }]}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
            <Ionicons name="leaf-outline" size={24} color="#22c55e" />
          </View>
          <AnimatedCounter value={892} style={styles.metricValue} suffix=" lbs" />
          <Text style={styles.metricLabel}>CO₂ Saved</Text>
          <View style={styles.metricChange}>
            <Ionicons name="trending-up" size={12} color="#22c55e" />
            <Text style={[styles.changeText, { color: '#22c55e' }]}>+24.1%</Text>
          </View>
        </View>
      </View>
    </Animatable.View>
  );

  const renderCharts = () => (
    <Animatable.View animation="fadeInUp" delay={600} style={styles.chartsContainer}>
      <Text style={styles.sectionTitle}>Usage Trends</Text>
      <View style={styles.periodSelectorContainer}>
        <View style={styles.periodSelector}>
          {['Week', 'Month', 'Year'].map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.chartCard}>
        <LineChart
          data={{
            labels:
              selectedPeriod === 'Week'
                ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                : selectedPeriod === 'Month'
                  ? ['W1', 'W2', 'W3', 'W4']
                  : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
              {
                data:
                  selectedPeriod === 'Week'
                    ? energyData.predictions
                    : selectedPeriod === 'Month'
                      ? [45, 52, 48, 55]
                      : [320, 280, 350, 290, 380, 320],
                color: (opacity = 1) => '#49B02D',
                strokeWidth: 3,
              },
            ],
          }}
          width={chartWidth}
          height={220}
          withDots={false}
          withInnerLines={false}
          withVerticalLines={false}
          withHorizontalLines={false}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 1,
            color: (opacity = 1) => '#49B02D',
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            // dots removed for a cleaner line
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Energy Insights</Text>
      <View style={styles.chartCard}>
        <BarChart
          data={{
            labels: ['', '', '', '', ''], // Empty labels since we have custom legend
            datasets: [
              {
                data: Object.values(energyData.categories),
                colors: [
                  () => '#ef4444', // Bright Red
                  () => '#f97316', // Bright Orange
                  () => '#3b82f6', // Bright Blue
                  () => '#a855f7', // Purple (undo green for this square)
                  () => '#06b6d4', // Teal
                ],
              },
            ],
          }}
          width={chartWidth}
          height={240}
          yAxisLabel=""
          yAxisSuffix="%"
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            barPercentage: 0.8,
            fillShadowGradient: '#ffffff',
            fillShadowGradientOpacity: 1,
            propsForBackgroundLines: {
              strokeWidth: 0,
            },
            propsForVerticalLabels: {
              fontSize: 0, // Hide vertical labels since we have custom legend
            },
            barRadius: 8,
          }}
          style={styles.chart}
          showBarTops={false}
          fromZero={true}
          withCustomBarColorFromData={true}
          flatColor={true}
          segments={4}
        />

        {/* Custom Legend inside chart container */}
        <View style={styles.legendContainer}>
          {Object.keys(energyData.categories).map((category, index) => {
            const colors = ['#ef4444', '#f97316', '#3b82f6', '#a855f7', '#06b6d4'];
            return (
              <View key={category} style={styles.legendItem}>
                <View style={[styles.legendColorBox, { backgroundColor: colors[index] }]} />
                <Text style={styles.legendText}>{category}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animatable.View>
  );

  const renderLayoutSection = () => (
    <Animatable.View animation="fadeInUp" delay={800} style={styles.layoutSection}>
      <Text style={styles.sectionTitle}>Home Layout</Text>

      {loadingLayout ? (
        <View style={styles.layoutCard}>
          <ActivityIndicator size="large" color="#49B02D" />
          <Text style={styles.loadingText}>Loading your layout...</Text>
        </View>
      ) : userLayout ? (
        <View style={styles.layoutCard}>
          <View style={styles.layoutHeader}>
            <View style={styles.layoutInfo}>
              <Text style={styles.layoutName}>{userLayout.name || userLayout.layoutName}</Text>
              <Text style={styles.layoutDetails}>
                {userLayout.area} sq ft •{' '}
                {userLayout.type === 'household' ? 'Residential' : 'Industrial'}
              </Text>
            </View>
            <View style={styles.layoutActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setEditingLayout(userLayout);
                  setShowLayoutModal(true);
                }}
              >
                <Ionicons name="settings-outline" size={20} color="#49B02D" />
                <Text style={styles.editButtonText}>Edit Structure</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.layoutDeleteButton}
                onPress={handleDeleteLayout}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={styles.layoutDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.roomsContainer}>
            <Text style={styles.roomsTitle}>Rooms & Spaces</Text>
            <View style={styles.roomsGrid}>
              {userLayout.sections && userLayout.sections.length > 0 ? (
                userLayout.sections.slice(0, 6).map((section: any, index: number) => (
                  <View key={index} style={styles.roomItem}>
                    <Ionicons name="home-outline" size={16} color="#64748b" />
                    <Text style={styles.roomText}>
                      {section.name} ({section.count})
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.roomItem}>
                  <Text style={styles.noRoomsText}>
                    {userLayout && userLayout.sections ? 'No rooms configured yet' : 'Loading room structure...'}
                  </Text>
                </View>
              )}
              {userLayout.sections && userLayout.sections.length > 6 && (
                <View style={styles.roomItem}>
                  <Text style={styles.roomText}>+{userLayout.sections.length - 6} more</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.layoutCard}>
          <View style={styles.noLayoutContainer}>
            <Ionicons name="home-outline" size={48} color="#d1d5db" />
            <Text style={styles.noLayoutTitle}>No Layout Selected</Text>
            <Text style={styles.noLayoutText}>
              Choose a home layout to get personalized energy insights
            </Text>
            <TouchableOpacity
              style={styles.selectLayoutButton}
              onPress={() => setShowSelectionModal(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.selectLayoutButtonText}>Select Layout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animatable.View>
  );

  const renderDeviceManagement = () => {
    if (!userLayout) {
      return null;
    }

    // Create rooms from sections if rooms don't exist (backward compatibility)
    let rooms = userLayout.rooms || [];
    if (rooms.length === 0 && userLayout.sections) {
      // Convert sections to rooms for device management
      rooms = userLayout.sections.flatMap((section: any) =>
        Array.from({ length: section.count }, (_, index) => ({
          roomId: `${section.name.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`,
          roomName: section.count > 1 ? `${section.name} ${index + 1}` : section.name,
          devices: [],
        }))
      );
    }

    if (rooms.length === 0) {
      return null;
    }

    return (
      <Animatable.View animation="fadeInUp" delay={1000} style={styles.deviceSection}>
        <Text style={styles.sectionTitle}>Room & Device Management</Text>
        <Text style={styles.deviceSubtitle}>
          Manage devices in each room to track energy usage and get personalized insights
        </Text>

        {rooms.map((room: any) => {
          const roomEnergy = calculateRoomEnergyConsumption(room.devices || []);
          const isExpanded = expandedRoom === room.roomId;

          return (
            <View key={room.roomId} style={styles.roomCard}>
              <TouchableOpacity
                style={styles.roomHeader}
                onPress={() => toggleRoomExpansion(room.roomId)}
              >
                <View style={styles.roomIconContainer}>
                  <Ionicons name={getRoomIcon(room.roomName)} size={24} color={Colors.primary} />
                </View>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomName}>{room.roomName}</Text>
                  <Text style={styles.deviceCount}>
                    {room.devices?.length || 0} devices
                    {roomEnergy > 0 && ` • ${roomEnergy.toFixed(2)} kWh/day`}
                  </Text>
                </View>
                <View style={styles.roomActions}>
                  <TouchableOpacity
                    style={styles.addDeviceButton}
                    onPress={() => openAddDeviceModal(room)}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#64748b"
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.devicesContainer}>
                  {room.devices && room.devices.length > 0 ? (
                    room.devices.map((device: any) => (
                      <View key={device.deviceId} style={styles.deviceCard}>
                        <View style={styles.deviceHeader}>
                          <View style={styles.deviceIconContainer}>
                            <Ionicons
                              name={getDeviceIcon(device.deviceName)}
                              size={20}
                              color={Colors.primary}
                            />
                          </View>
                          <View style={styles.deviceInfo}>
                            <Text style={styles.deviceName}>{device.deviceName}</Text>
                            <Text style={styles.deviceDetails}>
                              {device.wattage}W
                              {device.usage &&
                                device.usage.length > 0 &&
                                ` • ${formatTime(device.usage[0].start)} - ${formatTime(device.usage[0].end)}`}
                            </Text>
                            {device.totalPowerUsed && (
                              <Text style={styles.deviceEnergy}>
                                {device.totalPowerUsed.toFixed(2)} kWh/day
                              </Text>
                            )}
                          </View>
                          <View style={styles.deviceActions}>
                            <TouchableOpacity
                              style={styles.deviceActionButton}
                              onPress={() => openEditDeviceModal(device, room)}
                            >
                              <Ionicons name="create-outline" size={16} color="#64748b" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deviceActionButton}
                              onPress={() => handleDeleteDevice(device, room)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.noDevicesContainer}>
                      <Ionicons name="flash-outline" size={32} color="#d1d5db" />
                      <Text style={styles.noDevicesText}>No devices added yet</Text>
                      <TouchableOpacity
                        style={styles.addFirstDeviceButton}
                        onPress={() => openAddDeviceModal(room)}
                      >
                        <Text style={styles.addFirstDeviceText}>Add Device</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </Animatable.View>
    );
  };

  const renderLayoutSelectionModal = () => (
    <Modal
      visible={showSelectionModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSelectionModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowSelectionModal(false)}
          >
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Home Layout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalSubtitle}>Choose a blueprint that matches your home:</Text>

          {BLUEPRINT_LAYOUTS.map(blueprint => (
            <TouchableOpacity
              key={blueprint.id}
              style={styles.blueprintCard}
              onPress={() => handleSelectBlueprint(blueprint)}
            >
              <View style={styles.blueprintHeader}>
                <View>
                  <Text style={styles.blueprintName}>{blueprint.name}</Text>
                  <Text style={styles.blueprintDetails}>
                    {blueprint.area} sq ft •{' '}
                    {blueprint.type === 'household' ? 'Residential' : 'Industrial'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </View>

              <View style={styles.blueprintSections}>
                {blueprint.sections.map((section, index) => (
                  <View key={index} style={styles.blueprintSection}>
                    <Ionicons name="home-outline" size={14} color="#64748b" />
                    <Text style={styles.blueprintSectionText}>
                      {section.name} ({section.count})
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderLayoutEditModal = () => (
    <Modal
      visible={showLayoutModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setShowLayoutModal(false);
        setEditingLayout(null);
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => {
              setShowLayoutModal(false);
              setEditingLayout(null);
            }}
          >
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Layout</Text>
          <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveLayout}>
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {editingLayout && (
            <>
              <View style={styles.layoutInfoCard}>
                <Text style={styles.layoutModalName}>{editingLayout.name}</Text>
                <Text style={styles.layoutModalDetails}>
                  {editingLayout.area} sq ft •{' '}
                  {editingLayout.type === 'household' ? 'Residential' : 'Industrial'}
                </Text>
              </View>

              <View style={styles.sectionsCard}>
                <View style={styles.sectionsHeader}>
                  <Text style={styles.sectionsTitle}>Rooms & Spaces</Text>
                  <TouchableOpacity
                    style={styles.addSectionButton}
                    onPress={() => setShowAddSection(true)}
                  >
                    <Ionicons name="add" size={20} color="#49B02D" />
                    <Text style={styles.addSectionText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {editingLayout.sections?.map((section: any, index: number) => (
                  <View key={index} style={styles.sectionRow}>
                    <View style={styles.sectionInfo}>
                      <Ionicons name="home-outline" size={18} color="#64748b" />
                      <Text style={styles.sectionName}>{section.name}</Text>
                    </View>

                    <View style={styles.sectionControls}>
                      <TouchableOpacity
                        style={styles.countButton}
                        onPress={() => handleUpdateSectionCount(index, section.count - 1)}
                      >
                        <Ionicons name="remove" size={16} color="#64748b" />
                      </TouchableOpacity>

                      <Text style={styles.countText}>{section.count}</Text>

                      <TouchableOpacity
                        style={styles.countButton}
                        onPress={() => handleUpdateSectionCount(index, section.count + 1)}
                      >
                        <Ionicons name="add" size={16} color="#64748b" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteSection(index)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {showAddSection && (
                  <View style={styles.addSectionRow}>
                    <TextInput
                      style={styles.addSectionInput}
                      placeholder="Room name (e.g., Study, Balcony)"
                      value={newSectionName}
                      onChangeText={setNewSectionName}
                      autoFocus
                    />
                    <TouchableOpacity style={styles.confirmAddButton} onPress={handleAddSection}>
                      <Ionicons name="checkmark" size={20} color="#49B02D" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelAddButton}
                      onPress={() => {
                        setShowAddSection(false);
                        setNewSectionName('');
                      }}
                    >
                      <Ionicons name="close" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        {renderHeader()}
        {renderMetricsGrid()}
        {renderCharts()}
        {renderLayoutSection()}
        {renderDeviceManagement()}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {renderLayoutSelectionModal()}
      {renderLayoutEditModal()}

      <AddEditDeviceModal
        visible={showDeviceModal}
        device={editingDevice}
        onSave={editingDevice ? handleEditDevice : handleAddDevice}
        onClose={() => {
          setShowDeviceModal(false);
          setEditingDevice(null);
          setSelectedRoom(null);
        }}
      />

      <AlertModal
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalHeader}>
              <View style={[styles.deleteIconContainer, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Layout</Text>
            </View>
            
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this layout? This action cannot be undone and will remove all rooms and devices.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={confirmDeleteLayout}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FloatingChatbot />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#d1fae5',
    marginBottom: 4,
  },
  userNameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fbbf24',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#d1fae5',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  metricsContainer: {
    marginBottom: 32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
  },
  metricCard: {
    width: (width - 56) / 2,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bottomSpacer: {
    height: 100,
  },
  chartsContainer: {
    marginBottom: 32,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  periodSelectorContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  periodButtonActive: {
    backgroundColor: '#49B02D',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  layoutSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  layoutCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 12,
    color: '#64748b',
    fontSize: 16,
  },
  layoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  layoutInfo: {
    flex: 1,
  },
  layoutActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  layoutName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  layoutDetails: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flexWrap: 'nowrap',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#49B02D',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  layoutDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  layoutDeleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  roomsContainer: {
    marginTop: 16,
  },
  roomsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  roomText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 6,
  },
  noRoomsText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    flex: 1,
  },
  noLayoutContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noLayoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noLayoutText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  selectLayoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#49B02D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  selectLayoutButtonText: {
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
    backgroundColor: '#49B02D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 24,
  },
  // Blueprint Cards
  blueprintCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  blueprintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  blueprintName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  blueprintDetails: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  blueprintSections: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  blueprintSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  blueprintSectionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 4,
  },
  // Layout Edit Modal
  layoutInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  layoutModalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  layoutModalDetails: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  sectionsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addSectionText: {
    color: '#49B02D',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 10,
  },
  sectionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countButton: {
    backgroundColor: '#f3f4f6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    minWidth: 24,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  addSectionInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  confirmAddButton: {
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelAddButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Device Management Styles
  deviceSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  deviceSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  roomCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  roomIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  deviceCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  roomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addDeviceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devicesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  deviceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  deviceDetails: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  deviceEnergy: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 6,
  },
  deviceActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDevicesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDevicesText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 12,
  },
  addFirstDeviceButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addFirstDeviceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Delete confirmation modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: 340,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10.32,
    elevation: 16,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 40,
    alignItems: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  confirmDeleteButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default HomeScreen;
