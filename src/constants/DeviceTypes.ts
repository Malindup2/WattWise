export const DEVICE_TYPES = {
  LIGHTING: 'lighting',
  APPLIANCES: 'appliances',
  HVAC: 'hvac',
  ELECTRONICS: 'electronics',
  INDUSTRIAL: 'industrial',
  MACHINERY: 'machinery',
  PRODUCTION: 'production',
  OTHER: 'other',
} as const;

export const HOUSEHOLD_DEVICE_PRESETS = [
  // Lighting
  { name: 'LED Bulb', wattage: 9, category: DEVICE_TYPES.LIGHTING, icon: 'bulb-outline' },
  { name: 'CFL Bulb', wattage: 15, category: DEVICE_TYPES.LIGHTING, icon: 'bulb-outline' },
  { name: 'Incandescent Bulb', wattage: 60, category: DEVICE_TYPES.LIGHTING, icon: 'bulb-outline' },
  { name: 'Ceiling Light', wattage: 40, category: DEVICE_TYPES.LIGHTING, icon: 'sunny-outline' },
  { name: 'Floor Lamp', wattage: 25, category: DEVICE_TYPES.LIGHTING, icon: 'flashlight-outline' },

  // Appliances
  { name: 'Refrigerator', wattage: 150, category: DEVICE_TYPES.APPLIANCES, icon: 'snow-outline' },
  {
    name: 'Washing Machine',
    wattage: 500,
    category: DEVICE_TYPES.APPLIANCES,
    icon: 'water-outline',
  },
  {
    name: 'Dishwasher',
    wattage: 1800,
    category: DEVICE_TYPES.APPLIANCES,
    icon: 'restaurant-outline',
  },
  { name: 'Microwave', wattage: 1000, category: DEVICE_TYPES.APPLIANCES, icon: 'radio-outline' },
  { name: 'Oven', wattage: 2400, category: DEVICE_TYPES.APPLIANCES, icon: 'flame-outline' },
  { name: 'Toaster', wattage: 800, category: DEVICE_TYPES.APPLIANCES, icon: 'fast-food-outline' },

  // HVAC
  { name: 'Air Conditioner', wattage: 3500, category: DEVICE_TYPES.HVAC, icon: 'snow-outline' },
  { name: 'Ceiling Fan', wattage: 75, category: DEVICE_TYPES.HVAC, icon: 'refresh-circle-outline' },
  { name: 'Space Heater', wattage: 1500, category: DEVICE_TYPES.HVAC, icon: 'thermometer-outline' },
  {
    name: 'Exhaust Fan',
    wattage: 20,
    category: DEVICE_TYPES.HVAC,
    icon: 'arrow-up-circle-outline',
  },

  // Electronics
  { name: 'Television', wattage: 100, category: DEVICE_TYPES.ELECTRONICS, icon: 'tv-outline' },
  { name: 'Computer', wattage: 300, category: DEVICE_TYPES.ELECTRONICS, icon: 'desktop-outline' },
  { name: 'Laptop', wattage: 65, category: DEVICE_TYPES.ELECTRONICS, icon: 'laptop-outline' },
  {
    name: 'Gaming Console',
    wattage: 150,
    category: DEVICE_TYPES.ELECTRONICS,
    icon: 'game-controller-outline',
  },
  {
    name: 'Sound System',
    wattage: 50,
    category: DEVICE_TYPES.ELECTRONICS,
    icon: 'musical-notes-outline',
  },
  { name: 'Router/Modem', wattage: 12, category: DEVICE_TYPES.ELECTRONICS, icon: 'wifi-outline' },

  // Other
  { name: 'Water Heater', wattage: 4000, category: DEVICE_TYPES.OTHER, icon: 'water-outline' },
  { name: 'Iron', wattage: 1200, category: DEVICE_TYPES.OTHER, icon: 'shirt-outline' },
  { name: 'Hair Dryer', wattage: 1800, category: DEVICE_TYPES.OTHER, icon: 'cut-outline' },
  { name: 'Vacuum Cleaner', wattage: 1400, category: DEVICE_TYPES.OTHER, icon: 'home-outline' },
];

