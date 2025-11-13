import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Cloud } from "lucide-react";
import supabase from "@/lib/supabase";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export function PublishCloudDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(
    null,
  );

  const resetStatus = () => {
    setStatusMessage(null);
    setStatusType(null);
  };

  const connect = async (e: React.FormEvent) => {
    console.log("start submit");
    e.preventDefault();
    if (!supabase) {
      const message = "Cloud publishing is not configured.";
      toast.error(message);
      setStatusMessage(message);
      setStatusType("error");
      return;
    }

    try {
      setIsSubmitting(true);
      resetStatus();

      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const email = formData.get("email") as string | null;
      const message = formData.get("message") as string | null;

      const { error } = await supabase
        .from("feedback")
        .insert([{ email, message }]);

      if (error) {
        const failureMessage = "Failed to submit feedback: " + error.message;
        toast.error(failureMessage);
        setStatusMessage(failureMessage);
        setStatusType("error");
      } else {
        const successMessage = "Feedback submitted successfully!";
        toast.success(successMessage);
        setStatusMessage(successMessage);
        setStatusType("success");
      }
    } catch (e) {
      const fallbackMessage = "An unexpected error occurred.";
      console.error(e);
      toast.error(fallbackMessage);
      setStatusMessage(fallbackMessage);
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);
        if (!nextOpen) {
          resetStatus();
          setIsSubmitting(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Cloud />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={connect}>
          <DialogHeader>
            <DialogTitle className="flex gap-2">
              <Cloud />
              <span className="py-1">
                Share Your Feedback About Cloud Publishing
              </span>
            </DialogTitle>
            <DialogDescription>
              Let us know your experience or ideas before we roll out full
              deployment features.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input type="email" name="email" />
            </div>
            <div className="grid gap-3">
              <Textarea name="message" placeholder="Tell me what you think" />
            </div>
          </div>
          {statusMessage && statusType && (
            <p
              role="status"
              className={`text-sm ${statusType === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
            >
              {statusMessage}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
