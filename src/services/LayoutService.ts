import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Layout, Room, Device } from '../types/layout';
import { generateId, calculateDuration, calculatePowerUsage } from '../utils/energyCalculations';

export class LayoutService {
  /**
   * Get layout with rooms and devices for a user
   */
  static async getUserLayoutWithRooms(userId: string): Promise<Layout | null> {
    try {
      console.log('🔍 Looking for layout with userId:', userId);
      // First try the new layouts collection
      const layoutDoc = await getDoc(doc(db, 'layouts', userId));
      console.log('🔍 Layout doc exists:', layoutDoc.exists());
      
      if (layoutDoc.exists()) {
        const data = layoutDoc.data();
        console.log('🔍 Layout data from Firebase:', data);
        
        // Check if layout is marked as deleted
        if (data.deleted) {
          console.log('🔍 Layout is marked as deleted');
          return null;
        }
        return { id: layoutDoc.id, ...data } as Layout;
      }
      console.log('🔍 No layout document found');
      return null;
    } catch (error) {
      console.error('Error getting user layout:', error);
      throw error;
    }
  }

  /**
   * Create or update entire layout structure
   */
  static async updateLayout(userId: string, layout: Partial<Layout>): Promise<void> {
    try {
      const layoutRef = doc(db, 'layouts', userId);

      // Ensure we remove any deletion flags when updating/creating
      const cleanLayout = {
        ...layout,
        userId,
        updatedAt: new Date(),
        deleted: false, // Explicitly set to false
        deletedAt: null, // Clear any deletion timestamp
      };

      // Use setDoc with merge: false to completely replace the document
      // This ensures no old deletion flags remain
      await setDoc(layoutRef, cleanLayout, { merge: false });

      console.log('✅ Layout updated/created successfully');
    } catch (error) {
      console.error('Error updating layout:', error);
      throw error;
    }
  }

