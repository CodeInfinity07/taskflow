import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskCard } from "./task-card";
import type { Task } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { useState } from "react";

const columnConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "bg-chart-5/10 text-chart-5" },
  in_progress: { label: "In Progress", color: "bg-primary/10 text-primary" },
  done: { label: "Done", color: "bg-chart-2/10 text-chart-2" },
};

interface KanbanColumnProps {
  column: "todo" | "in_progress" | "done";
  tasks: Task[];
  members: User[];
  boardId: string;
  isWorkplace?: boolean;
  onAddTask: (column: "todo" | "in_progress" | "done") => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDrop: (e: React.DragEvent, column: string) => void;
}

export function KanbanColumn({
  column,
  tasks,
  members,
  boardId,
  isWorkplace,
  onAddTask,
  onDragStart,
  onDrop,
}: KanbanColumnProps) {
  const config = columnConfig[column];
  const [isDragOver, setIsDragOver] = useState(false);

  const getAssignee = (assigneeId: string | null) => {
    if (!assigneeId) return null;
    return members.find((m) => m.id === assigneeId) || null;
  };

  return (
    <div
      className={`flex flex-col rounded-lg bg-card/50 border border-card-border min-w-[280px] max-w-[350px] flex-1 transition-all ${
        isDragOver ? "ring-2 ring-primary/30 bg-primary/5" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false);
        onDrop(e, column);
      }}
      data-testid={`column-${column}`}
    >
      <div className="flex items-center justify-between gap-4 p-3 border-b border-card-border">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${config.color}`}>
            {config.label}
          </span>
          <Badge variant="secondary" className="h-5 min-w-5 text-[10px] px-1.5">
            {tasks.length}
          </Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onAddTask(column)}
          data-testid={`button-add-task-${column}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2 min-h-[100px]">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
              No tasks yet
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={getAssignee(task.assigneeId)}
                boardId={boardId}
                isWorkplace={isWorkplace}
                onDragStart={onDragStart}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
