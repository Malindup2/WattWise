export type Task = {
  id: string;
  title: string;
  description: string;
  goalType: 'short' | 'medium' | 'long';
  completed: boolean;
  energySaved?: number; // kWh
  moneySaved?: number; // $
  reminderDate?: string; // YYYY-MM-DD

  // New optional properties for recurring/scheduled tasks
  recurrence?: 'daily' | 'weekly' | 'monthly'; // recurrence type
  scheduledDate?: string; // YYYY-MM-DD
};

export type GoalSection = {
  type: 'short' | 'medium' | 'long';
  title: string;
  tasks: Task[];
};
