import { useState, useEffect } from "react";
import { Calendar, CheckSquare, Clock, Users, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import { TaskCard, Task } from "@/components/TaskCard";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { DailySchedule } from "@/components/DailySchedule";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { token } = useAuth();
  const [birthday, setBirthday] = useState<string | null>(null);
  const [tasks, setTasks] = useLocalStorage<Task[]>('planner-tasks', []);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { logout } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function fetchProfile() {
      if (!token) return;
      const res = await fetch(`${API_URL}/auth/profile`, {
        
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBirthday(data.birthday || null);
      }
    }
    fetchProfile();
  }, [token]);

  function isBirthdayToday(birthday: string | null) {
    if (!birthday) return false;
    const today = new Date();
    const bday = new Date(birthday);
    return today.getDate() === bday.getDate() && today.getMonth() === bday.getMonth();
  }

  const addTask = (newTask: Omit<Task, 'id'>) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString()
    };
    setTasks(prev => [...prev, task]);
    toast({
      title: "Task added successfully!",
      description: `"${task.title}" has been added to your planner.`
    });
  };

  const toggleTaskComplete = (id: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setEditDialogOpen(true);
  };

  const saveEditedTask = (updatedTask: Task) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === updatedTask.id 
          ? updatedTask
          : task
      )
    );
    toast({
      title: "Task updated successfully!",
      description: `"${updatedTask.title}" has been updated.`
    });
  };

  const deleteTask = (id: string) => {
    const taskToDelete = tasks.find(task => task.id === id);
    setTasks(prev => prev.filter(task => task.id !== id));
    toast({
      title: "Task deleted successfully!",
      description: `"${taskToDelete?.title}" has been removed from your planner.`
    });
  };

  // Helper: Convert HH:mm to minutes
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  // Helper: Convert minutes to HH:mm
  const minutesToTime = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const optimizeSchedule = () => {
    const flexibleTasks = tasks.filter(task => task.type === 'flexible' && !task.completed);
    if (flexibleTasks.length === 0) {
      toast({
        title: "No flexible tasks to optimize",
        description: "Add some flexible tasks to get AI scheduling suggestions."
      });
      return;
    }

    // 1. Gather all scheduled tasks for today, sorted by start time
    const scheduledTasks = tasks.filter(task => task.startTime && !task.completed)
      .map(task => ({
        start: timeToMinutes(task.startTime!),
        end: task.endTime ? timeToMinutes(task.endTime) : timeToMinutes(task.startTime!) + 60
      }))
      .sort((a, b) => a.start - b.start);

    // 1a. Add virtual tasks for sleep (23:00–06:00) and morning routine (06:00–07:00) unless user has tasks in those times
    // Sleep: 23:00–24:00 and 00:00–06:00 (split for day boundary)
    const SLEEP_START_1 = 23 * 60, SLEEP_END_1 = 24 * 60;
    const SLEEP_START_2 = 0, SLEEP_END_2 = 6 * 60;
    const MORNING_START = 6 * 60, MORNING_END = 7 * 60;
    // Check if user has tasks in these times
    const hasTaskIn = (start: number, end: number) => scheduledTasks.some(t => t.start < end && t.end > start);
    if (!hasTaskIn(SLEEP_START_1, SLEEP_END_1)) scheduledTasks.push({ start: SLEEP_START_1, end: SLEEP_END_1 });
    if (!hasTaskIn(SLEEP_START_2, SLEEP_END_2)) scheduledTasks.push({ start: SLEEP_START_2, end: SLEEP_END_2 });
    if (!hasTaskIn(MORNING_START, MORNING_END)) scheduledTasks.push({ start: MORNING_START, end: MORNING_END });
    scheduledTasks.sort((a, b) => a.start - b.start);

    // 2. Define working hours (e.g., 07:00 to 23:00)
    const WORK_START = 7 * 60;
    const WORK_END = 23 * 60;
    let availableSlots = [];
    let lastEnd = WORK_START;
    // Find gaps between scheduled tasks
    for (const t of scheduledTasks) {
      if (t.start - lastEnd >= 60) {
        availableSlots.push({ start: lastEnd, end: t.start });
      }
      lastEnd = Math.max(lastEnd, t.end);
    }
    // Add slot after last scheduled task
    if (WORK_END - lastEnd >= 60) {
      availableSlots.push({ start: lastEnd, end: WORK_END });
    }

    // 3. Assign flexible tasks to earliest available 1-hour slots
    const suggestions: { id: string, suggestedTime: string }[] = [];
    let slotIdx = 0;
    for (const task of flexibleTasks) {
      while (slotIdx < availableSlots.length && availableSlots[slotIdx].end - availableSlots[slotIdx].start < 60) {
        slotIdx++;
      }
      if (slotIdx >= availableSlots.length) break;
      const slot = availableSlots[slotIdx];
      const suggestedTime = minutesToTime(slot.start);
      suggestions.push({ id: task.id, suggestedTime });
      // Move slot start forward by 60 min for next flexible task
      availableSlots[slotIdx].start += 60;
    }

    // 4. Update tasks state with suggested times for flexible tasks
    const updatedTasks = tasks.map(task => {
      if (task.type === 'flexible' && !task.completed) {
        const suggestion = suggestions.find(s => s.id === task.id);
        return suggestion ? { ...task, suggestedTime: suggestion.suggestedTime } : { ...task, suggestedTime: undefined };
      }
      return task;
    });
    setTasks(updatedTasks);

    toast({
      title: "Schedule optimized!",
      description: `AI suggested times for ${suggestions.length} flexible tasks. Check the schedule tab to see suggestions.`
    });
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account."
    });
  };

  const activeTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);
  const dailyTasks = activeTasks.filter(task => task.type === 'daily');
  const onceTasks = activeTasks.filter(task => task.type === 'once');
  const flexibleTasks = activeTasks.filter(task => task.type === 'flexible');

  const stats = [
    { label: 'Total Tasks', value: activeTasks.length, icon: CheckSquare, color: 'text-primary' },
    { label: 'Daily Tasks', value: dailyTasks.length, icon: Clock, color: 'text-primary' },
    { label: 'Appointments', value: onceTasks.length, icon: Calendar, color: 'text-warning' },
    { label: 'Flexible', value: flexibleTasks.length, icon: Users, color: 'text-accent' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Birthday Greeting */}
        {isBirthdayToday(birthday) && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900 text-center text-lg font-semibold shadow">
            Today’s all about you. We’ve cleared the schedule a little — don’t forget to treat yourself and take it easy. 😊
          </div>
        )}
        {/* Header */}
        <div className="text-center mb-8 relative">
          <Link
            to="/profile"
            className="absolute top-0 right-0 rounded-full bg-[#f1f2f4] p-2 hover:bg-[#e0e7ef] transition-colors shadow"
            aria-label="Profile"
          >
            <User className="h-6 w-6 text-[#121416]" />
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Daily Life Planner
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-powered scheduling for a better day
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-4 text-center">
              <stat.icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Add Task Button */}
        <div className="flex justify-center mb-8">
          <AddTaskDialog onAddTask={addTask} existingTasks={tasks} />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="schedule" className="text-lg">
              Today's Schedule
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-lg">
              All Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <DailySchedule 
              tasks={tasks}
              onOptimizeSchedule={optimizeSchedule}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Active Tasks */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Active Tasks ({activeTasks.length})
                </h3>
                <div className="space-y-3">
                  {activeTasks.length === 0 ? (
                    <Card className="p-8 text-center">
                      <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No active tasks. Add your first task to get started!
                      </p>
                    </Card>
                  ) : (
                    activeTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={toggleTaskComplete}
                        onEdit={editTask}
                        onDelete={deleteTask}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Completed Tasks */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Completed Today ({completedTasks.length})
                </h3>
                <div className="space-y-3">
                  {completedTasks.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">
                        Complete tasks to see them here
                      </p>
                    </Card>
                  ) : (
                    completedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={toggleTaskComplete}
                        onEdit={editTask}
                        onDelete={deleteTask}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Task Dialog */}
        <EditTaskDialog
          task={editingTask}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={saveEditedTask}
          existingTasks={tasks}
        />
      </div>
    </div>
  );
};

export default Index;
