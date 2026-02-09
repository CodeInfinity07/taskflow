import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MoreVertical, Check, X, Trash2, ArrowRight, GripVertical } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { SetReminderDialog } from "./set-reminder-dialog";
import { useState } from "react";

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  medium: { label: "Medium", className: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  high: { label: "High", className: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  accepted: { label: "Accepted", className: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  declined: { label: "Declined", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

interface TaskCardProps {
  task: Task;
  assignee?: User | null;
  boardId: string;
  isWorkplace?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export function TaskCard({ task, assignee, boardId, isWorkplace, onDragStart }: TaskCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAssignedToMe = task.assigneeId === user?.id;
  const isMyTask = task.creatorId === user?.id;
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/tasks/${task.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/tasks/${task.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
    },
  });

  const getDueDateInfo = () => {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate);
    const overdue = isPast(due) && task.column !== "done";
    const today = isToday(due);
    const tomorrow = isTomorrow(due);
    const daysLeft = differenceInDays(due, new Date());

    let label = format(due, "MMM d");
    let className = "text-muted-foreground";

    if (overdue) {
      label = "Overdue";
      className = "text-destructive";
    } else if (today) {
      label = "Today";
      className = "text-chart-4";
    } else if (tomorrow) {
      label = "Tomorrow";
      className = "text-chart-3";
    } else if (daysLeft <= 3) {
      label = `${daysLeft}d left`;
      className = "text-chart-3";
    }

    return { label, className };
  };

  const dueDateInfo = getDueDateInfo();
  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  const moveToColumn = (col: string) => {
    updateMutation.mutate({ column: col });
  };

  return (
    <>
    <Card
      className="p-3 space-y-2.5 group cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => onDragStart?.(e, task.id)}
      data-testid={`card-task-${task.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ visibility: "visible" }}>
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <h4 className="text-sm font-medium flex-1 leading-snug">{task.title}</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
              style={{ visibility: "visible" }}
              data-testid={`button-task-menu-${task.id}`}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {task.column !== "todo" && (
              <DropdownMenuItem onClick={() => moveToColumn("todo")}>
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                Move to To Do
              </DropdownMenuItem>
            )}
            {task.column !== "in_progress" && (
              <DropdownMenuItem onClick={() => moveToColumn("in_progress")}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Move to In Progress
              </DropdownMenuItem>
            )}
            {task.column !== "done" && (
              <DropdownMenuItem onClick={() => moveToColumn("done")}>
                <Check className="mr-2 h-4 w-4" />
                Move to Done
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => deleteMutation.mutate()}
              className="text-destructive"
              data-testid={`button-delete-task-${task.id}`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${priority.className}`}>
          {priority.label}
        </Badge>
        {isWorkplace && task.assigneeId && task.status !== "pending" && (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${statusConfig[task.status]?.className || ""}`}>
            {statusConfig[task.status]?.label}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {dueDateInfo && (
            <div className={`flex items-center gap-1 text-xs ${dueDateInfo.className}`}>
              <Calendar className="h-3 w-3" />
              <span>{dueDateInfo.label}</span>
            </div>
          )}
          {task.reminderDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isWorkplace && isAssignedToMe && task.status === "pending" && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  updateMutation.mutate({ status: "accepted" }, {
                    onSuccess: () => setReminderDialogOpen(true),
                  });
                }}
                data-testid={`button-accept-task-${task.id}`}
              >
                <Check className="h-3.5 w-3.5 text-chart-2" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => updateMutation.mutate({ status: "declined" })}
                data-testid={`button-decline-task-${task.id}`}
              >
                <X className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          )}
          {assignee && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={assignee.profileImageUrl || undefined} />
              <AvatarFallback className="text-[8px]">
                {(assignee.firstName?.[0] || "").toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </Card>

    <SetReminderDialog
      open={reminderDialogOpen}
      onOpenChange={setReminderDialogOpen}
      taskId={task.id}
      taskTitle={task.title}
    />
    </>
  );
}
