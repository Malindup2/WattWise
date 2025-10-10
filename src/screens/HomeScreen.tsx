import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AnimatedCounter from '../components/AnimatedCounter';
import DailyUsageInput from '../components/DailyUsageInput';
import DailyUsageDisplay from '../components/DailyUsageDisplay';
import { Colors } from '../constants/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthService } from '../services/firebase';
import { User } from 'firebase/auth';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { FirestoreService } from '../services/firebase';
import { LayoutService } from '../services/LayoutService';
import { DailyUsageService, UsageStats } from '../services/DailyUsageService';
import { AlertModal } from '../components/AlertModal';
import { AddEditDeviceModal } from '../components/modals';
import { DEVICE_PRESETS, ROOM_ICONS } from '../constants/DeviceTypes';
import { Room } from '../types/layout';

// Extended layout type to handle both old and new layout structures
interface ExtendedLayout {
  id?: string;
  name?: string; // for blueprint layouts
  layoutName?: string; // for new layout structure
  imageUrl?: string;
  sections?: { name: string; count: number }[];
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
  const [selectedLayoutType, setSelectedLayoutType] = useState<'household' | 'industrial'>(
    'household'
  );
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

  // Daily usage tracking state
  const [showUsageInput, setShowUsageInput] = useState(false);
  const [showDailyUsage, setShowDailyUsage] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats>({
    today: 0,
    yesterday: 0,
    weeklyAverage: 0,
    monthlyTotal: 0,
    trend: 'stable',
    trendPercentage: 0,
  });
  const [weeklyTrend, setWeeklyTrend] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ [key: string]: number }>({});

  // Animation values for circular progress
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const percentageAnimation = useRef(new Animated.Value(0)).current;

  // Sidebar animation
  const sidebarAnimation = useRef(new Animated.Value(-width * 0.8)).current;

  // Sidebar state
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarModalVisible, setSidebarModalVisible] = useState(false);

  // Profile management state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [energyData, setEnergyData] = useState({
    totalConsumption: 0,
    currentUsage: 0,
    monthlyBill: 0,
    efficiency: 0,
    predictions: [0, 0, 0, 0, 0, 0, 0],
    categories: {
      'Lighting': 0,
      'Appliances': 0,
      'Electronics': 0,
      'HVAC': 0,
      'Other': 0,
    },
  });

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Week');

  // Function to animate circular progress
  const animateProgress = (targetPercentage: number) => {
    // Reset animations
    progressAnimation.setValue(0);
    percentageAnimation.setValue(0);

    // Animate progress arc
    Animated.timing(progressAnimation, {
      toValue: targetPercentage / 100,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Animate percentage counter
    Animated.timing(percentageAnimation, {
      toValue: targetPercentage,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  };

  const loadEnergyData = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        // Load real usage statistics
        const stats = await DailyUsageService.getUsageStats(user.uid);
        setUsageStats(stats);

        // Load weekly trend for charts
        const trend = await DailyUsageService.getWeeklyTrend(user.uid);
        setWeeklyTrend(trend);

        // Load category breakdown
        const categories = await DailyUsageService.getCategoryBreakdown(user.uid, 7);
        setCategoryBreakdown(categories);

        // Update energy data with real values
        setEnergyData(prev => ({
          ...prev,
          totalConsumption: stats.monthlyTotal,
          currentUsage: stats.today,
          monthlyBill: stats.monthlyTotal * 0.1, // Assuming 0.1 LKR per kWh
          efficiency: Math.min(100, Math.max(0, 100 - (stats.trendPercentage || 0))),
          predictions: trend,
          categories: {
            'Lighting': categories['Lighting'] || 0,
            'Appliances': categories['Appliances'] || 0,
            'Electronics': categories['Electronics'] || 0,
            'HVAC': categories['HVAC'] || 0,
            'Other': categories['Other'] || 0,
          },
        }));

        // Calculate efficiency percentage and trigger animation
        const efficiencyPercentage = stats.weeklyAverage > 0 
          ? Math.max(0, Math.min(100, ((stats.weeklyAverage - stats.today) / stats.weeklyAverage) * 100))
          : 75;
        
        // Trigger circular progress animation with real data
        setTimeout(() => {
          animateProgress(Math.round(efficiencyPercentage));
        }, 500); // Small delay to ensure UI is ready
      }
    } catch (error) {
      console.error('Error loading energy data:', error);
      // Keep default values on error
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

          console.log('Layout type from Firebase:', enhancedLayout.type);
          console.log('Layout name from Firebase:', enhancedLayout.layoutName);
          if (!layoutWithSections.sections && enhancedLayout.rooms) {
            // Convert rooms back to sections for display
            const sectionMap = new Map();
            console.log('Converting rooms to sections. Rooms:', enhancedLayout.rooms);

            enhancedLayout.rooms.forEach((room: any) => {
              const baseName = room.roomName.replace(/\s+\d+$/, '').trim(); // Remove numbers at end and trim
              console.log(`Room: "${room.roomName}" -> Base: "${baseName}"`);

              if (sectionMap.has(baseName)) {
                sectionMap.set(baseName, sectionMap.get(baseName) + 1);
              } else {
                sectionMap.set(baseName, 1);
              }
            });

            layoutWithSections.sections = Array.from(sectionMap.entries()).map(([name, count]) => ({
              name,
              count,
            }));

            console.log('Converted sections:', layoutWithSections.sections);
          }

          setUserLayout(layoutWithSections);
          console.log('Final layout with sections:', {
            name: layoutWithSections.layoutName,
            type: layoutWithSections.type,
            sections: layoutWithSections.sections,
            hasLayout: !!layoutWithSections,
            layoutKeys: Object.keys(layoutWithSections),
          });
        } else {
          console.log('No enhanced layout found in layouts collection');
          setUserLayout(null); // Don't fall back to old layout, just show no layout
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
      console.log('💾 Saving layout. EditingLayout:', editingLayout);
      console.log('💾 EditingLayout keys:', Object.keys(editingLayout));
      console.log('💾 EditingLayout.name:', editingLayout.name);
      console.log('💾 EditingLayout.layoutName:', editingLayout.layoutName);
      console.log('💾 EditingLayout sections:', editingLayout.sections);

      // Convert sections back to rooms for proper storage
      const rooms: any[] = [];
      editingLayout.sections.forEach((section: any) => {
        for (let i = 1; i <= section.count; i++) {
          const roomId = `${section.name.toLowerCase().replace(/\s+/g, '_')}_${i}`;
          rooms.push({
            roomId,
            roomName: section.count > 1 ? `${section.name} ${i}` : section.name,
            devices: [],
          });
        }
      });

      console.log('💾 Generated rooms from sections:', rooms);

      const updates = {
        layoutName: editingLayout.name || editingLayout.layoutName || 'My Layout',
        area: editingLayout.area,
        type: editingLayout.type || 'household',
        rooms: rooms,
        userId: user.uid,
        createdAt: editingLayout.createdAt || new Date(),
      };

      console.log('💾 Layout updates to save:', updates);

      // Use the new LayoutService instead of old FirestoreService
      await LayoutService.updateLayout(user.uid, updates);

      // Reload the layout to get the updated data
      await loadUserLayout();

      setShowLayoutModal(false);
      setEditingLayout(null);

      setAlertType('success');
      setAlertTitle('Layout Updated!');
      setAlertMessage('Your home layout has been updated successfully.');
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
    {
      id: 'bp_small_factory',
      name: 'Small Factory',
      area: 2000,
      type: 'industrial' as const,
      sections: [
        { name: 'Production Area', count: 1 },
        { name: 'Office', count: 1 },
        { name: 'Storage', count: 1 },
        { name: 'Restroom', count: 1 },
      ],
    },
    {
      id: 'bp_medium_warehouse',
      name: 'Medium Warehouse',
      area: 5000,
      type: 'industrial' as const,
      sections: [
        { name: 'Storage Area', count: 2 },
        { name: 'Loading Dock', count: 1 },
        { name: 'Office Space', count: 1 },
        { name: 'Maintenance Room', count: 1 },
        { name: 'Restroom', count: 2 },
      ],
    },
    {
      id: 'bp_large_industrial',
      name: 'Large Industrial Complex',
      area: 10000,
      type: 'industrial' as const,
      sections: [
        { name: 'Production Floor', count: 3 },
        { name: 'Storage Warehouse', count: 2 },
        { name: 'Administrative Office', count: 1 },
        { name: 'Quality Control Lab', count: 1 },
        { name: 'Maintenance Workshop', count: 1 },
        { name: 'Cafeteria', count: 1 },
        { name: 'Restroom', count: 4 },
        { name: 'Parking Area', count: 1 },
      ],
    },
  ];

  const handleSelectBlueprint = async (blueprint: any) => {
    if (!user) return;

    console.log('🔥 Selected blueprint:', blueprint);

    try {
      // Convert sections to rooms for the new layout structure
      const rooms = blueprint.sections.flatMap((section: any) =>
        Array.from({ length: section.count }, (_, index) => ({
          roomId: `${section.name.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`,
          roomName: section.count > 1 ? `${section.name} ${index + 1}` : section.name,
          devices: [],
        }))
      );

      console.log('🔥 Generated rooms:', rooms);

      const layoutData = {
        layoutName: blueprint.name,
        area: blueprint.area,
        type: blueprint.type, // Add the type field
        rooms: rooms,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('🔥 Saving layout data:', layoutData);

      // Use new LayoutService for proper persistence
      await LayoutService.updateLayout(user.uid, layoutData);

      // Also clear any old layout data to prevent conflicts
      try {
        const oldLayouts = await FirestoreService.getDocumentsByField(
          'user_layouts',
          'userId',
          user.uid
        );
        if (oldLayouts.length > 0) {
          console.log('🔥 Found old layout data, clearing...');
          // Note: We should add a delete function to clear old data
        }
      } catch (error) {
        console.log('No old layout data to clear');
      }

      console.log('🔥 Layout saved, now reloading...');

      // Clear any cached data first
      setUserLayout(null);
      setLoadingLayout(true);

      // Small delay to ensure Firebase has time to update
      setTimeout(async () => {
        await loadUserLayout();
      }, 2000);

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

  const handleUsageAdded = async () => {
    // Refresh data when new usage is added
    await loadEnergyData();
  };

  useEffect(() => {
    loadEnergyData();
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    loadUserLayout();
    
    // Initialize username for editing
    if (currentUser?.displayName) {
      setNewUsername(currentUser.displayName);
    }
  }, []);

  // Effect to trigger animation when usageStats changes
  useEffect(() => {
    if (usageStats.today !== 0 || usageStats.weeklyAverage !== 0) {
      const efficiencyPercentage = usageStats.weeklyAverage > 0 
        ? Math.max(0, Math.min(100, ((usageStats.weeklyAverage - usageStats.today) / usageStats.weeklyAverage) * 100))
        : 75;
      
      setTimeout(() => {
        animateProgress(Math.round(efficiencyPercentage));
      }, 800); // Delay for smooth entrance
    }
  }, [usageStats.today, usageStats.weeklyAverage]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const toggleSidebar = (callback?: () => void) => {
    if (!sidebarModalVisible) {
      // Opening: show modal first, then animate in
      setSidebarModalVisible(true);
      setSidebarVisible(true);
      
      // Set initial position
      sidebarAnimation.setValue(-width * 0.8);
      
      // Use requestAnimationFrame for better iOS compatibility
      requestAnimationFrame(() => {
        Animated.spring(sidebarAnimation, {
          toValue: 0,
          friction: 7,
          tension: 65,
          useNativeDriver: true, // Change to true for better iOS performance
        }).start(() => {
          // Execute callback after animation completes, with type check
          if (callback && typeof callback === 'function') {
            callback();
          }
        });
      });
    } else {
      // Closing: animate out, then hide modal
      Animated.spring(sidebarAnimation, {
        toValue: -width * 0.8,
        friction: 7,
        tension: 65,
        useNativeDriver: true, // Change to true for better iOS performance
      }).start(() => {
        setSidebarVisible(false);
        setSidebarModalVisible(false);
        
        // Execute callback after animation completes, with type check
        if (callback && typeof callback === 'function') {
          callback();
        }
      });
    }
  };

  // Profile management functions
  const handleEditProfile = () => {
    setNewUsername(user?.displayName || user?.email?.split('@')[0] || '');
    setShowEditProfileModal(true);
  };

  const handleUpdateProfile = async () => {
    try {
      console.log('🔧 Starting profile update...');
      setUpdatingProfile(true);
      const currentUser = AuthService.getCurrentUser();
      if (currentUser && newUsername.trim()) {
        console.log('🔧 Current user found:', currentUser.uid);
        console.log('🔧 New username:', newUsername.trim());
        
        // Use createOrUpdateUserDocument to handle missing user documents
        await FirestoreService.createOrUpdateUserDocument(currentUser.uid, {
          displayName: newUsername.trim(),
          email: currentUser.email,
          uid: currentUser.uid,
        });
        
        // Update local user state
        setUser({ ...currentUser, displayName: newUsername.trim() });
        
        console.log('✅ Profile update successful!');
        
        // Close the profile modal first
        setShowEditProfileModal(false);
        
        // On iOS, add a delay before showing alert to prevent modal conflicts
        setTimeout(() => {
          setAlertType('success');
          setAlertTitle('Profile Updated');
          setAlertMessage('Your profile has been updated successfully!');
          setAlertVisible(true);
        }, Platform.OS === 'ios' ? 500 : 100);
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      console.log('🔧 Profile update failed, showing error alert');
      
      // Close the profile modal first even on error
      setShowEditProfileModal(false);
      
      // On iOS, add a delay before showing alert to prevent modal conflicts
      setTimeout(() => {
        setAlertType('error');
        setAlertTitle('Update Failed');
        setAlertMessage('Failed to update profile. Please try again.');
        setAlertVisible(true);
      }, Platform.OS === 'ios' ? 500 : 100);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    console.log('🔧 Password change function called');
    
    // Validate current password is provided
    if (!currentPassword.trim()) {
      console.log('❌ Current password missing');
      setAlertType('error');
      setAlertTitle('Current Password Required');
      setAlertMessage('Please enter your current password.');
      setAlertVisible(true);
      return;
    }

    // Validate new password and confirmation match
    if (newPassword !== confirmPassword) {
      console.log('❌ Password mismatch');
      setAlertType('error');
      setAlertTitle('Password Mismatch');
      setAlertMessage('New password and confirm password do not match.');
      setAlertVisible(true);
      return;
    }

    // Validate new password length
    if (newPassword.length < 6) {
      console.log('❌ Password too short');
      setAlertType('error');
      setAlertTitle('Password Too Short');
      setAlertMessage('Password must be at least 6 characters long.');
      setAlertVisible(true);
      return;
    }

    // Ensure new password is different from current
    if (currentPassword === newPassword) {
      console.log('❌ Same password');
      setAlertType('error');
      setAlertTitle('Same Password');
      setAlertMessage('New password must be different from your current password.');
      setAlertVisible(true);
      return;
    }

    try {
      console.log('🔧 Starting password change...');
      setUpdatingPassword(true);
      
      // Pass both current and new password for reauthentication
      await AuthService.updatePassword(currentPassword, newPassword);
      
      console.log('✅ Password change successful!');
      
      // Close the password modal first
      setShowChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // On iOS, add a delay before showing alert to prevent modal conflicts
      setTimeout(() => {
        setAlertType('success');
        setAlertTitle('Password Updated');
        setAlertMessage('Your password has been changed successfully!');
        setAlertVisible(true);
      }, Platform.OS === 'ios' ? 500 : 100);
    } catch (error: any) {
      console.error('❌ Error changing password:', error);
      console.log('🔧 Password change failed, showing error alert');
      
      // Close the password modal first even on error
      setShowChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // On iOS, add a delay before showing alert to prevent modal conflicts
      setTimeout(() => {
        setAlertType('error');
        setAlertTitle('Password Change Failed');
        setAlertMessage(error.message || 'Failed to change password. Please try again.');
        setAlertVisible(true);
      }, Platform.OS === 'ios' ? 500 : 100);
    } finally {
      setUpdatingPassword(false);
    }
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
            <TouchableOpacity
              style={styles.hamburgerButton}
              onPress={() => toggleSidebar()}
            >
              <Ionicons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.greetingContainer}>
              <Text style={styles.welcomeText}>{getGreeting()}!</Text>
              <Text style={styles.userNameText}>
                {user?.email?.split('@')[0] || user?.displayName || 'User'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
            <View style={styles.profileContainer}>
              <TouchableOpacity style={styles.profileButton}>
                {user?.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Text style={styles.profileInitial}>
                      {(user?.email?.split('@')[0] || user?.displayName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
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

  const renderSidebar = () => (
    <Modal
      visible={sidebarModalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={() => toggleSidebar()}
      statusBarTranslucent={true}
    >
      <View style={styles.sidebarOverlay}>
        <TouchableOpacity
          style={styles.sidebarBackdrop}
          activeOpacity={1}
          onPress={() => toggleSidebar()} 
        />
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: sidebarAnimation }],
            },
          ]}
        >
          <View style={styles.sidebarHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => toggleSidebar()}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.sidebarContent}>
            <View style={styles.sidebarProfile}>
              <TouchableOpacity 
                style={styles.profileImageContainer}
                onPress={() => {
                  toggleSidebar(() => {
                    setTimeout(() => setShowProfileModal(true), 100);
                  });
                }}
              >
                {user?.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    style={styles.sidebarProfileImage}
                  />
                ) : (
                  <View style={styles.sidebarProfilePlaceholder}>
                    <Text style={styles.sidebarProfileInitial}>
                      {(user?.displayName || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.editProfileBadge}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.sidebarProfileInfo}>
                <TouchableOpacity onPress={() => {
                  toggleSidebar(() => {
                    setTimeout(() => setShowProfileModal(true), 100);
                  });
                }}>
                  <Text style={styles.sidebarProfileName}>
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.sidebarProfileEmail}>
                  {user?.email || ''}
                </Text>
              </View>
            </View>

            <View style={styles.sidebarDivider} />

            <View style={styles.sidebarMenu}>
              <TouchableOpacity 
                style={styles.sidebarMenuItem}
                onPress={() => {
                  toggleSidebar();
                  // Navigate to Home if needed
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="home-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.sidebarMenuText}>Home</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sidebarMenuItem}
                onPress={() => {
                  toggleSidebar(() => {
                    setTimeout(() => setShowProfileModal(true), 100);
                  });
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="person-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.sidebarMenuText}>Edit Profile</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sidebarMenuItem}
                onPress={() => {
                  toggleSidebar(() => {
                    setTimeout(() => setShowChangePasswordModal(true), 100);
                  });
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.sidebarMenuText}>Change Password</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <View style={styles.sidebarDivider} />

              <TouchableOpacity 
                style={styles.sidebarMenuItem}
                onPress={() => {
                  toggleSidebar(() => {
                    setTimeout(() => setShowHelpModal(true), 100);
                  });
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="help-circle-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.sidebarMenuText}>Help & Support</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sidebarMenuItem}
                onPress={() => {
                  toggleSidebar(() => {
                    setTimeout(() => setShowAboutModal(true), 100);
                  });
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.sidebarMenuText}>About</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity
                style={styles.sidebarLogoutButton}
                onPress={() => {
                  toggleSidebar(() => {
                    AuthService.signOut();
                  });
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text style={styles.sidebarLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
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
            value={usageStats.today}
            style={styles.metricValue}
            suffix=" kWh"
            decimals={2}
          />
          <Text style={styles.metricLabel}>Today's Usage</Text>
          <View style={styles.metricChange}>
            <Ionicons 
              name={usageStats.trend === 'up' ? 'trending-up' : usageStats.trend === 'down' ? 'trending-down' : 'remove'} 
              size={12} 
              color={usageStats.trend === 'up' ? '#ef4444' : usageStats.trend === 'down' ? '#22c55e' : '#6b7280'} 
            />
            <Text style={[
              styles.changeText, 
              { color: usageStats.trend === 'up' ? '#ef4444' : usageStats.trend === 'down' ? '#22c55e' : '#6b7280' }
            ]}>
              {usageStats.trend === 'stable' ? 'Stable' : `${usageStats.trendPercentage.toFixed(1)}%`}
            </Text>
          </View>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#f3e8ff' }]}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
            <Ionicons name="calendar-outline" size={24} color="#a855f7" />
          </View>
          <AnimatedCounter
            value={usageStats.monthlyTotal}
            style={styles.metricValue}
            suffix=" kWh"
            decimals={1}
          />
          <Text style={styles.metricLabel}>Monthly Total</Text>
          <View style={styles.metricChange}>
            <Ionicons name="trending-down" size={12} color="#22c55e" />
            <Text style={[styles.changeText, { color: '#22c55e' }]}>This month</Text>
          </View>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#fff7ed' }]}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
            <Ionicons name="card-outline" size={24} color="#f97316" />
          </View>
          <AnimatedCounter
            value={usageStats.monthlyTotal * 0.1}
            style={styles.metricValue}
            prefix="LKR"
            decimals={2}
          />
          <Text style={styles.metricLabel}>Est. Bill</Text>
          <View style={styles.metricChange}>
            <Ionicons name="calendar-outline" size={12} color="#22c55e" />
            <Text style={[styles.changeText, { color: '#22c55e' }]}>This month</Text>
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

  const renderDailyUsageSection = () => {
    // Calculate efficiency percentage based on comparison with weekly average
    const efficiencyPercentage = usageStats.weeklyAverage > 0 
      ? Math.max(0, Math.min(100, ((usageStats.weeklyAverage - usageStats.today) / usageStats.weeklyAverage) * 100))
      : 75;

    const isHighConsume = usageStats.today > usageStats.weeklyAverage;
    const displayPercentage = Math.round(efficiencyPercentage);

    // Animated rotation values
    const highConsumeRotation = progressAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${isHighConsume ? (100 - displayPercentage) * 1.8 : 0}deg`]
    });

    const economyRotation = progressAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${!isHighConsume ? displayPercentage * 1.8 : 0}deg`]
    });

    // Animated percentage display
    const animatedPercentage = percentageAnimation.interpolate({
      inputRange: [0, 100],
      outputRange: [0, displayPercentage],
      extrapolate: 'clamp'
    });
    
    return (
      <Animatable.View animation="fadeInUp" delay={500} style={styles.dailyUsageSection}>
        <View style={styles.dailyUsageHeader}>
          <Text style={styles.sectionTitle}>Today Usage</Text>
          <TouchableOpacity 
            style={styles.addUsageButton}
            onPress={() => setShowUsageInput(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.addUsageText}>Log Usage</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.todayStatsCard}>
          {/* Circular Progress Indicator */}
          <View style={styles.circularProgressContainer}>
            <View style={styles.circularProgress}>
              {/* Background Circle */}
              <View style={styles.progressBackground} />
              
              {/* Progress Arc - High Consume (Red) */}
              <Animated.View style={[
                styles.progressArc, 
                styles.progressHigh,
                { 
                  transform: [{ rotate: highConsumeRotation }] 
                }
              ]} />
              
              {/* Progress Arc - Economy (Green) */}
              <Animated.View style={[
                styles.progressArc, 
                styles.progressEconomy,
                { 
                  transform: [{ rotate: economyRotation }] 
                }
              ]} />
              
              {/* Center Circle with Lightning Icon and Percentage */}
              <View style={styles.progressCenter}>
                <Ionicons name="flash" size={24} color={Colors.textPrimary} />
                <Text style={styles.progressPercentage}>
                  {displayPercentage}%
                </Text>
                <Text style={styles.progressLabel}>
                  {isHighConsume ? 'High Usage' : 'Efficient'}
                </Text>
              </View>
            </View>
            
            {/* Legend */}
            <View style={styles.progressLegend}>
              <View style={styles.legendRow}>
                <View style={styles.legendItemProgress}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendTextProgress}>High consume</Text>
                </View>
                <View style={styles.legendItemProgress}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.legendTextProgress}>Economy</Text>
                </View>
              </View>
              <Text style={styles.progressSummary}>
                {displayPercentage}% electricity {isHighConsume ? 'above average' : 'saved'}
              </Text>
            </View>
          </View>

          {/* Original 3 Stats Row */}
          <View style={styles.todayStatsRow}>
            <View style={styles.todayStat}>
              <Ionicons name="flash" size={20} color={Colors.primary} />
              <Text style={styles.todayStatValue}>{usageStats.today.toFixed(2)} kWh</Text>
              <Text style={styles.todayStatLabel}>Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.todayStat}>
              <Ionicons name="calendar-outline" size={20} color={Colors.gray} />
              <Text style={styles.todayStatValue}>{usageStats.yesterday.toFixed(2)} kWh</Text>
              <Text style={styles.todayStatLabel}>Yesterday</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.todayStat}>
              <Ionicons name="analytics-outline" size={20} color={Colors.primaryLight} />
              <Text style={styles.todayStatValue}>{usageStats.weeklyAverage.toFixed(2)} kWh</Text>
              <Text style={styles.todayStatLabel}>Weekly Avg</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => setShowDailyUsage(true)}
          >
            <Text style={styles.viewDetailsText}>View Detailed Usage</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </Animatable.View>
    );
  };

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
                    ? weeklyTrend.length > 0 ? weeklyTrend : [0, 0, 0, 0, 0, 0, 0]
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
                data: Object.values(energyData.categories).length > 0 
                  ? Object.values(energyData.categories)
                  : [20, 30, 25, 15, 10],
                colors: [
                  () => '#ef4444', // Bright Red
                  () => '#f97316', // Bright Orange
                  () => '#3b82f6', // Bright Blue
                  () => '#a855f7', // Purple
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
      <Text style={styles.sectionTitle}>
        {userLayout?.type === 'industrial' ? 'Industrial Layout' : 'Home Layout'}
      </Text>

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
                  console.log('🔧 Opening edit layout modal for:', userLayout);
                  console.log('🔧 UserLayout keys:', Object.keys(userLayout));
                  console.log('🔧 UserLayout.name:', userLayout.name);
                  console.log('🔧 UserLayout.layoutName:', userLayout.layoutName);
                  console.log('🔧 Layout sections:', userLayout.sections);
                  console.log('🔧 Layout rooms:', userLayout.rooms);
                  setEditingLayout(userLayout);
                  setShowLayoutModal(true);
                }}
              >
                <Ionicons name="settings-outline" size={20} color="#49B02D" />
                <Text style={styles.editButtonText}>Edit Structure</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.layoutDeleteButton} onPress={handleDeleteLayout}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={styles.layoutDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.roomsContainer}>
            <Text style={styles.roomsTitle}>
              {userLayout?.type === 'industrial' ? 'Areas & Spaces' : 'Rooms & Spaces'}
            </Text>
            <View style={styles.roomsGrid}>
              {userLayout.sections && userLayout.sections.length > 0 ? (
                userLayout.sections.slice(0, 6).map((section: any, index: number) => {
                  // Get appropriate icon based on layout type and section name
                  const getIconName = (sectionName: string, layoutType: string) => {
                    if (layoutType === 'industrial') {
                      if (sectionName.toLowerCase().includes('production'))
                        return 'construct-outline';
                      if (sectionName.toLowerCase().includes('storage')) return 'cube-outline';
                      if (sectionName.toLowerCase().includes('office')) return 'business-outline';
                      if (sectionName.toLowerCase().includes('loading')) return 'car-outline';
                      if (sectionName.toLowerCase().includes('maintenance')) return 'build-outline';
                      if (sectionName.toLowerCase().includes('cafeteria'))
                        return 'restaurant-outline';
                      if (sectionName.toLowerCase().includes('parking')) return 'car-sport-outline';
                      if (sectionName.toLowerCase().includes('lab')) return 'flask-outline';
                      return 'business-outline';
                    } else {
                      if (sectionName.toLowerCase().includes('bedroom')) return 'bed-outline';
                      if (sectionName.toLowerCase().includes('kitchen'))
                        return 'restaurant-outline';
                      if (sectionName.toLowerCase().includes('living')) return 'tv-outline';
                      if (sectionName.toLowerCase().includes('bathroom')) return 'water-outline';
                      if (sectionName.toLowerCase().includes('garage')) return 'car-outline';
                      if (sectionName.toLowerCase().includes('dining')) return 'restaurant-outline';
                      if (sectionName.toLowerCase().includes('study')) return 'library-outline';
                      if (sectionName.toLowerCase().includes('laundry')) return 'shirt-outline';
                      return 'home-outline';
                    }
                  };

                  return (
                    <View key={index} style={styles.roomItem}>
                      <Ionicons
                        name={getIconName(section.name, userLayout?.type || 'household')}
                        size={16}
                        color="#64748b"
                      />
                      <Text style={styles.roomText}>
                        {section.name} ({section.count})
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.roomItem}>
                  <Text style={styles.noRoomsText}>
                    {userLayout && userLayout.sections
                      ? `No ${userLayout?.type === 'industrial' ? 'areas' : 'rooms'} configured yet`
                      : `Loading ${userLayout?.type === 'industrial' ? 'area' : 'room'} structure...`}
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
              Choose a layout to get personalized energy insights
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
        <Text style={styles.sectionTitle}>
          {userLayout?.type === 'industrial'
            ? 'Area & Equipment Management'
            : 'Room & Device Management'}
        </Text>
        <Text style={styles.deviceSubtitle}>
          {userLayout?.type === 'industrial'
            ? 'Manage equipment in each area to track energy usage and optimize operations'
            : 'Manage devices in each room to track energy usage and get personalized insights'}
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
                      <Text style={styles.noDevicesText}>
                        {userLayout?.type === 'industrial'
                          ? 'No equipment added yet'
                          : 'No devices added yet'}
                      </Text>
                      <TouchableOpacity
                        style={styles.addFirstDeviceButton}
                        onPress={() => openAddDeviceModal(room)}
                      >
                        <Text style={styles.addFirstDeviceText}>
                          {userLayout?.type === 'industrial' ? 'Add Equipment' : 'Add Device'}
                        </Text>
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
          <Text style={styles.modalTitle}>Select Layout</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedLayoutType === 'household' && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedLayoutType('household')}
          >
            <Ionicons
              name="home-outline"
              size={20}
              color={selectedLayoutType === 'household' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.typeButtonText,
                selectedLayoutType === 'household' && styles.typeButtonTextActive,
              ]}
            >
              Residential
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedLayoutType === 'industrial' && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedLayoutType('industrial')}
          >
            <Ionicons
              name="business-outline"
              size={20}
              color={selectedLayoutType === 'industrial' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.typeButtonText,
                selectedLayoutType === 'industrial' && styles.typeButtonTextActive,
              ]}
            >
              Industrial
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalSubtitle}>
            Choose a {selectedLayoutType === 'household' ? 'residential' : 'industrial'} blueprint
            that matches your needs:
          </Text>

          {BLUEPRINT_LAYOUTS.filter(blueprint => blueprint.type === selectedLayoutType).map(
            blueprint => (
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
            )
          )}
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
                <Text style={styles.layoutModalName}>
                  {editingLayout.name || editingLayout.layoutName || 'My Layout'}
                </Text>
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
        {renderDailyUsageSection()}
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
        layoutType={(userLayout?.type as 'household' | 'industrial') || 'household'}
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
              Are you sure you want to delete this layout? This action cannot be undone and will
              remove all rooms and devices.
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

      {/* Daily Usage Input Modal */}
      <DailyUsageInput
        visible={showUsageInput}
        onClose={() => setShowUsageInput(false)}
        onUsageAdded={handleUsageAdded}
      />

      {/* Daily Usage Display Modal */}
      <Modal
        visible={showDailyUsage}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.container}>
          <View style={styles.dailyModalHeader}>
            <TouchableOpacity 
              onPress={() => setShowDailyUsage(false)}
              style={styles.dailyModalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.dailyModalTitle}>Daily Usage Details</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <DailyUsageDisplay onAddUsage={() => {
            setShowDailyUsage(false);
            setShowUsageInput(true);
          }} />
        </View>
      </Modal>

      <FloatingChatbot />

      {renderSidebar()}

      {/* Profile Edit Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowProfileModal(false);
                setNewUsername('');
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.profileEditSection}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={user?.displayName || user?.email?.split('@')[0] || 'Enter username'}
                value={newUsername}
                onChangeText={setNewUsername}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.updateButton, !newUsername.trim() && styles.updateButtonDisabled]}
              onPress={handleUpdateProfile}
              disabled={updatingProfile || !newUsername.trim()}
            >
              {updatingProfile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.updateButtonText}>Update Username</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowChangePasswordModal(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change Password</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.profileEditSection}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.profileEditSection}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.profileEditSection}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.updateButton, 
                (!currentPassword || !newPassword || !confirmPassword) && styles.updateButtonDisabled
              ]}
              onPress={handleChangePassword}
              disabled={updatingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {updatingPassword ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.updateButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowHelpModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Help & Support</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.helpSection}>
              <View style={styles.helpItem}>
                <Ionicons name="mail-outline" size={24} color={Colors.primary} />
                <View style={styles.helpText}>
                  <Text style={styles.helpTitle}>Email Support</Text>
                  <Text style={styles.helpDescription}>support@wattwise.com</Text>
                </View>
              </View>

              <View style={styles.helpItem}>
                <Ionicons name="call-outline" size={24} color={Colors.primary} />
                <View style={styles.helpText}>
                  <Text style={styles.helpTitle}>Phone Support</Text>
                  <Text style={styles.helpDescription}>+1 (555) 123-4567</Text>
                </View>
              </View>

              <View style={styles.helpItem}>
                <Ionicons name="chatbubbles-outline" size={24} color={Colors.primary} />
                <View style={styles.helpText}>
                  <Text style={styles.helpTitle}>Live Chat</Text>
                  <Text style={styles.helpDescription}>Available 24/7</Text>
                </View>
              </View>

              <View style={styles.helpItem}>
                <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                <View style={styles.helpText}>
                  <Text style={styles.helpTitle}>User Guide</Text>
                  <Text style={styles.helpDescription}>Complete app documentation</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={showAboutModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAboutModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>About WattWise</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.aboutSection}>
              <View style={styles.appLogo}>
                <Ionicons name="flash" size={48} color={Colors.primary} />
                <Text style={styles.appName}>WattWise</Text>
                <Text style={styles.appVersion}>Version 1.0.0</Text>
              </View>

              <Text style={styles.aboutDescription}>
                WattWise is your intelligent energy management companion. 
                Monitor, analyze, and optimize your energy consumption with 
                advanced AI-powered insights and recommendations.
              </Text>

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>Developer</Text>
                <Text style={styles.aboutValue}>WattWise Team</Text>
              </View>

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>Copyright</Text>
                <Text style={styles.aboutValue}>© 2025 WattWise. All rights reserved.</Text>
              </View>

              <View style={styles.aboutItem}>
                <Text style={styles.aboutLabel}>License</Text>
                <Text style={styles.aboutValue}>MIT License</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileContainer: {
    marginLeft: 12,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#05986c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
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

  // Type selector styles
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 25,
    padding: 4,
    gap: 0,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 21,
    gap: 8,
    backgroundColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  
  // Daily Usage Section Styles
  dailyUsageSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  dailyUsageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addUsageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    gap: 4,
  },
  addUsageText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  todayStatsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  
  // Circular Progress Styles
  circularProgressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  circularProgress: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  progressBackground: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    borderColor: '#F3F4F6',
  },
  progressArc: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: '#ef4444',
    transform: [{ rotate: '-90deg' }],
  },
  progressHigh: {
    borderTopColor: '#ef4444',
  },
  progressEconomy: {
    borderTopColor: Colors.primary,
  },
  progressCenter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  progressLegend: {
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  legendItemProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendTextProgress: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  
  todayStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  todayStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  todayStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  todayStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  
  // Daily Usage Modal Styles
  dailyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dailyModalCloseButton: {
    padding: 8,
  },
  dailyModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalPlaceholder: {
    width: 40,
  },

  // Sidebar styles
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebarBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.8,
    maxWidth: 300,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 8,
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sidebarProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  sidebarProfilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarProfileInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sidebarProfileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  sidebarProfileName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sidebarProfileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sidebarMenu: {
    flex: 1,
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  sidebarMenuText: {
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  sidebarLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sidebarLogoutText: {
    fontSize: 16,
    color: '#dc2626',
    marginLeft: 16,
    fontWeight: '500',
  },
  // Profile management styles
  profileImageContainer: {
    position: 'relative',
  },
  editProfileBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  // Additional modal styles
  profileEditSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  updateButton: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  updateButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Help section styles
  helpSection: {
    padding: 20,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  helpText: {
    marginLeft: 16,
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  helpDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // About section styles
  aboutSection: {
    padding: 20,
  },
  appLogo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  appVersion: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  aboutDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  aboutLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  aboutValue: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});

export default HomeScreen;
