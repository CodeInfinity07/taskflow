import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import type { Reminder, Task } from "@shared/schema";

type ReminderWithTask = Reminder & { task?: Task | null };

function generateNotificationTone(audioContext: AudioContext) {
  const now = audioContext.currentTime;

  const notes = [
    { freq: 587.33, start: 0, dur: 0.15 },
    { freq: 783.99, start: 0.18, dur: 0.15 },
    { freq: 880, start: 0.36, dur: 0.25 },
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.3, now + start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now + start);
    osc.stop(now + start + dur);
  });
}

export function ReminderAlert() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeReminders, setActiveReminders] = useState<ReminderWithTask[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousDueIdsRef = useRef<Set<string>>(new Set());

  const { data: dueReminders = [] } = useQuery<ReminderWithTask[]>({
    queryKey: ["/api/reminders/due"],
    refetchInterval: 15000,
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/reminders/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/due"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });

  const playSound = useCallback(() => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().then(() => generateNotificationTone(ctx));
      } else {
        generateNotificationTone(ctx);
      }
    } catch (e) {
      console.warn("Could not play notification sound:", e);
    }
  }, []);

  useEffect(() => {
    if (dueReminders.length > 0) {
      const hasNewReminders = dueReminders.some((r) => !previousDueIdsRef.current.has(r.id));

      if (hasNewReminders) {
        playSound();
        setActiveReminders(dueReminders);
        setModalOpen(true);
      } else {
        setActiveReminders(dueReminders);
      }

      previousDueIdsRef.current = new Set(dueReminders.map((r) => r.id));
    } else {
      if (activeReminders.length > 0) {
        setActiveReminders([]);
        setModalOpen(false);
      }
      previousDueIdsRef.current = new Set();
    }
  }, [dueReminders, playSound]);

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id);
    setActiveReminders((prev) => prev.filter((r) => r.id !== id));
    previousDueIdsRef.current.delete(id);
    if (activeReminders.length <= 1) {
      setModalOpen(false);
    }
  };

  const handleDismissAll = () => {
    activeReminders.forEach((r) => dismissMutation.mutate(r.id));
    setActiveReminders([]);
    previousDueIdsRef.current.clear();
    setModalOpen(false);
  };

  const priorityConfig: Record<string, { label: string; className: string }> = {
    low: { label: "Low", className: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
    medium: { label: "Medium", className: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
    high: { label: "High", className: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
    urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/20" },
  };

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            {activeReminders.length === 1 ? "Task Reminder" : `${activeReminders.length} Task Reminders`}
          </DialogTitle>
          <DialogDescription>
            {activeReminders.length === 1
              ? "Time to check on your task!"
              : "You have multiple tasks that need your attention."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-80">
          <div className="space-y-3 pr-2">
            {activeReminders.map((reminder) => {
              const task = reminder.task;
              const priority = task ? priorityConfig[task.priority] || priorityConfig.medium : null;

              return (
                <Card key={reminder.id} className="p-3 space-y-2" data-testid={`reminder-alert-${reminder.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {task?.title || "Unknown Task"}
                      </p>
                      {task?.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDismiss(reminder.id)}
                      data-testid={`button-dismiss-reminder-${reminder.id}`}
                    >
                      <CheckCircle className="h-4 w-4 text-chart-2" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {priority && (
                      <Badge variant="outline" className={`text-[10px] ${priority.className}`}>
                        {priority.label}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(reminder.reminderTime), "MMM d, h:mm a")}</span>
                    </div>
                    {task?.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Due: {format(new Date(task.dueDate), "MMM d")}</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          {activeReminders.length > 1 && (
            <Button
              variant="outline"
              onClick={handleDismissAll}
              data-testid="button-dismiss-all-reminders"
            >
              Dismiss All
            </Button>
          )}
          <Button
            onClick={() => setModalOpen(false)}
            data-testid="button-close-reminder-modal"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
