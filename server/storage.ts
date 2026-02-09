import {
  boards, tasks, notifications, boardMembers, reminders,
  type Board, type InsertBoard,
  type Task, type InsertTask,
  type Notification, type InsertNotification,
  type BoardMember, type InsertBoardMember,
  type Reminder, type InsertReminder,
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { db } from "./db";
import { eq, and, or, desc, inArray, lt, gt, ne, asc, lte } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getBoards(userId: string): Promise<Board[]>;
  getBoard(id: string): Promise<Board | undefined>;
  createBoard(board: InsertBoard): Promise<Board>;
  deleteBoard(id: string): Promise<void>;

  getTasks(boardId: string): Promise<Task[]>;
  getMyTasks(userId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  getTasksDueSoon(): Promise<Task[]>;
  getOverdueTasks(): Promise<Task[]>;

  getNotifications(userId: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  hasRecentNotification(userId: string, taskId: string, type: string): Promise<boolean>;

  getBoardMembers(boardId: string): Promise<User[]>;
  addBoardMember(member: InsertBoardMember): Promise<BoardMember>;
  isBoardMember(boardId: string, userId: string): Promise<boolean>;

  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUser(id: string): Promise<User | undefined>;

  createReminder(reminder: InsertReminder): Promise<Reminder>;
  getReminders(userId: string): Promise<Reminder[]>;
  getDueReminders(userId: string): Promise<Reminder[]>;
  dismissReminder(id: string): Promise<void>;
  deleteReminder(id: string): Promise<void>;
  getReminder(id: string): Promise<Reminder | undefined>;
  markReminderFired(id: string): Promise<void>;
  getFiredUnfiredReminders(): Promise<Reminder[]>;
}

export class DatabaseStorage implements IStorage {
  async getBoards(userId: string): Promise<Board[]> {
    const ownedBoards = await db.select().from(boards).where(eq(boards.ownerId, userId));
    const memberships = await db.select().from(boardMembers).where(eq(boardMembers.userId, userId));
    const memberBoardIds = memberships.map((m) => m.boardId);
    let memberBoards: Board[] = [];
    if (memberBoardIds.length > 0) {
      memberBoards = await db.select().from(boards).where(inArray(boards.id, memberBoardIds));
    }
    const allBoards = [...ownedBoards];
    for (const b of memberBoards) {
      if (!allBoards.find((ob) => ob.id === b.id)) {
        allBoards.push(b);
      }
    }
    return allBoards;
  }

  async getBoard(id: string): Promise<Board | undefined> {
    const [board] = await db.select().from(boards).where(eq(boards.id, id));
    return board || undefined;
  }

  async createBoard(board: InsertBoard): Promise<Board> {
    const id = randomUUID();
    await db.insert(boards).values({ ...board, id });
    const [created] = await db.select().from(boards).where(eq(boards.id, id));
    return created;
  }

  async deleteBoard(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.boardId, id));
    await db.delete(boardMembers).where(eq(boardMembers.boardId, id));
    await db.delete(boards).where(eq(boards.id, id));
  }

  async getTasks(boardId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.boardId, boardId));
  }

  async getMyTasks(userId: string): Promise<Task[]> {
    return db.select().from(tasks).where(
      or(eq(tasks.creatorId, userId), eq(tasks.assigneeId, userId))
    );
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = randomUUID();
    await db.insert(tasks).values({ ...task, id });
    const [created] = await db.select().from(tasks).where(eq(tasks.id, id));
    return created;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    await db.update(tasks).set(data).where(eq(tasks.id, id));
    const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
    return updated || undefined;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.taskId, id));
    await db.delete(reminders).where(eq(reminders.taskId, id));
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getTasksDueSoon(): Promise<Task[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return db.select().from(tasks).where(
      and(
        gt(tasks.dueDate, now),
        lt(tasks.dueDate, tomorrow),
        ne(tasks.column, "done")
      )
    );
  }

  async getOverdueTasks(): Promise<Task[]> {
    const now = new Date();
    return db.select().from(tasks).where(
      and(
        lt(tasks.dueDate, now),
        ne(tasks.column, "done")
      )
    );
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification || undefined;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    await db.insert(notifications).values({ ...notification, id });
    const [created] = await db.select().from(notifications).where(eq(notifications.id, id));
    return created;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async hasRecentNotification(userId: string, taskId: string, type: string): Promise<boolean> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const results = await db.select().from(notifications).where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.taskId, taskId),
        eq(notifications.type, type as any),
        gt(notifications.createdAt, oneDayAgo)
      )
    );
    return results.length > 0;
  }

  async getBoardMembers(boardId: string): Promise<User[]> {
    const memberships = await db.select().from(boardMembers).where(eq(boardMembers.boardId, boardId));
    const board = await this.getBoard(boardId);
    const memberIds = memberships.map((m) => m.userId);
    if (board) memberIds.push(board.ownerId);
    const uniqueIds = Array.from(new Set(memberIds));
    if (uniqueIds.length === 0) return [];
    return db.select().from(users).where(inArray(users.id, uniqueIds));
  }

  async addBoardMember(member: InsertBoardMember): Promise<BoardMember> {
    const id = randomUUID();
    await db.insert(boardMembers).values({ ...member, id });
    const [created] = await db.select().from(boardMembers).where(eq(boardMembers.id, id));
    return created;
  }

  async isBoardMember(boardId: string, userId: string): Promise<boolean> {
    const board = await this.getBoard(boardId);
    if (board?.ownerId === userId) return true;
    const [membership] = await db.select().from(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)));
    return !!membership;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const id = randomUUID();
    await db.insert(reminders).values({ ...reminder, id });
    const [created] = await db.select().from(reminders).where(eq(reminders.id, id));
    return created;
  }

  async getReminders(userId: string): Promise<Reminder[]> {
    return db.select().from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.dismissed, false)))
      .orderBy(asc(reminders.reminderTime));
  }

  async getDueReminders(userId: string): Promise<Reminder[]> {
    return db.select().from(reminders).where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.dismissed, false),
        eq(reminders.fired, true)
      )
    );
  }

  async dismissReminder(id: string): Promise<void> {
    await db.update(reminders).set({ dismissed: true }).where(eq(reminders.id, id));
  }

  async deleteReminder(id: string): Promise<void> {
    await db.delete(reminders).where(eq(reminders.id, id));
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder || undefined;
  }

  async markReminderFired(id: string): Promise<void> {
    await db.update(reminders).set({ fired: true }).where(eq(reminders.id, id));
  }

  async getFiredUnfiredReminders(): Promise<Reminder[]> {
    const now = new Date();
    return db.select().from(reminders).where(
      and(
        eq(reminders.fired, false),
        eq(reminders.dismissed, false),
        lte(reminders.reminderTime, now)
      )
    );
  }
}

export const storage = new DatabaseStorage();
