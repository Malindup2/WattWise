export interface DeviceUsage {
  start: string; // Format: "HH:MM"
  end: string; // Format: "HH:MM"
  totalHours: number;
}

export interface Device {
  deviceId: string;
  deviceName: string;
  wattage: number;
  usage: DeviceUsage[];
  totalPowerUsed?: number; // wattage * totalHours
}

export interface Room {
  roomId: string;
  roomName: string;
  devices: Device[];
}

export interface Layout {
  id?: string;
  layoutName: string;
  area: number;
  rooms: Room[];
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LayoutSection {
  name: string;
  count: number;
}

export interface BlueprintLayout {
  id: string;
  name: string;
  area: number;
  type: 'household' | 'industrial';
  sections: LayoutSection[];
}
