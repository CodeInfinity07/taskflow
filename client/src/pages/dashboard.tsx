import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { Board, Task } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Clock, AlertTriangle, Layout, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { isPast, isToday, isTomorrow, format } from "date-fns";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
  });

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/my"],
  });

  const isLoading = boardsLoading || tasksLoading;

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.column === "done").length;
  const overdueTasks = allTasks.filter(
    (t) => t.dueDate && isPast(new Date(t.dueDate)) && t.column !== "done"
  ).length;
  const upcomingTasks = allTasks.filter(
    (t) =>
      t.dueDate &&
      !isPast(new Date(t.dueDate)) &&
      t.column !== "done" &&
      (isToday(new Date(t.dueDate)) || isTomorrow(new Date(t.dueDate)))
  );
  const pendingAssignments = allTasks.filter(
    (t) => t.assigneeId === user?.id && t.status === "pending"
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-bold" data-testid="text-dashboard-welcome">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's an overview of your tasks and boards
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-tasks">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-chart-2/10 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-completed-tasks">{completedTasks}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-overdue-tasks">{overdueTasks}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-chart-3/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-upcoming-tasks">{upcomingTasks.length}</p>
              <p className="text-xs text-muted-foreground">Due Soon</p>
            </div>
          </div>
        </Card>
      </div>

      {pendingAssignments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-chart-3" />
            Pending Assignments
          </h2>
          <div className="space-y-2">
            {pendingAssignments.map((task) => (
              <Card key={task.id} className="p-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/20 flex-shrink-0">
                    Needs Response
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Your Boards
        </h2>
        {boards.length === 0 ? (
          <Card className="p-8 text-center">
            <Layout className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No boards yet. Create one from the sidebar to get started.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => {
              const boardTasks = allTasks.filter((t) => t.boardId === board.id);
              const todoCount = boardTasks.filter((t) => t.column === "todo").length;
              const inProgressCount = boardTasks.filter((t) => t.column === "in_progress").length;
              const doneCount = boardTasks.filter((t) => t.column === "done").length;

              return (
                <Link key={board.id} href={`/board/${board.id}`}>
                  <Card className="p-4 hover-elevate cursor-pointer space-y-3" data-testid={`card-board-${board.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{board.name}</h3>
                        {board.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {board.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                        {board.type === "personal" ? "Personal" : "Workplace"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{todoCount} to do</span>
                      <span>{inProgressCount} in progress</span>
                      <span>{doneCount} done</span>
                    </div>
                    <div className="flex items-center text-xs text-primary gap-1">
                      <span>Open board</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
