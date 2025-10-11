import { Task } from '../types/actionPlanner';

// Sample static tasks (replace with Firebase later)
export const fetchTasks = async (): Promise<Task[]> => {
  return [
    {
      id: '1',
      title: 'Turn off unused lights',
      description: 'Switch off lights in rooms not in use.',
      goalType: 'short',
      completed: false,
      energySaved: 2,
      moneySaved: 5,
      reminderDate: '2025-10-12',
    },
    {
      id: '2',
      title: 'Clean refrigerator coils',
      description: 'Improves efficiency by 10%.',
      goalType: 'medium',
      completed: false,
      energySaved: 10,
      moneySaved: 20,
      reminderDate: '2025-10-15',
    },
    {
      id: '3',
      title: 'Install solar panels',
      description: 'Long-term renewable energy solution.',
      goalType: 'long',
      completed: false,
      energySaved: 150,
      moneySaved: 500,
      reminderDate: '2025-12-01',
    },
  ];
};
