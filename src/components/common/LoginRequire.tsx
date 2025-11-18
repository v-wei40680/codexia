import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface LoginRequireProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LoginRequire({ open, onOpenChange }: LoginRequireProps) {
  const [internalOpen, setInternalOpen] = useState(true);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center">
          <DialogTitle>Login Required</DialogTitle>
          <DialogDescription>
            Login to access early Advanced features
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-center text-sm text-muted-foreground">
          <p>Access your past conversations and stay synced across devices.</p>
          <p>Log in to unlock advanced functionality and cloud history.</p>
        </div>
        <DialogFooter className="justify-center">
          <Link to="/login" className="w-full">
            <Button className="w-full">
              Login
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
