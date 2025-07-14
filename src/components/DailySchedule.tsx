import { Clock, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Task } from "./TaskCard";

interface ScheduleItem {
  time: string;
  task: Task;
  type: 'scheduled' | 'flexible';
}

interface DailyScheduleProps {
  tasks: Task[];
  onOptimizeSchedule: () => void;
}

// Check if a task should be shown today based on its frequency
const shouldShowTaskToday = (task: Task): boolean => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[dayOfWeek];

  // If task has no frequency, show it (backward compatibility)
  if (!task.frequency) return true;

  switch (task.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    case 'monday_to_saturday':
      return dayOfWeek >= 1 && dayOfWeek <= 6; // Monday to Saturday
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6; // Saturday or Sunday
    case 'monday':
    case 'tuesday':
    case 'wednesday':
    case 'thursday':
    case 'friday':
    case 'saturday':
    case 'sunday':
      return task.frequency === todayName;
    default:
      return true;
  }
};

// Generate schedule based only on user-added tasks
const generateSchedule = (tasks: Task[]): ScheduleItem[] => {
  const schedule: ScheduleItem[] = [];
  
  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];
  
  // Filter tasks for today
  const todaysTasks = tasks.filter(task => {
    if (task.completed) return false;
    
    // Daily tasks - check frequency
    if (task.type === 'daily') {
      return shouldShowTaskToday(task);
    }
    
    // Once tasks are included if they have today's date or no specific date
    if (task.type === 'once') {
      return !task.date || task.date === today;
    }
    
    // Flexible tasks - check duration
    if (task.type === 'flexible') {
      if (task.flexibleDuration === 'day') {
        return true; // Show today's flexible tasks
      } else if (task.flexibleDuration === 'week') {
        // For week-long flexible tasks, show them all week
        return true;
      }
      return true; // Default for backward compatibility
    }
    
    return false;
  });

  // Sort tasks by start time (scheduled tasks first, then flexible)
  const scheduledTasks = todaysTasks.filter(task => task.startTime).sort((a, b) => {
    return (a.startTime || '').localeCompare(b.startTime || '');
  });
  
  const flexibleTasks = todaysTasks.filter(task => !task.startTime);

  // Add scheduled tasks with their times
  scheduledTasks.forEach(task => {
    const timeDisplay = task.endTime 
      ? `${task.startTime} - ${task.endTime}`
      : task.startTime!;
    
    schedule.push({
      time: timeDisplay,
      task,
      type: 'scheduled'
    });
  });

  // Add flexible tasks without specific times (they'll be shown separately)
  flexibleTasks.forEach(task => {
    schedule.push({
      time: 'Flexible',
      task,
      type: 'flexible'
    });
  });

  return schedule;
};

export const DailySchedule = ({ tasks, onOptimizeSchedule }: DailyScheduleProps) => {
  const schedule = generateSchedule(tasks);
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const scheduledTasks = schedule.filter(item => item.type === 'scheduled');
  // Only show flexible tasks whose suggestedTime is in the future (for today)
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const flexibleTasks = schedule.filter(item => {
    if (item.type !== 'flexible') return false;
    if (!item.task.suggestedTime) return true; // Show if no suggestion
    // Parse suggestedTime (HH:mm)
    const [h, m] = item.task.suggestedTime.split(':').map(Number);
    const taskMinutes = h * 60 + m;
    return taskMinutes > nowMinutes;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Today's Schedule</h2>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <Button 
          onClick={onOptimizeSchedule}
          variant="outline"
          className="h-12"
        >
          <Brain className="mr-2 h-4 w-4" />
          Optimize Schedule
        </Button>
      </div>

      {/* Scheduled Tasks */}
      {scheduledTasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Scheduled Tasks</h3>
          <div className="space-y-2">
            {scheduledTasks.map((item, index) => (
              <Card 
                key={index} 
                className="p-4 transition-all duration-200 bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-lg font-bold text-primary">
                      {item.time}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="space-y-1">
                      <h3 className="font-medium text-foreground">
                        {item.task.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.task.type === 'daily' 
                            ? 'bg-primary/10 text-primary'
                            : item.task.type === 'once'
                            ? 'bg-warning/10 text-warning-foreground'
                            : 'bg-accent/10 text-accent-foreground'
                        }`}>
                          {item.task.type}
                        </span>
                        {item.task.frequency && item.task.type === 'daily' && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {item.task.frequency === 'daily' ? 'Every day' : 
                             item.task.frequency === 'weekdays' ? 'Mon-Fri' :
                             item.task.frequency === 'weekends' ? 'Sat-Sun' :
                             item.task.frequency.charAt(0).toUpperCase() + item.task.frequency.slice(1)}
                          </span>
                        )}
                        {item.task.category && (
                          <span className="text-xs text-muted-foreground">
                            {item.task.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Flexible Tasks */}
      {flexibleTasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Flexible Tasks</h3>
          <div className="space-y-2">
            {flexibleTasks.map((item, index) => (
              <Card 
                key={index} 
                className="p-4 transition-all duration-200 bg-accent/5 border-accent/30 border-l-4 border-l-accent"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-lg font-bold text-accent">
                      Flexible
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="space-y-1">
                      <h3 className="font-medium text-foreground">
                        {item.task.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-accent/10 text-accent-foreground">
                          flexible
                        </span>
                        {item.task.flexibleDuration && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {item.task.flexibleDuration === 'day' ? 'Today' : 'This Week'}
                          </span>
                        )}
                        {item.task.category && (
                          <span className="text-xs text-muted-foreground">
                            {item.task.category}
                          </span>
                        )}
                        {item.task.suggestedTime && (
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Suggested: {item.task.suggestedTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-1 rounded">
                    AI Suggested
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {schedule.length === 0 && (
        <Card className="p-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">
            No tasks scheduled for today. Add some tasks to get started!
          </p>
        </Card>
      )}
    </div>
  );
};