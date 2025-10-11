import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { AuthService } from './firebase';
import { Task } from '../types/actionPlanner';
import { UserProfile } from '../types/userProfile';

// Static blueprints for initial task generation
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

// Generate personalized tasks based on user profile (used for initial setup)
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

export class ActionPlannerService {
  // Get user's action plan from Firebase
  static async getUserActionPlan(): Promise<Task[]> {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to access action plan');
      }

      // Query for user's action plan document
      const q = query(collection(db, 'user_action_plans'), where('userId', '==', currentUser.uid));

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // User has an existing action plan
        const actionPlanDoc = querySnapshot.docs[0];
        const actionPlanData = actionPlanDoc.data();
        return actionPlanData.tasks || [];
      } else {
        // No action plan exists, create one with default tasks
        console.log('📝 No action plan found, creating default plan for user');
        const defaultTasks = await this.createDefaultActionPlan();
        return defaultTasks;
      }
    } catch (error) {
      console.error('❌ Error getting user action plan:', error);
      throw error;
    }
  }

  // Create default action plan for new user
  static async createDefaultActionPlan(): Promise<Task[]> {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to create action plan');
      }

      // Get user profile (you might want to fetch this from user document)
      const userProfile: UserProfile = {
        householdSize: 4,
        appliances: ['AC', 'Fridge', 'Washer'],
        energyUsage: 350,
      };

      const defaultTasks = generateTasks(userProfile);

      // Create action plan document
      const actionPlanData = {
        userId: currentUser.uid,
        tasks: defaultTasks,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'user_action_plans'), actionPlanData);
      console.log('✅ Default action plan created for user');

      return defaultTasks;
    } catch (error) {
      console.error('❌ Error creating default action plan:', error);
      throw error;
    }
  }

  // Update a specific task's completion status
  static async updateTaskCompletion(taskId: string, completed: boolean): Promise<void> {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to update tasks');
      }

      // Find user's action plan document
      const q = query(collection(db, 'user_action_plans'), where('userId', '==', currentUser.uid));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No action plan found for user');
      }

      const actionPlanDoc = querySnapshot.docs[0];
      const actionPlanData = actionPlanDoc.data();
      const tasks: Task[] = actionPlanData.tasks || [];

      // Update the specific task
      const updatedTasks = tasks.map(task => (task.id === taskId ? { ...task, completed } : task));

      // Update the document
      await updateDoc(actionPlanDoc.ref, {
        tasks: updatedTasks,
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Task ${taskId} completion status updated to ${completed}`);
    } catch (error) {
      console.error('❌ Error updating task completion:', error);
      throw error;
    }
  }

  // Update multiple tasks at once (for bulk operations)
  static async updateTasks(updatedTasks: Task[]): Promise<void> {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to update tasks');
      }

      // Find user's action plan document
      const q = query(collection(db, 'user_action_plans'), where('userId', '==', currentUser.uid));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No action plan found for user');
      }

      const actionPlanDoc = querySnapshot.docs[0];

      // Update the document with all tasks
      await updateDoc(actionPlanDoc.ref, {
        tasks: updatedTasks,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ All tasks updated successfully');
    } catch (error) {
      console.error('❌ Error updating tasks:', error);
      throw error;
    }
  }

  // Add a custom task to user's action plan
  static async addCustomTask(task: Omit<Task, 'id'>): Promise<void> {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to add tasks');
      }

      // Find user's action plan document
      const q = query(collection(db, 'user_action_plans'), where('userId', '==', currentUser.uid));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No action plan found for user');
      }

      const actionPlanDoc = querySnapshot.docs[0];
      const actionPlanData = actionPlanDoc.data();
      const tasks: Task[] = actionPlanData.tasks || [];

      // Generate new ID
      const newId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newTask: Task = { ...task, id: newId };

      // Add the new task
      const updatedTasks = [...tasks, newTask];

      // Update the document
      await updateDoc(actionPlanDoc.ref, {
        tasks: updatedTasks,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Custom task added successfully');
    } catch (error) {
      console.error('❌ Error adding custom task:', error);
      throw error;
    }
  }

  // Delete a task from user's action plan
  static async deleteTask(taskId: string): Promise<void> {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to delete tasks');
      }

      // Find user's action plan document
      const q = query(collection(db, 'user_action_plans'), where('userId', '==', currentUser.uid));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No action plan found for user');
      }

      const actionPlanDoc = querySnapshot.docs[0];
      const actionPlanData = actionPlanDoc.data();
      const tasks: Task[] = actionPlanData.tasks || [];

      // Remove the task
      const updatedTasks = tasks.filter(task => task.id !== taskId);

      // Update the document
      await updateDoc(actionPlanDoc.ref, {
        tasks: updatedTasks,
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Task ${taskId} deleted successfully`);
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }
}
