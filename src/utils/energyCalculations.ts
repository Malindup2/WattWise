/**
 * Calculate duration between start and end time in hours
 * @param start - Start time in "HH:MM" format
 * @param end - End time in "HH:MM" format
 * @returns Duration in hours (decimal)
 */
import { Task } from '../types/actionPlanner';

export const calculateDuration = (start: string, end: string): number => {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  // Handle overnight usage (e.g., 20:00 to 06:00)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours
  }

  const durationMinutes = endMinutes - startMinutes;
  return Math.round((durationMinutes / 60) * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate total power usage for a device
 * @param wattage - Device wattage
 * @param totalHours - Total hours of usage
 * @returns Total power used in kWh
 */
export const calculatePowerUsage = (wattage: number, totalHours: number): number => {
  return Math.round(((wattage * totalHours) / 1000) * 100) / 100; // Convert to kWh and round
};

/**
 * Calculate total daily energy consumption for a room
 * @param devices - Array of devices in the room
 * @returns Total energy consumption in kWh
 */
export const calculateRoomEnergyConsumption = (devices: any[]): number => {
  return devices.reduce((total, device) => {
    const deviceTotal = device.usage.reduce((deviceSum: number, usage: any) => {
      return deviceSum + calculatePowerUsage(device.wattage, usage.totalHours);
    }, 0);
    return total + deviceTotal;
  }, 0);
};

/**
 * Calculate total daily energy consumption for entire layout
 * @param rooms - Array of rooms in the layout
 * @returns Total energy consumption in kWh
 */
export const calculateLayoutEnergyConsumption = (rooms: any[]): number => {
  return rooms.reduce((total, room) => {
    return total + calculateRoomEnergyConsumption(room.devices || []);
  }, 0);
};

/**
 * Format time string for display
 * @param time - Time in "HH:MM" format
 * @returns Formatted time string
 */
export const formatTime = (time: string): string => {
  const [hour, minute] = time.split(':');
  const hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  return `${displayHour}:${minute} ${ampm}`;
};

/**
 * Generate unique ID for rooms and devices
 * @returns Unique string ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const calculateImpactScore = (task: Task) => {
  return (task.energySaved || 0) * 0.6 + (task.moneySaved || 0) * 0.4;
};