  /**
   * Migrate old layout structure to new room-based structure
   */
  static async migrateLayout(userLayout: any): Promise<Layout> {
    const rooms: Room[] = [];

    if (userLayout.sections && Array.isArray(userLayout.sections)) {
      userLayout.sections.forEach((section: any) => {
        rooms.push({
          roomId: generateId(),
          roomName: section.name || 'Unnamed Room',
          devices: [],
        });
      });
    }

    return {
      userId: userLayout.userId || '',
      layoutName: userLayout.layoutName || 'My Home',
      area: userLayout.area || 0,
      rooms,
      createdAt: userLayout.createdAt || new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Add a new room to the layout
   */
  static async addRoom(userId: string, roomName: string): Promise<Room> {
    try {
      const newRoom: Room = {
        roomId: generateId(),
        roomName,
        devices: [],
      };

      const layoutRef = doc(db, 'layouts', userId);
      const layoutDoc = await getDoc(layoutRef);

      if (layoutDoc.exists()) {
        const currentLayout = layoutDoc.data() as Layout;
        const updatedRooms = [...(currentLayout.rooms || []), newRoom];

        await setDoc(
          layoutRef,
          {
            rooms: updatedRooms,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } else {
        // Create new layout if it doesn't exist
        const newLayout: Layout = {
          layoutName: 'My Home',
          area: 1000,
          rooms: [newRoom],
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(layoutRef, newLayout);
      }

      return newRoom;
    } catch (error) {
      console.error('Error adding room:', error);
      throw error;
    }
  }

  /**
   * Update room name
   */
  static async updateRoom(userId: string, roomId: string, updates: Partial<Room>): Promise<void> {
    try {
      const layoutRef = doc(db, 'layouts', userId);
      const layoutDoc = await getDoc(layoutRef);

      if (layoutDoc.exists()) {
        const currentLayout = layoutDoc.data() as Layout;
        const updatedRooms = currentLayout.rooms.map(room =>
          room.roomId === roomId ? { ...room, ...updates } : room
        );

        await setDoc(
          layoutRef,
          {
            rooms: updatedRooms,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  }

  /**
   * Delete a room from the layout
   */
  static async deleteRoom(userId: string, roomId: string): Promise<void> {
    try {
      const layoutRef = doc(db, 'layouts', userId);
      const layoutDoc = await getDoc(layoutRef);

      if (layoutDoc.exists()) {
        const currentLayout = layoutDoc.data() as Layout;
        const updatedRooms = currentLayout.rooms.filter(room => room.roomId !== roomId);

        await setDoc(
          layoutRef,
          {
            rooms: updatedRooms,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }

  /**
   * Add device to a specific room
   */
  static async addDevice(
    userId: string,
    roomId: string,
    deviceData: {
      deviceName: string;
      wattage: number;
      startTime: string;
      endTime: string;
    }
  ): Promise<Device> {
    try {
      const totalHours = calculateDuration(deviceData.startTime, deviceData.endTime);
      const totalPowerUsed = calculatePowerUsage(deviceData.wattage, totalHours);

      const newDevice: Device = {
        deviceId: generateId(),
        deviceName: deviceData.deviceName,
        wattage: deviceData.wattage,
        usage: [
          {
            start: deviceData.startTime,
            end: deviceData.endTime,
            totalHours,
          },
        ],
        totalPowerUsed,
      };

      const layoutRef = doc(db, 'layouts', userId);
      const layoutDoc = await getDoc(layoutRef);

      if (layoutDoc.exists()) {
        const currentLayout = layoutDoc.data() as Layout;
        const updatedRooms = currentLayout.rooms.map(room =>
          room.roomId === roomId ? { ...room, devices: [...room.devices, newDevice] } : room
        );

        await setDoc(
          layoutRef,
          {
            rooms: updatedRooms,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } else {
        // If no layout exists, we need to get from user_layouts and migrate
        const userLayoutRef = doc(db, 'user_layouts', userId);
        const userLayoutDoc = await getDoc(userLayoutRef);

        if (userLayoutDoc.exists()) {
          const userLayout = userLayoutDoc.data();
          const migratedLayout = await LayoutService.migrateLayout(userLayout);

          // Add device to the migrated layout
          const updatedRooms = migratedLayout.rooms.map(room =>
            room.roomId === roomId ? { ...room, devices: [...room.devices, newDevice] } : room
          );

          await setDoc(layoutRef, {
            ...migratedLayout,
            rooms: updatedRooms,
            updatedAt: new Date(),
          });
        } else {
          throw new Error('No layout found for user');
        }
      }

      return newDevice;
    } catch (error) {
      console.error('Error adding device:', error);
      throw error;
    }
  }

  /**
   * Update device in a specific room
   */
  static async updateDevice(
    userId: string,
    roomId: string,
    deviceId: string,
    updates: {
      deviceName?: string;
      wattage?: number;
      startTime?: string;
      endTime?: string;
    }
  ): Promise<void> {
    try {
      const layoutRef = doc(db, 'layouts', userId);
      const layoutDoc = await getDoc(layoutRef);

      if (layoutDoc.exists()) {
        const currentLayout = layoutDoc.data() as Layout;
        const updatedRooms = currentLayout.rooms.map(room => {
          if (room.roomId === roomId) {
            const updatedDevices = room.devices.map(device => {
              if (device.deviceId === deviceId) {
                const updatedDevice = { ...device };

                if (updates.deviceName) updatedDevice.deviceName = updates.deviceName;
                if (updates.wattage) updatedDevice.wattage = updates.wattage;

                if (updates.startTime || updates.endTime) {
                  const startTime = updates.startTime || device.usage[0]?.start || '00:00';
                  const endTime = updates.endTime || device.usage[0]?.end || '00:00';
                  const totalHours = calculateDuration(startTime, endTime);

                  updatedDevice.usage = [
                    {
                      start: startTime,
                      end: endTime,
                      totalHours,
                    },
                  ];

                  updatedDevice.totalPowerUsed = calculatePowerUsage(
                    updatedDevice.wattage,
                    totalHours
                  );
                }

                return updatedDevice;
              }
              return device;
            });

            return { ...room, devices: updatedDevices };
          }
          return room;
        });

        await setDoc(
          layoutRef,
          {
            rooms: updatedRooms,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  }

  /**
   * Delete device from a specific room
   */
  static async deleteDevice(userId: string, roomId: string, deviceId: string): Promise<void> {
    try {
      const layoutRef = doc(db, 'layouts', userId);
      const layoutDoc = await getDoc(layoutRef);

      if (layoutDoc.exists()) {
        const currentLayout = layoutDoc.data() as Layout;
        const updatedRooms = currentLayout.rooms.map(room => {
          if (room.roomId === roomId) {
            return {
              ...room,
              devices: room.devices.filter(device => device.deviceId !== deviceId),
            };
          }
          return room;
        });

        await setDoc(
          layoutRef,
          {
            rooms: updatedRooms,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      throw error;
    }
  }

  /**
   * Delete entire layout for a user
   */
  static async deleteLayout(userId: string): Promise<void> {
    try {
      const layoutRef = doc(db, 'layouts', userId);

      // Mark as deleted instead of actually deleting the document
      // This allows for potential recovery and maintains references
      await setDoc(
        layoutRef,
        {
          deleted: true,
          deletedAt: new Date(),
          userId,
        },
        { merge: true } // Changed to merge: true to preserve other data
      );

      console.log('✅ Layout deleted successfully');
    } catch (error) {
      console.error('Error deleting layout:', error);
      throw error;
    }
  }
}
