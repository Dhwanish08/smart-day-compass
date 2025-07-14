import { Task } from "@/components/TaskCard";

export interface TimeConflict {
  conflictingTask: Task;
  conflictType: 'overlap' | 'adjacent' | 'category';
  message: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: TimeConflict[];
  suggestedTime?: string;
}

// Convert time string to minutes for easier comparison
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert minutes back to time string
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Check if two time ranges overlap
const doTimesOverlap = (
  start1: string, 
  end1: string | undefined, 
  start2: string, 
  end2: string | undefined
): boolean => {
  const start1Min = timeToMinutes(start1);
  const end1Min = end1 ? timeToMinutes(end1) : start1Min + 60; // Default 1 hour if no end time
  const start2Min = timeToMinutes(start2);
  const end2Min = end2 ? timeToMinutes(end2) : start2Min + 60; // Default 1 hour if no end time

  return start1Min < end2Min && start2Min < end1Min;
};

// Check if tasks should be compared (same day, same frequency, etc.)
const shouldCompareTasks = (task1: Task, task2: Task): boolean => {
  // Don't compare with completed tasks
  if (task1.completed || task2.completed) return false;

  // Don't compare with flexible tasks (they don't have specific times)
  if (task1.type === 'flexible' || task2.type === 'flexible') return false;

  // For daily tasks, check if they have the same frequency
  if (task1.type === 'daily' && task2.type === 'daily') {
    return task1.frequency === task2.frequency;
  }

  // For once tasks, check if they have the same date
  if (task1.type === 'once' && task2.type === 'once') {
    return task1.date === task2.date;
  }

  // For mixed types, compare daily tasks with the current day
  if (task1.type === 'daily' && task2.type === 'once') {
    // Check if the once task date matches today
    const today = new Date().toISOString().split('T')[0];
    return task2.date === today;
  }

  if (task1.type === 'once' && task2.type === 'daily') {
    // Check if the once task date matches today
    const today = new Date().toISOString().split('T')[0];
    return task1.date === today;
  }

  return false;
};

// Find the next available time slot
const findNextAvailableTime = (
  desiredStart: string,
  existingTasks: Task[],
  taskToCheck: Task
): string => {
  const desiredStartMin = timeToMinutes(desiredStart);
  let currentTime = desiredStartMin;

  // Check every 30 minutes for the next 12 hours
  for (let i = 0; i < 24; i++) {
    const testTime = minutesToTime(currentTime);
    const testEndTime = minutesToTime(currentTime + 60); // Assume 1 hour duration

    // Check if this time slot conflicts with any existing task
    const hasConflict = existingTasks.some(existingTask => {
      if (!shouldCompareTasks(taskToCheck, existingTask)) return false;
      if (!existingTask.startTime) return false;

      return doTimesOverlap(
        testTime,
        testEndTime,
        existingTask.startTime,
        existingTask.endTime
      );
    });

    if (!hasConflict) {
      return testTime;
    }

    currentTime += 30; // Try next 30-minute slot
  }

  return desiredStart; // Return original time if no slot found
};

export const checkTimeConflicts = (
  newTask: Task,
  existingTasks: Task[]
): ConflictCheckResult => {
  const conflicts: TimeConflict[] = [];

  // If the new task doesn't have a start time, no conflicts possible
  if (!newTask.startTime) {
    return { hasConflicts: false, conflicts: [] };
  }

  for (const existingTask of existingTasks) {
    if (!shouldCompareTasks(newTask, existingTask)) continue;
    if (!existingTask.startTime) continue;

    // Check for time overlap
    if (doTimesOverlap(
      newTask.startTime,
      newTask.endTime,
      existingTask.startTime,
      existingTask.endTime
    )) {
      const conflictType = newTask.category === existingTask.category ? 'category' : 'overlap';
      
      let message = '';
      if (conflictType === 'category') {
        message = `You have another ${existingTask.category} task at ${existingTask.startTime}`;
      } else {
        message = `You have another task at ${existingTask.startTime}`;
      }

      conflicts.push({
        conflictingTask: existingTask,
        conflictType,
        message
      });
    }
  }

  const hasConflicts = conflicts.length > 0;
  let suggestedTime: string | undefined;

  if (hasConflicts) {
    suggestedTime = findNextAvailableTime(newTask.startTime, existingTasks, newTask);
  }

  return {
    hasConflicts,
    conflicts,
    suggestedTime
  };
};

export const getConflictSeverity = (conflicts: TimeConflict[]): 'none' | 'warning' | 'error' => {
  if (conflicts.length === 0) return 'none';
  
  // If there are category conflicts (same type of task), it's more serious
  const hasCategoryConflict = conflicts.some(c => c.conflictType === 'category');
  return hasCategoryConflict ? 'error' : 'warning';
}; 