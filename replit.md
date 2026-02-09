# TaskFlow - Task Management Application

## Overview
A minimal Trello-like task management application with Personal and Workplace sections. Users can create Kanban boards, manage tasks with drag-and-drop, assign tasks to team members, and receive notifications for deadlines and assignments.

## Recent Changes
- 2026-02-09: Migrated from PostgreSQL to MySQL (remote database), replaced Replit Auth with custom username/password authentication
- 2026-02-07: Added reminder system - set reminders on task accept, browser notification sound + modal, dedicated Reminders page
- 2026-02-07: Initial MVP build - schema, frontend, backend, auth integration

## Architecture

### Stack
- **Frontend**: React + Vite + TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Express.js + TypeScript
- **Database**: MySQL (remote) with Drizzle ORM
- **Auth**: Custom username/password authentication with bcryptjs + express-session (memorystore)

### Key Files
- `shared/schema.ts` - All Drizzle data models using mysqlTable (boards, tasks, notifications, boardMembers, reminders) + re-exports auth models
- `shared/models/auth.ts` - Auth-related models (users table with username/password)
- `server/routes.ts` - All API endpoints with auth middleware
- `server/auth.ts` - Custom auth setup (register, login, logout, session management, isAuthenticated middleware)
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/db.ts` - MySQL database connection pool
- `drizzle-mysql.config.ts` - Drizzle Kit config for MySQL schema push
- `client/src/App.tsx` - Main app with routing, sidebar layout, auth flow
- `client/src/hooks/use-auth.ts` - Auth hook (fetches /api/auth/user, login/logout)
- `client/src/pages/landing.tsx` - Landing page with login/register forms
- `client/src/pages/dashboard.tsx` - Dashboard for authenticated users
- `client/src/pages/board.tsx` - Individual board with Kanban columns
- `client/src/pages/reminders.tsx` - Reminders management page
- `client/src/components/set-reminder-dialog.tsx` - Dialog for setting reminder time on task accept
- `client/src/components/reminder-alert.tsx` - Global reminder alert with sound + modal

### Database Configuration
- MySQL credentials stored as secrets: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT
- Schema push command: `npx drizzle-kit push --config=drizzle-mysql.config.ts`
- UUIDs generated application-side via crypto.randomUUID() (MySQL doesn't support gen_random_uuid())
- No .returning() support in MySQL - uses insert + select pattern

### Auth System
- Custom username/password authentication (no Replit Auth / OIDC)
- POST /api/auth/register - creates user with bcrypt-hashed password
- POST /api/auth/login - validates credentials, sets session
- POST /api/auth/logout - destroys session
- GET /api/auth/user - returns current user (password excluded)
- Session stored in memorystore (express-session)
- isAuthenticated middleware checks req.session.userId
- Routes use req.session.userId instead of req.user.claims.sub

### Data Models
- **Users** - Custom auth (id, username, email, password, firstName, lastName, profileImageUrl)
- **Boards** - Personal or Workplace boards (id, name, type, ownerId, description)
- **Tasks** - Kanban cards (id, title, description, boardId, column, priority, assigneeId, creatorId, status, dueDate, reminderDate)
- **Notifications** - In-app notifications (id, userId, taskId, type, message, read)
- **BoardMembers** - Board membership for workplace boards (id, boardId, userId)
- **Reminders** - User-set task reminders (id, userId, taskId, reminderTime, fired, dismissed, createdAt)

### Features
- Two board sections: Personal & Workplace
- Kanban columns: To Do, In Progress, Done
- Drag-and-drop between columns
- Task assignment with accept/decline for workplace boards
- Due dates and reminder notifications
- Priority levels (Low, Medium, High, Urgent)
- Team member management for workplace boards
- Dark/Light mode toggle
- Dashboard with task stats overview
- Reminder system: set reminders when accepting tasks, browser sound + modal alert, dedicated Reminders page

### Reminder System
- When a user accepts a task, a dialog prompts to set a reminder (quick options: 15min, 1hr, 3hr, tomorrow 9AM, or custom)
- Server checks for due reminders every 60 seconds and marks them as "fired"
- Frontend polls /api/reminders/due every 15 seconds; when new fired reminders appear, plays a Web Audio API tone and shows a grouped modal
- Dedicated /reminders page shows upcoming and active reminders with dismiss/delete actions

### Legacy Files (unused)
- `server/replit_integrations/auth/` - Old Replit Auth integration (no longer imported or used)

## User Preferences
- User prefers MySQL over PostgreSQL for database
- User prefers custom auth over Replit Auth
