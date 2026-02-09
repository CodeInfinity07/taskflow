import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { CheckSquare, Users, Bell, Layout, ArrowRight, Zap } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function LandingPage() {
  const [mode, setMode] = useState<"landing" | "login" | "register">("landing");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
    onError: (err: Error) => {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, email: email || undefined, firstName: firstName || undefined, lastName: lastName || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
    onError: (err: Error) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  if (mode === "login") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
            <button onClick={() => setMode("landing")} className="flex items-center gap-2 cursor-pointer">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <Layout className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg" data-testid="text-app-name">TaskFlow</span>
            </button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    data-testid="input-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    data-testid="input-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("register"); setPassword(""); }}
                    className="text-primary hover:underline"
                    data-testid="link-go-to-register"
                  >
                    Create one
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
            <button onClick={() => setMode("landing")} className="flex items-center gap-2 cursor-pointer">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <Layout className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg" data-testid="text-app-name">TaskFlow</span>
            </button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Create Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => { e.preventDefault(); registerMutation.mutate(); }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Username</Label>
                  <Input
                    id="reg-username"
                    data-testid="input-reg-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    data-testid="input-reg-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email (optional)</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    data-testid="input-reg-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-first">First Name</Label>
                    <Input
                      id="reg-first"
                      data-testid="input-reg-firstname"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-last">Last Name</Label>
                    <Input
                      id="reg-last"
                      data-testid="input-reg-lastname"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                  data-testid="button-register-submit"
                >
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setPassword(""); }}
                    className="text-primary hover:underline"
                    data-testid="link-go-to-login"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Layout className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg" data-testid="text-app-name">TaskFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => setMode("login")} data-testid="button-login">Sign In</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
                  <Zap className="h-3.5 w-3.5" />
                  Task management made simple
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight">
                  Organize your work,{" "}
                  <span className="text-primary">empower</span> your team
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                  A minimal, powerful Kanban board for managing personal and workplace tasks.
                  Assign tasks, set deadlines, and stay on top of everything.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="lg" onClick={() => setMode("register")} data-testid="button-get-started">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    Free forever
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    No credit card required
                  </span>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/5 rounded-2xl" />
                <div className="relative bg-card border border-card-border rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="h-3 w-3 rounded-full bg-destructive/60" />
                    <div className="h-3 w-3 rounded-full bg-chart-3/60" />
                    <div className="h-3 w-3 rounded-full bg-chart-2/60" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To Do</p>
                      <Card className="p-3 space-y-2">
                        <p className="text-sm font-medium">Design homepage</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">Urgent</span>
                        </div>
                      </Card>
                      <Card className="p-3 space-y-2">
                        <p className="text-sm font-medium">Write API docs</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-chart-3/10 text-chart-3 font-medium">Medium</span>
                        </div>
                      </Card>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress</p>
                      <Card className="p-3 space-y-2">
                        <p className="text-sm font-medium">Build dashboard</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-chart-4/10 text-chart-4 font-medium">High</span>
                        </div>
                      </Card>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Done</p>
                      <Card className="p-3 space-y-2 opacity-60">
                        <p className="text-sm font-medium line-through">Setup CI/CD</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-chart-2/10 text-chart-2 font-medium">Low</span>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12 space-y-3">
              <h2 className="text-2xl md:text-3xl font-serif font-bold">Everything you need to stay organized</h2>
              <p className="text-muted-foreground max-w-md mx-auto">Simple yet powerful features to manage your tasks effectively</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Layout,
                  title: "Kanban Boards",
                  description: "Organize tasks visually with drag-and-drop columns. Separate personal and workplace projects.",
                },
                {
                  icon: Users,
                  title: "Team Collaboration",
                  description: "Assign tasks to team members. They can accept or decline with a single click.",
                },
                {
                  icon: Bell,
                  title: "Smart Reminders",
                  description: "Set deadlines and get notified when tasks are due. Never miss an important deadline.",
                },
              ].map((feature) => (
                <Card key={feature.title} className="p-6 space-y-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span>TaskFlow</span>
          </div>
          <p>Built with care. Free forever.</p>
        </div>
      </footer>
    </div>
  );
}
