// src/types/userProfile.ts
export type UserProfile = {
  householdSize: number;
  appliances: string[]; // e.g., ['AC', 'Fridge', 'Washer']
  energyUsage: number; // kWh per month
};
