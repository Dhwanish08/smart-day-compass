import { useState, useEffect } from "react";
import { Plus, Clock, Calendar, Lightbulb, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Task } from "./TaskCard";
import { checkTimeConflicts, getConflictSeverity } from "@/lib/conflictDetection";

interface AddTaskDialogProps {
  onAddTask: (task: Omit<Task, 'id'>) => void;
  existingTasks: Task[];
}

export const AddTaskDialog = ({ onAddTask, existingTasks }: AddTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Task['type']>('flexible');
  const [frequency, setFrequency] = useState<Task['frequency']>('daily');
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Task['category']>('personal');
  const [flexibleDuration, setFlexibleDuration] = useState<Task['flexibleDuration']>('day');
  const [conflictResult, setConflictResult] = useState<any>(null);

  // Check for conflicts whenever relevant fields change
  useEffect(() => {
    if (startTime && (type === 'daily' || type === 'once')) {
      const newTask: Omit<Task, 'id'> = {
        title,
        type,
        completed: false,
        category,
        frequency: type === 'daily' ? frequency : undefined,
        startTime,
        endTime,
        date: type === 'once' ? date : undefined
      };

      const result = checkTimeConflicts(newTask as Task, existingTasks);
      setConflictResult(result);
    } else {
      setConflictResult(null);
    }
  }, [startTime, endTime, type, frequency, date, category, title, existingTasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Check for conflicts before adding
    if (conflictResult?.hasConflicts) {
      // Show conflict warning but allow user to proceed if they want
      const severity = getConflictSeverity(conflictResult.conflicts);
      if (severity === 'error') {
        // Don't allow adding if there are serious conflicts
        return;
      }
    }

    const newTask: Omit<Task, 'id'> = {
      title: title.trim(),
      type,
      completed: false,
      category,
      ...(type === 'daily' && { frequency }),
      ...(type === 'flexible' && { flexibleDuration }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(date && type === 'once' && { date })
    };

    onAddTask(newTask);
    
    // Reset form
    setTitle("");
    setType('flexible');
    setFrequency('daily');
    setStartTime("");
    setEndTime("");
    setDate("");
    setCategory('personal');
    setFlexibleDuration('day');
    setConflictResult(null);
    setOpen(false);
  };

  const handleSuggestedTime = () => {
    if (conflictResult?.suggestedTime) {
      setStartTime(conflictResult.suggestedTime);
    }
  };

  const taskTypes = [
    { value: 'daily', label: 'Daily', icon: Clock, description: 'Repeats on schedule' },
    { value: 'once', label: 'Once', icon: Calendar, description: 'One-time task' },
    { value: 'flexible', label: 'Flexible', icon: Lightbulb, description: 'AI will schedule' }
  ] as const;

  const frequencyOptions = [
    { value: 'daily', label: 'Every day' },
    { value: 'weekdays', label: 'Monday to Friday' },
    { value: 'monday_to_saturday', label: 'Monday to Saturday' },
    { value: 'weekends', label: 'Saturday & Sunday' },
    { value: 'monday', label: 'Monday only' },
    { value: 'tuesday', label: 'Tuesday only' },
    { value: 'wednesday', label: 'Wednesday only' },
    { value: 'thursday', label: 'Thursday only' },
    { value: 'friday', label: 'Friday only' },
    { value: 'saturday', label: 'Saturday only' },
    { value: 'sunday', label: 'Sunday only' }
  ] as const;

  const flexibleDurationOptions = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' }
  ] as const;

  const getConflictSeverityClass = () => {
    if (!conflictResult?.hasConflicts) return '';
    const severity = getConflictSeverity(conflictResult.conflicts);
    return severity === 'error' ? 'border-destructive bg-destructive/5' : 'border-warning bg-warning/5';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-14 text-lg font-medium">
          <Plus className="mr-2 h-5 w-5" />
          Add New Task
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-medium">
              What do you need to do?
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Take morning medicine, Doctor appointment..."
              className="h-12 text-lg"
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Task Type</Label>
            <div className="grid gap-2">
              {taskTypes.map((taskType) => (
                <button
                  key={taskType.value}
                  type="button"
                  onClick={() => setType(taskType.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                    type === taskType.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <taskType.icon className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">{taskType.label}</div>
                    <div className="text-sm text-muted-foreground">{taskType.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-base font-medium">
              Category
            </Label>
            <Select value={category} onValueChange={(value: Task['category']) => setCategory(value)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medicine">💊 Medicine</SelectItem>
                <SelectItem value="appointment">🏥 Appointment</SelectItem>
                <SelectItem value="work">💼 Work</SelectItem>
                <SelectItem value="school">🎓 School</SelectItem>
                <SelectItem value="family">👨‍👩‍👧‍👦 Family</SelectItem>
                <SelectItem value="personal">👤 Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'daily' && (
            <div className="space-y-2">
              <Label htmlFor="frequency" className="text-base font-medium">
                Frequency
              </Label>
              <Select value={frequency} onValueChange={(value: Task['frequency']) => setFrequency(value)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'flexible' && (
            <div className="space-y-2">
              <Label htmlFor="flexibleDuration" className="text-base font-medium">
                Duration
              </Label>
              <Select value={flexibleDuration} onValueChange={(value: Task['flexibleDuration']) => setFlexibleDuration(value)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {flexibleDurationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === 'daily' || type === 'once') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-base font-medium">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`h-12 ${getConflictSeverityClass()}`}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-base font-medium">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-12"
                  min={startTime}
                />
              </div>
            </div>
          )}

          {type === 'once' && (
            <div className="space-y-2">
              <Label htmlFor="date" className="text-base font-medium">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12"
              />
            </div>
          )}

          {/* Conflict Warning */}
          {conflictResult?.hasConflicts && (
            <Alert className={getConflictSeverityClass()}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <div>
                  {conflictResult.conflicts.map((conflict: any, index: number) => (
                    <div key={index} className="text-sm">
                      ⚠️ {conflict.message}
                    </div>
                  ))}
                </div>
                {conflictResult.suggestedTime && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestedTime}
                    className="mt-2"
                  >
                    Try {conflictResult.suggestedTime} instead
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-12"
              disabled={conflictResult?.hasConflicts && getConflictSeverity(conflictResult.conflicts) === 'error'}
            >
              Add Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};