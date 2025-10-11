// src/services/blueprintService.ts
import { Task } from '../types/actionPlanner';
import { UserProfile } from '../types/userProfile';

export const blueprints = {
  shortTerm: [
    {
      title: 'Turn off unused lights',
      description: 'Switch off lights in rooms not in use.',
      energySaved: 2,
      moneySaved: 5,
    },
    {
      title: 'Clean refrigerator coils',
      description: 'Improves efficiency.',
      energySaved: 3,
      moneySaved: 6,
    },
    {
      title: 'Clean AC filter',
      description: 'Improves AC efficiency.',
      energySaved: 5,
      moneySaved: 10,
    },
  ],
  mediumTerm: [
    {
      title: 'Upgrade LED bulbs',
      description: 'Replace old bulbs with LED.',
      energySaved: 10,
      moneySaved: 20,
    },
    {
      title: 'Insulate windows',
      description: 'Reduce heat loss.',
      energySaved: 15,
      moneySaved: 30,
    },
  ],
  longTerm: [
    {
      title: 'Install solar panels',
      description: 'Invest in renewable energy.',
      energySaved: 150,
      moneySaved: 500,
    },
  ],
};

// Generate personalized tasks based on user profile
export const generateTasks = (user: UserProfile): Task[] => {
  const tasks: Task[] = [];
  let idCounter = 1;

  Object.entries(blueprints).forEach(([goalType, taskList]) => {
    taskList.forEach(t => {
      // Rule-based personalization
      let assignGoalType = goalType; // default

      if (t.title.includes('AC') && user.appliances.includes('AC')) assignGoalType = 'shortTerm';
      if (t.title.includes('solar') && user.householdSize <= 2) assignGoalType = 'mediumTerm';

      tasks.push({
        id: idCounter.toString(),
        title: t.title,
        description: t.description,
        goalType:
          assignGoalType === 'shortTerm'
            ? 'short'
            : assignGoalType === 'mediumTerm'
              ? 'medium'
              : 'long',
        completed: false,
        energySaved: t.energySaved,
        moneySaved: t.moneySaved,
        reminderDate: '', // optional: add if needed
      });
      idCounter++;
    });
  });

  return tasks;
};
