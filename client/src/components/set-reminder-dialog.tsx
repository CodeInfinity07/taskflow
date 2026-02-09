import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Clock, CalendarClock } from "lucide-react";

interface SetReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  onComplete?: () => void;
}

export function SetReminderDialog({ open, onOpenChange, taskId, taskTitle, onComplete }: SetReminderDialogProps) {
  const { toast } = useToast();

  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    now.setSeconds(0, 0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const [reminderTime, setReminderTime] = useState(getDefaultDateTime);

  const createReminderMutation = useMutation({
    mutationFn: (data: { taskId: string; reminderTime: string }) =>
      apiRequest("POST", "/api/reminders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder set", description: `You'll be reminded about "${taskTitle}"` });
      onOpenChange(false);
      onComplete?.();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create reminder.", variant: "destructive" });
    },
  });

  const handleSetReminder = () => {
    if (!reminderTime) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }
    createReminderMutation.mutate({ taskId, reminderTime: new Date(reminderTime).toISOString() });
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete?.();
  };

  const quickOptions = [
    { label: "In 15 min", minutes: 15 },
    { label: "In 1 hour", minutes: 60 },
    { label: "In 3 hours", minutes: 180 },
    { label: "Tomorrow 9 AM", minutes: -1 },
  ];

  const handleQuickOption = (minutes: number) => {
    if (minutes === -1) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, "0");
      setReminderTime(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T09:00`);
    } else {
      const d = new Date();
      d.setMinutes(d.getMinutes() + minutes);
      d.setSeconds(0, 0);
      const pad = (n: number) => n.toString().padStart(2, "0");
      setReminderTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Set a Reminder
          </DialogTitle>
          <DialogDescription>
            When would you like to be reminded about "{taskTitle}"?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((opt) => (
              <Button
                key={opt.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickOption(opt.minutes)}
                data-testid={`button-quick-reminder-${opt.minutes}`}
              >
                <Clock className="h-3 w-3 mr-1.5" />
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-time">Custom date & time</Label>
            <Input
              id="reminder-time"
              type="datetime-local"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              data-testid="input-reminder-time"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleSkip}
            data-testid="button-skip-reminder"
          >
            Skip
          </Button>
          <Button
            onClick={handleSetReminder}
            disabled={createReminderMutation.isPending}
            data-testid="button-set-reminder"
          >
            {createReminderMutation.isPending ? "Setting..." : "Set Reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
