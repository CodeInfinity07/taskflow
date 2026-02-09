import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { User, Building2 } from "lucide-react";

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardType: "personal" | "workplace";
}

export function CreateBoardDialog({ open, onOpenChange, boardType }: CreateBoardDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/boards", { name, type: boardType, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({ title: "Board created", description: `${name} has been created successfully.` });
      onOpenChange(false);
      setName("");
      setDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create board.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {boardType === "personal" ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            New {boardType === "personal" ? "Personal" : "Workplace"} Board
          </DialogTitle>
          <DialogDescription>
            Create a new board to organize your {boardType === "personal" ? "personal" : "team"} tasks.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="board-name">Board Name</Label>
            <Input
              id="board-name"
              placeholder="e.g., Q1 Sprint, Weekend Projects..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-board-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-description">Description (optional)</Label>
            <Textarea
              id="board-description"
              placeholder="What is this board for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              data-testid="input-board-description"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-board">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending} data-testid="button-submit-board">
              {createMutation.isPending ? "Creating..." : "Create Board"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