export const INDUSTRIAL_DEVICE_PRESETS = [
  // Industrial Lighting
  {
    name: 'LED High Bay Light',
    wattage: 150,
    category: DEVICE_TYPES.LIGHTING,
    icon: 'sunny-outline',
  },
  {
    name: 'Fluorescent Tube Light',
    wattage: 58,
    category: DEVICE_TYPES.LIGHTING,
    icon: 'flashlight-outline',
  },
  {
    name: 'Emergency Exit Light',
    wattage: 8,
    category: DEVICE_TYPES.LIGHTING,
    icon: 'warning-outline',
  },
  { name: 'Floodlight', wattage: 400, category: DEVICE_TYPES.LIGHTING, icon: 'sunny-outline' },

  // Industrial Machinery
  {
    name: 'Conveyor Belt Motor',
    wattage: 5000,
    category: DEVICE_TYPES.MACHINERY,
    icon: 'arrow-forward-outline',
  },
  {
    name: 'Industrial Pump',
    wattage: 7500,
    category: DEVICE_TYPES.MACHINERY,
    icon: 'water-outline',
  },
  {
    name: 'Forklift Charger',
    wattage: 3000,
    category: DEVICE_TYPES.MACHINERY,
    icon: 'car-outline',
  },
  { name: 'Compressor', wattage: 15000, category: DEVICE_TYPES.MACHINERY, icon: 'cloud-outline' },
  { name: 'Crane Motor', wattage: 25000, category: DEVICE_TYPES.MACHINERY, icon: 'build-outline' },

  // Production Equipment
  { name: 'CNC Machine', wattage: 12000, category: DEVICE_TYPES.PRODUCTION, icon: 'cog-outline' },
  {
    name: 'Welding Station',
    wattage: 8000,
    category: DEVICE_TYPES.PRODUCTION,
    icon: 'flash-outline',
  },
  {
    name: 'Assembly Line Robot',
    wattage: 6000,
    category: DEVICE_TYPES.PRODUCTION,
    icon: 'build-outline',
  },
  {
    name: 'Industrial Oven',
    wattage: 20000,
    category: DEVICE_TYPES.PRODUCTION,
    icon: 'flame-outline',
  },
  {
    name: 'Packaging Machine',
    wattage: 4000,
    category: DEVICE_TYPES.PRODUCTION,
    icon: 'cube-outline',
  },

  // Industrial HVAC
  {
    name: 'Industrial Air Handler',
    wattage: 10000,
    category: DEVICE_TYPES.HVAC,
    icon: 'snow-outline',
  },
  {
    name: 'Exhaust Fan System',
    wattage: 2500,
    category: DEVICE_TYPES.HVAC,
    icon: 'arrow-up-circle-outline',
  },
  {
    name: 'Industrial Heater',
    wattage: 15000,
    category: DEVICE_TYPES.HVAC,
    icon: 'thermometer-outline',
  },
  {
    name: 'Ventilation System',
    wattage: 5000,
    category: DEVICE_TYPES.HVAC,
    icon: 'refresh-circle-outline',
  },

  // Industrial Electronics
  {
    name: 'Server Rack',
    wattage: 2000,
    category: DEVICE_TYPES.ELECTRONICS,
    icon: 'server-outline',
  },
  {
    name: 'Industrial Computer',
    wattage: 500,
    category: DEVICE_TYPES.ELECTRONICS,
    icon: 'desktop-outline',
  },
  { name: 'Control Panel', wattage: 300, category: DEVICE_TYPES.ELECTRONICS, icon: 'grid-outline' },
  {
    name: 'Security System',
    wattage: 150,
    category: DEVICE_TYPES.ELECTRONICS,
    icon: 'shield-outline',
  },
  {
    name: 'Communication Equipment',
    wattage: 100,
    category: DEVICE_TYPES.ELECTRONICS,
    icon: 'radio-outline',
  },

  // Other Industrial
  {
    name: 'Loading Dock Equipment',
    wattage: 3000,
    category: DEVICE_TYPES.OTHER,
    icon: 'cube-outline',
  },
  { name: 'Fire Safety System', wattage: 200, category: DEVICE_TYPES.OTHER, icon: 'flame-outline' },
  {
    name: 'Water Treatment System',
    wattage: 5000,
    category: DEVICE_TYPES.OTHER,
    icon: 'water-outline',
  },
];

// Combined presets for backward compatibility
export const DEVICE_PRESETS = HOUSEHOLD_DEVICE_PRESETS;

export const ROOM_ICONS = {
  // Household rooms
  Bedroom: 'bed-outline',
  Kitchen: 'restaurant-outline',
  'Living Room': 'tv-outline',
  Bathroom: 'water-outline',
  'Dining Room': 'restaurant-outline',
  Study: 'library-outline',
  Office: 'briefcase-outline',
  Garage: 'car-outline',
  'Laundry Room': 'shirt-outline',
  Basement: 'home-outline',
  Attic: 'home-outline',
  Balcony: 'leaf-outline',
  Garden: 'flower-outline',

  // Industrial rooms
  'Production Area': 'build-outline',
  'Manufacturing Floor': 'construct-outline',
  'Assembly Line': 'repeat-outline',
  'Quality Control': 'checkmark-circle-outline',
  'Storage Area': 'cube-outline',
  Warehouse: 'business-outline',
  'Loading Dock': 'car-outline',
  'Shipping Area': 'send-outline',
  'Receiving Area': 'download-outline',
  'Office Space': 'briefcase-outline',
  'Control Room': 'grid-outline',
  'Server Room': 'server-outline',
  'Maintenance Room': 'build-outline',
  'Tool Storage': 'hammer-outline',
  'Break Room': 'cafe-outline',
  Cafeteria: 'restaurant-outline',
  'Conference Room': 'people-outline',
  'Training Room': 'school-outline',
  'Security Office': 'shield-outline',
  'Clean Room': 'medical-outline',
  Laboratory: 'flask-outline',
  'Research Lab': 'bulb-outline',
  'Testing Facility': 'checkmark-outline',
  'Chemical Storage': 'warning-outline',
  'Electrical Room': 'flash-outline',
  'HVAC Room': 'snow-outline',
  'Utility Room': 'settings-outline',
  'Emergency Room': 'medical-outline',
  Restroom: 'person-outline',
  'Locker Room': 'lock-closed-outline',

  default: 'home-outline',
} as const;
