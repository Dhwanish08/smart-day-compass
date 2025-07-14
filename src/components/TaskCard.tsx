import { Clock, Calendar, Lightbulb, Pill, Check, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface Task {
  id: string;
  title: string;
  type: 'daily' | 'once' | 'flexible';
  frequency?: 'daily' | 'weekdays' | 'monday_to_saturday' | 'weekends' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  completed: boolean;
  startTime?: string;
  endTime?: string;
  date?: string;
  flexibleDuration?: 'day' | 'week';
  priority?: 'low' | 'medium' | 'high';
  category?: 'medicine' | 'appointment' | 'work' | 'family' | 'personal' | 'school';
}

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
}

const getTaskIcon = (type: Task['type']) => {
  switch (type) {
    case 'daily':
      return <Clock className="h-5 w-5" />;
    case 'once':
      return <Calendar className="h-5 w-5" />;
    case 'flexible':
      return <Lightbulb className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
  }
};

const getTaskTypeColor = (type: Task['type']) => {
  switch (type) {
    case 'daily':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'once':
      return 'bg-warning/10 text-warning-foreground border-warning/20';
    case 'flexible':
      return 'bg-accent/10 text-accent-foreground border-accent/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getCategoryIcon = (category?: Task['category']) => {
  if (category === 'medicine') {
    return <Pill className="h-4 w-4 text-warning" />;
  }
  return null;
};

const formatTimeRange = (startTime?: string, endTime?: string) => {
  if (!startTime) return null;
  if (!endTime) return startTime;
  return `${startTime} - ${endTime}`;
};

const getFrequencyLabel = (frequency?: Task['frequency']) => {
  if (!frequency) return '';
  
  const labels = {
    daily: 'Every day',
    weekdays: 'Mon-Fri',
    monday_to_saturday: 'Mon-Sat',
    weekends: 'Sat-Sun',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };
  
  return labels[frequency] || '';
};

export const TaskCard = ({ task, onToggleComplete, onEdit, onDelete }: TaskCardProps) => {
  return (
    <Card className={`p-4 transition-all duration-200 hover:shadow-md ${
      task.completed ? 'bg-accent/5 border-accent/30' : 'bg-card'
    }`}>
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleComplete(task.id)}
          className={`mt-1 h-6 w-6 rounded-full p-0 ${
            task.completed 
              ? 'bg-accent text-accent-foreground hover:bg-accent/80' 
              : 'border-2 border-muted-foreground/30 hover:border-accent hover:bg-accent/10'
          }`}
        >
          {task.completed && <Check className="h-3 w-3" />}
        </Button>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className={`text-lg font-medium ${
              task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}>
              {task.title}
            </h3>
            {getCategoryIcon(task.category)}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium border ${
              getTaskTypeColor(task.type)
            }`}>
              {getTaskIcon(task.type)}
              {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
            </span>

            {task.frequency && task.type === 'daily' && (
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {getFrequencyLabel(task.frequency)}
              </span>
            )}

            {task.flexibleDuration && task.type === 'flexible' && (
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {task.flexibleDuration === 'day' ? 'Today' : 'This Week'}
              </span>
            )}

            {task.startTime && (
              <span className="text-sm text-muted-foreground font-medium">
                {formatTimeRange(task.startTime, task.endTime)}
              </span>
            )}

            {task.date && task.type === 'once' && (
              <span className="text-sm text-muted-foreground">
                {task.date}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id)}
              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};