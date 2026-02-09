import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KanbanColumn } from "@/components/kanban-column";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { AddMemberDialog } from "@/components/add-member-dialog";
import type { Board, Task } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { useState } from "react";
import { UserPlus, Users, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BoardPage() {
  const [, params] = useRoute("/board/:id");
  const boardId = params?.id || "";
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskColumn, setTaskColumn] = useState<"todo" | "in_progress" | "done">("todo");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: board, isLoading: boardLoading } = useQuery<Board>({
    queryKey: ["/api/boards", boardId],
    enabled: !!boardId,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/boards", boardId, "tasks"],
    enabled: !!boardId,
  });

  const { data: members = [] } = useQuery<User[]>({
    queryKey: ["/api/boards", boardId, "members"],
    enabled: !!boardId && board?.type === "workplace",
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "tasks"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to move task.", variant: "destructive" });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/boards/${boardId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({ title: "Board deleted" });
      navigate("/");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete board.", variant: "destructive" });
    },
  });

  const isLoading = boardLoading || tasksLoading;

  const todoTasks = tasks.filter((t) => t.column === "todo");
  const inProgressTasks = tasks.filter((t) => t.column === "in_progress");
  const doneTasks = tasks.filter((t) => t.column === "done");

  const handleAddTask = (column: "todo" | "in_progress" | "done") => {
    setTaskColumn(column);
    setTaskDialogOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      updateTaskMutation.mutate({ taskId, data: { column } });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 h-full">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 h-[calc(100%-3rem)]">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="flex-1 min-w-[280px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Board not found</p>
      </div>
    );
  }

  const isOwner = board.ownerId === user?.id;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl font-semibold truncate" data-testid="text-board-name">{board.name}</h1>
          <Badge variant="secondary" className="flex-shrink-0">
            {board.type === "personal" ? "Personal" : "Workplace"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {board.type === "workplace" && (
            <>
              <div className="flex -space-x-2 mr-2">
                {members.slice(0, 5).map((member) => (
                  <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={member.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[9px]">
                      {(member.firstName?.[0] || "").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 5 && (
                  <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium">
                    +{members.length - 5}
                  </div>
                )}
              </div>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMemberDialogOpen(true)}
                  data-testid="button-add-member"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Add Member
                </Button>
              )}
            </>
          )}
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              data-testid="button-delete-board"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-h-0">
          <KanbanColumn
            column="todo"
            tasks={todoTasks}
            members={members}
            boardId={boardId}
            isWorkplace={board.type === "workplace"}
            onAddTask={handleAddTask}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
          <KanbanColumn
            column="in_progress"
            tasks={inProgressTasks}
            members={members}
            boardId={boardId}
            isWorkplace={board.type === "workplace"}
            onAddTask={handleAddTask}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
          <KanbanColumn
            column="done"
            tasks={doneTasks}
            members={members}
            boardId={boardId}
            isWorkplace={board.type === "workplace"}
            onAddTask={handleAddTask}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        </div>
      </div>

      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        boardId={boardId}
        column={taskColumn}
      />

      {board.type === "workplace" && (
        <AddMemberDialog
          open={memberDialogOpen}
          onOpenChange={setMemberDialogOpen}
          boardId={boardId}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{board.name}" and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-board">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBoardMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-board"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
