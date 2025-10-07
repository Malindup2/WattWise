import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getDoc,
  setDoc 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Layout, Room, Device } from '../types/layout';
import { generateId, calculateDuration, calculatePowerUsage } from '../utils/energyCalculations';

export class LayoutService {
  /**
   * Get layout with rooms and devices for a user
   */
  static async getUserLayoutWithRooms(userId: string): Promise<Layout | null> {
    try {
      // First try the new layouts collection
      const layoutDoc = await getDoc(doc(db, 'layouts', userId));
      if (layoutDoc.exists()) {
        return { id: layoutDoc.id, ...layoutDoc.data() } as Layout;
      }
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
      
      // Use setDoc with merge to create document if it doesn't exist
      await setDoc(layoutRef, {
        ...layout,
        userId,
        updatedAt: new Date()
      }, { merge: true });
      
      console.log('✅ Layout updated/created successfully');
    } catch (error) {
      console.error('Error updating layout:', error);
      throw error;
    }
  }

  /**
   * Add a new room to the layout
   */
  static async addRoom(userId: string, roomName: string): Promise<Room> {
    try {
      const newRoom: Room = {
        roomId: generateId(),
        roomName,
        devices: []
      };

      const layoutRef = doc(db, 'layouts', userId);
      const layoutDoc = await getDoc(layoutRef);
      
      if (layoutDoc.exists()) {
        const currentLayout = layoutDoc.data() as Layout;
        const updatedRooms = [...(currentLayout.rooms || []), newRoom];
        
        await setDoc(layoutRef, { 
          rooms: updatedRooms,
          updatedAt: new Date()
        }, { merge: true });
      } else {
        // Create new layout if it doesn't exist
        const newLayout: Layout = {
          layoutName: 'My Home',
          area: 1000,
          rooms: [newRoom],
          userId,
          createdAt: new Date(),
          updatedAt: new Date()
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
        
        await setDoc(layoutRef, { 
          rooms: updatedRooms,
          updatedAt: new Date()
        }, { merge: true });
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
        
        await updateDoc(layoutRef, { 
          rooms: updatedRooms,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }

  /**
   * Add device to a specific room
   */
  static async addDevice(userId: string, roomId: string, deviceData: {
    deviceName: string;
    wattage: number;
    startTime: string;
    endTime: string;
  }): Promise<Device> {
    try {
      const totalHours = calculateDuration(deviceData.startTime, deviceData.endTime);
      const totalPowerUsed = calculatePowerUsage(deviceData.wattage, totalHours);

      const newDevice: Device = {
        deviceId: generateId(),
        deviceName: deviceData.deviceName,
        wattage: deviceData.wattage,
        usage: [{
          start: deviceData.startTime,
          end: deviceData.endTime,
          totalHours
        }],
        totalPowerUsed
      };

      const layoutRef = doc(db, 'layouts', userId);
      const layoutDoc = await getDoc(layoutRef);
      
      if (layoutDoc.exists()) {
        const currentLayout = layoutDoc.data() as Layout;
        const updatedRooms = currentLayout.rooms.map(room => 
          room.roomId === roomId 
            ? { ...room, devices: [...room.devices, newDevice] }
            : room
        );
        
        await updateDoc(layoutRef, { 
          rooms: updatedRooms,
          updatedAt: new Date()
        });
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
  static async updateDevice(userId: string, roomId: string, deviceId: string, updates: {
    deviceName?: string;
    wattage?: number;
    startTime?: string;
    endTime?: string;
  }): Promise<void> {
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
                  
                  updatedDevice.usage = [{
                    start: startTime,
                    end: endTime,
                    totalHours
                  }];
                  
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
        
        await updateDoc(layoutRef, { 
          rooms: updatedRooms,
          updatedAt: new Date()
        });
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
              devices: room.devices.filter(device => device.deviceId !== deviceId)
            };
          }
          return room;
        });
        
        await updateDoc(layoutRef, { 
          rooms: updatedRooms,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      throw error;
    }
  }
}