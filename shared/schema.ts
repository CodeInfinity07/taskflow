import { relations } from "drizzle-orm";
import { mysqlTable, varchar, text, timestamp, int, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
import { users } from "./models/auth";

export const boards = mysqlTable("boards", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  type: mysqlEnum("type", ["personal", "workplace"]).notNull(),
  ownerId: varchar("owner_id", { length: 36 }).notNull(),
  description: text("description"),
});

export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  boardId: varchar("board_id", { length: 36 }).notNull(),
  column: mysqlEnum("column_name", ["todo", "in_progress", "done"]).notNull().default("todo"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).notNull().default("medium"),
  assigneeId: varchar("assignee_id", { length: 36 }),
  creatorId: varchar("creator_id", { length: 36 }).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).notNull().default("pending"),
  dueDate: timestamp("due_date"),
  reminderDate: timestamp("reminder_date"),
  position: int("position").notNull().default(0),
});

export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  taskId: varchar("task_id", { length: 36 }),
  type: mysqlEnum("type", [
    "task_assigned",
    "task_accepted",
    "task_declined",
    "task_due_soon",
    "task_overdue",
    "reminder",
  ]).notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reminders = mysqlTable("reminders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  taskId: varchar("task_id", { length: 36 }).notNull(),
  reminderTime: timestamp("reminder_time").notNull(),
  fired: boolean("fired").notNull().default(false),
  dismissed: boolean("dismissed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const boardMembers = mysqlTable("board_members", {
  id: varchar("id", { length: 36 }).primaryKey(),
  boardId: varchar("board_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
});

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(users, { fields: [reminders.userId], references: [users.id] }),
  task: one(tasks, { fields: [reminders.taskId], references: [tasks.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  ownedBoards: many(boards),
  assignedTasks: many(tasks, { relationName: "assignee" }),
  createdTasks: many(tasks, { relationName: "creator" }),
  notifications: many(notifications),
  boardMemberships: many(boardMembers),
  reminders: many(reminders),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  owner: one(users, { fields: [boards.ownerId], references: [users.id] }),
  tasks: many(tasks),
  members: many(boardMembers),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  board: one(boards, { fields: [tasks.boardId], references: [boards.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id], relationName: "assignee" }),
  creator: one(users, { fields: [tasks.creatorId], references: [users.id], relationName: "creator" }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  task: one(tasks, { fields: [notifications.taskId], references: [tasks.id] }),
}));

export const boardMembersRelations = relations(boardMembers, ({ one }) => ({
  board: one(boards, { fields: [boardMembers.boardId], references: [boards.id] }),
  user: one(users, { fields: [boardMembers.userId], references: [users.id] }),
}));

export const insertBoardSchema = createInsertSchema(boards).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });
export const insertBoardMemberSchema = createInsertSchema(boardMembers).omit({ id: true });
export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true });

export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boards.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertBoardMember = z.infer<typeof insertBoardMemberSchema>;
export type BoardMember = typeof boardMembers.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
