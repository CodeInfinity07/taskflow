import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";

async function checkDueReminders() {
  try {
    const dueSoonTasks = await storage.getTasksDueSoon();
    for (const task of dueSoonTasks) {
      const targetUserId = task.assigneeId || task.creatorId;
      const existing = await storage.hasRecentNotification(targetUserId, task.id, "task_due_soon");
      if (!existing) {
        await storage.createNotification({
          userId: targetUserId,
          taskId: task.id,
          type: "task_due_soon",
          message: `Task "${task.title}" is due soon`,
        });
      }
    }

    const overdueTasks = await storage.getOverdueTasks();
    for (const task of overdueTasks) {
      const targetUserId = task.assigneeId || task.creatorId;
      const existing = await storage.hasRecentNotification(targetUserId, task.id, "task_overdue");
      if (!existing) {
        await storage.createNotification({
          userId: targetUserId,
          taskId: task.id,
          type: "task_overdue",
          message: `Task "${task.title}" is overdue!`,
        });
      }
    }

    const unfiredReminders = await storage.getFiredUnfiredReminders();
    for (const reminder of unfiredReminders) {
      await storage.markReminderFired(reminder.id);
    }
  } catch (error) {
    console.error("Error checking due reminders:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  setInterval(checkDueReminders, 60 * 1000);
  setTimeout(checkDueReminders, 5000);

  app.get("/api/boards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const userBoards = await storage.getBoards(userId);
      res.json(userBoards);
    } catch (error) {
      console.error("Error fetching boards:", error);
      res.status(500).json({ message: "Failed to fetch boards" });
    }
  });

  app.get("/api/boards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const board = await storage.getBoard(req.params.id);
      if (!board) return res.status(404).json({ message: "Board not found" });
      const userId = req.session.userId;
      const isMember = await storage.isBoardMember(board.id, userId);
      if (!isMember) return res.status(403).json({ message: "Not a member of this board" });
      res.json(board);
    } catch (error) {
      console.error("Error fetching board:", error);
      res.status(500).json({ message: "Failed to fetch board" });
    }
  });

  app.post("/api/boards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { name, type, description } = req.body;
      if (!name || !type) return res.status(400).json({ message: "Name and type are required" });
      if (!["personal", "workplace"].includes(type)) return res.status(400).json({ message: "Invalid board type" });
      const board = await storage.createBoard({ name, type, description, ownerId: userId });
      res.json(board);
    } catch (error) {
      console.error("Error creating board:", error);
      res.status(500).json({ message: "Failed to create board" });
    }
  });

  app.delete("/api/boards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const board = await storage.getBoard(req.params.id);
      if (!board) return res.status(404).json({ message: "Board not found" });
      if (board.ownerId !== userId) return res.status(403).json({ message: "Not the owner" });
      await storage.deleteBoard(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting board:", error);
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  app.get("/api/boards/:id/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const isMember = await storage.isBoardMember(req.params.id, userId);
      if (!isMember) return res.status(403).json({ message: "Not a member" });
      const boardTasks = await storage.getTasks(req.params.id);
      res.json(boardTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/boards/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const isMember = await storage.isBoardMember(req.params.id, userId);
      if (!isMember) return res.status(403).json({ message: "Not a member" });
      const members = await storage.getBoardMembers(req.params.id);
      const safeMembers = members.map(({ password, ...rest }) => rest);
      res.json(safeMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.post("/api/boards/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const board = await storage.getBoard(req.params.id);
      if (!board) return res.status(404).json({ message: "Board not found" });
      if (board.ownerId !== userId) return res.status(403).json({ message: "Only owner can add members" });

      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const targetUser = await storage.getUserByEmail(email);
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      const isMember = await storage.isBoardMember(req.params.id, targetUser.id);
      if (isMember) return res.status(400).json({ message: "Already a member" });

      const member = await storage.addBoardMember({
        boardId: req.params.id,
        userId: targetUser.id,
      });
      res.json(member);
    } catch (error) {
      console.error("Error adding member:", error);
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  app.get("/api/tasks/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const myTasks = await storage.getMyTasks(userId);
      res.json(myTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { title, description, boardId, column, priority, assigneeId, dueDate, reminderDate } = req.body;

      if (!title || !boardId) return res.status(400).json({ message: "Title and boardId are required" });

      const isMember = await storage.isBoardMember(boardId, userId);
      if (!isMember) return res.status(403).json({ message: "Not a member of this board" });

      const task = await storage.createTask({
        title,
        description: description || null,
        boardId,
        column: column || "todo",
        priority: priority || "medium",
        creatorId: userId,
        assigneeId: assigneeId === "none" ? null : assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        status: "pending",
        position: 0,
      });

      if (task.assigneeId && task.assigneeId !== userId) {
        await storage.createNotification({
          userId: task.assigneeId,
          taskId: task.id,
          type: "task_assigned",
          message: `You've been assigned a new task: "${task.title}"`,
        });
      }

      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ message: "Task not found" });

      const isMember = await storage.isBoardMember(task.boardId, userId);
      if (!isMember) return res.status(403).json({ message: "Not a member of this board" });

      if (req.body.status === "accepted" || req.body.status === "declined") {
        if (task.assigneeId !== userId) {
          return res.status(403).json({ message: "Only the assignee can accept or decline" });
        }
      }

      const allowedFields: Record<string, boolean> = {
        title: true, description: true, column: true, priority: true,
        assigneeId: true, status: true, dueDate: true, reminderDate: true, position: true,
      };
      const updateData: Record<string, any> = {};
      for (const key of Object.keys(req.body)) {
        if (allowedFields[key]) updateData[key] = req.body[key];
      }

      const updated = await storage.updateTask(req.params.id, updateData);

      if (req.body.status === "accepted" && task.creatorId !== userId) {
        await storage.createNotification({
          userId: task.creatorId,
          taskId: task.id,
          type: "task_accepted",
          message: `Your task "${task.title}" has been accepted`,
        });
      }
      if (req.body.status === "declined" && task.creatorId !== userId) {
        await storage.createNotification({
          userId: task.creatorId,
          taskId: task.id,
          type: "task_declined",
          message: `Your task "${task.title}" has been declined`,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ message: "Task not found" });

      const board = await storage.getBoard(task.boardId);
      if (task.creatorId !== userId && board?.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this task" });
      }

      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const userNotifications = await storage.getNotifications(userId);
      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const notification = await storage.getNotification(req.params.id);
      if (!notification || notification.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  app.get("/api/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const remindersList = await storage.getReminders(userId);
      const remindersWithTasks = await Promise.all(
        remindersList.map(async (r) => {
          const task = await storage.getTask(r.taskId);
          return { ...r, task };
        })
      );
      res.json(remindersWithTasks);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  app.get("/api/reminders/due", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const dueReminders = await storage.getDueReminders(userId);
      const remindersWithTasks = await Promise.all(
        dueReminders.map(async (r) => {
          const task = await storage.getTask(r.taskId);
          return { ...r, task };
        })
      );
      res.json(remindersWithTasks);
    } catch (error) {
      console.error("Error fetching due reminders:", error);
      res.status(500).json({ message: "Failed to fetch due reminders" });
    }
  });

  app.post("/api/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskId, reminderTime } = req.body;
      if (!taskId || !reminderTime) {
        return res.status(400).json({ message: "taskId and reminderTime are required" });
      }
      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });

      const isMember = await storage.isBoardMember(task.boardId, userId);
      if (!isMember) return res.status(403).json({ message: "Not a member of this board" });

      const reminder = await storage.createReminder({
        userId,
        taskId,
        reminderTime: new Date(reminderTime),
      });
      res.json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.post("/api/reminders/:id/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const reminder = await storage.getReminder(req.params.id);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      if (reminder.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.dismissReminder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing reminder:", error);
      res.status(500).json({ message: "Failed to dismiss reminder" });
    }
  });

  app.delete("/api/reminders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const reminder = await storage.getReminder(req.params.id);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      if (reminder.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteReminder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notifications read:", error);
      res.status(500).json({ message: "Failed to mark notifications read" });
    }
  });

  return httpServer;
}
