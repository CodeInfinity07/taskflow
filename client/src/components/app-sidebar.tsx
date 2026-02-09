import { useLocation, Link } from "wouter";
import { Layout, User, Building2, Plus, LogOut, ChevronDown, CalendarClock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import type { Board } from "@shared/schema";

export function AppSidebar({ onCreateBoard }: { onCreateBoard: (type: "personal" | "workplace") => void }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
  });

  const personalBoards = boards.filter((b) => b.type === "personal");
  const workplaceBoards = boards.filter((b) => b.type === "workplace");

  const initials = user
    ? `${(user.firstName?.[0] || "").toUpperCase()}${(user.lastName?.[0] || "").toUpperCase()}` || "U"
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <Layout className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">TaskFlow</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Personal
            </SidebarGroupLabel>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onCreateBoard("personal")}
              data-testid="button-add-personal-board"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {personalBoards.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  No personal boards yet
                </div>
              ) : (
                personalBoards.map((board) => (
                  <SidebarMenuItem key={board.id}>
                    <SidebarMenuButton asChild isActive={location === `/board/${board.id}`}>
                      <Link href={`/board/${board.id}`} data-testid={`link-board-${board.id}`}>
                        <Layout className="h-4 w-4" />
                        <span className="truncate">{board.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Workplace
            </SidebarGroupLabel>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onCreateBoard("workplace")}
              data-testid="button-add-workplace-board"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {workplaceBoards.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  No workplace boards yet
                </div>
              ) : (
                workplaceBoards.map((board) => (
                  <SidebarMenuItem key={board.id}>
                    <SidebarMenuButton asChild isActive={location === `/board/${board.id}`}>
                      <Link href={`/board/${board.id}`} data-testid={`link-board-${board.id}`}>
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{board.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/reminders"}>
                  <Link href="/reminders" data-testid="link-reminders">
                    <CalendarClock className="h-4 w-4" />
                    <span>Reminders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 w-full rounded-md p-2 hover-elevate"
              data-testid="button-user-menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => logout()} data-testid="button-logout">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
