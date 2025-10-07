export const DEVICE_TYPES = {
  LIGHTING: 'lighting',
  APPLIANCES: 'appliances',
  HVAC: 'hvac',
  ELECTRONICS: 'electronics',
  OTHER: 'other'
} as const;

export const DEVICE_PRESETS = [
  // Lighting
  { name: 'LED Bulb', wattage: 9, category: DEVICE_TYPES.LIGHTING, icon: 'bulb-outline' },
  { name: 'CFL Bulb', wattage: 15, category: DEVICE_TYPES.LIGHTING, icon: 'bulb-outline' },
  { name: 'Incandescent Bulb', wattage: 60, category: DEVICE_TYPES.LIGHTING, icon: 'bulb-outline' },
  { name: 'Ceiling Light', wattage: 40, category: DEVICE_TYPES.LIGHTING, icon: 'sunny-outline' },
  { name: 'Floor Lamp', wattage: 25, category: DEVICE_TYPES.LIGHTING, icon: 'flashlight-outline' },
  
  // Appliances
  { name: 'Refrigerator', wattage: 150, category: DEVICE_TYPES.APPLIANCES, icon: 'snow-outline' },
  { name: 'Washing Machine', wattage: 500, category: DEVICE_TYPES.APPLIANCES, icon: 'water-outline' },
  { name: 'Dishwasher', wattage: 1800, category: DEVICE_TYPES.APPLIANCES, icon: 'restaurant-outline' },
  { name: 'Microwave', wattage: 1000, category: DEVICE_TYPES.APPLIANCES, icon: 'radio-outline' },
  { name: 'Oven', wattage: 2400, category: DEVICE_TYPES.APPLIANCES, icon: 'flame-outline' },
  { name: 'Toaster', wattage: 800, category: DEVICE_TYPES.APPLIANCES, icon: 'fast-food-outline' },
  
  // HVAC
  { name: 'Air Conditioner', wattage: 3500, category: DEVICE_TYPES.HVAC, icon: 'snow-outline' },
  { name: 'Ceiling Fan', wattage: 75, category: DEVICE_TYPES.HVAC, icon: 'refresh-circle-outline' },
  { name: 'Space Heater', wattage: 1500, category: DEVICE_TYPES.HVAC, icon: 'thermometer-outline' },
  { name: 'Exhaust Fan', wattage: 20, category: DEVICE_TYPES.HVAC, icon: 'arrow-up-circle-outline' },
  
  // Electronics
  { name: 'Television', wattage: 100, category: DEVICE_TYPES.ELECTRONICS, icon: 'tv-outline' },
  { name: 'Computer', wattage: 300, category: DEVICE_TYPES.ELECTRONICS, icon: 'desktop-outline' },
  { name: 'Laptop', wattage: 65, category: DEVICE_TYPES.ELECTRONICS, icon: 'laptop-outline' },
  { name: 'Gaming Console', wattage: 150, category: DEVICE_TYPES.ELECTRONICS, icon: 'game-controller-outline' },
  { name: 'Sound System', wattage: 50, category: DEVICE_TYPES.ELECTRONICS, icon: 'musical-notes-outline' },
  { name: 'Router/Modem', wattage: 12, category: DEVICE_TYPES.ELECTRONICS, icon: 'wifi-outline' },
  
  // Other
  { name: 'Water Heater', wattage: 4000, category: DEVICE_TYPES.OTHER, icon: 'water-outline' },
  { name: 'Iron', wattage: 1200, category: DEVICE_TYPES.OTHER, icon: 'shirt-outline' },
  { name: 'Hair Dryer', wattage: 1800, category: DEVICE_TYPES.OTHER, icon: 'cut-outline' },
  { name: 'Vacuum Cleaner', wattage: 1400, category: DEVICE_TYPES.OTHER, icon: 'home-outline' },
];

export const ROOM_ICONS = {
  'Bedroom': 'bed-outline',
  'Kitchen': 'restaurant-outline',
  'Living Room': 'tv-outline',
  'Bathroom': 'water-outline',
  'Dining Room': 'restaurant-outline',
  'Study': 'library-outline',
  'Office': 'briefcase-outline',
  'Garage': 'car-outline',
  'Laundry Room': 'shirt-outline',
  'Basement': 'home-outline',
  'Attic': 'home-outline',
  'Balcony': 'leaf-outline',
  'Garden': 'flower-outline',
  'default': 'home-outline'
} as const;