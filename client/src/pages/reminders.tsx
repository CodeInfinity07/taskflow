import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Clock, Trash2, CheckCircle, CalendarClock } from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";
import type { Reminder, Task } from "@shared/schema";

type ReminderWithTask = Reminder & { task?: Task | null };

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  medium: { label: "Medium", className: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  high: { label: "High", className: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function RemindersPage() {
  const { toast } = useToast();

  const { data: reminders = [], isLoading } = useQuery<ReminderWithTask[]>({
    queryKey: ["/api/reminders"],
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/reminders/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/due"] });
      toast({ title: "Reminder dismissed" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/due"] });
      toast({ title: "Reminder deleted" });
    },
  });

  const upcomingReminders = reminders.filter((r) => !r.fired && !isPast(new Date(r.reminderTime)));
  const firedReminders = reminders.filter((r) => r.fired || isPast(new Date(r.reminderTime)));

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
          <CalendarClock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-reminders-title">Reminders</h1>
          <p className="text-sm text-muted-foreground">
            {reminders.length === 0
              ? "No reminders set"
              : `${reminders.length} reminder${reminders.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {reminders.length === 0 && (
        <Card className="p-8 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No reminders yet. When you accept a task, you'll be asked to set a reminder.
          </p>
        </Card>
      )}

      {firedReminders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Bell className="h-3.5 w-3.5" />
            Active ({firedReminders.length})
          </h2>
          {firedReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onDismiss={() => dismissMutation.mutate(reminder.id)}
              onDelete={() => deleteMutation.mutate(reminder.id)}
              isActive
            />
          ))}
        </div>
      )}

      {upcomingReminders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Upcoming ({upcomingReminders.length})
          </h2>
          {upcomingReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onDismiss={() => dismissMutation.mutate(reminder.id)}
              onDelete={() => deleteMutation.mutate(reminder.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReminderCard({
  reminder,
  onDismiss,
  onDelete,
  isActive,
}: {
  reminder: ReminderWithTask;
  onDismiss: () => void;
  onDelete: () => void;
  isActive?: boolean;
}) {
  const task = reminder.task;
  const priority = task ? priorityConfig[task.priority] || priorityConfig.medium : null;
  const reminderTime = new Date(reminder.reminderTime);
  const isOverdue = isPast(reminderTime);

  return (
    <Card
      className={`p-4 space-y-2 ${isActive ? "border-primary/30" : ""}`}
      data-testid={`card-reminder-${reminder.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" data-testid={`text-reminder-title-${reminder.id}`}>
            {task?.title || "Unknown Task"}
          </p>
          {task?.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isActive && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onDismiss}
              data-testid={`button-dismiss-reminder-${reminder.id}`}
            >
              <CheckCircle className="h-4 w-4 text-chart-2" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            data-testid={`button-delete-reminder-${reminder.id}`}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {priority && (
          <Badge variant="outline" className={`text-[10px] ${priority.className}`}>
            {priority.label}
          </Badge>
        )}
        <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-chart-4" : "text-muted-foreground"}`}>
          <Clock className="h-3 w-3" />
          <span>
            {isOverdue
              ? `Was ${formatDistanceToNow(reminderTime, { addSuffix: true })}`
              : formatDistanceToNow(reminderTime, { addSuffix: true })}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {format(reminderTime, "MMM d, h:mm a")}
        </span>
      </div>
    </Card>
  );
}
