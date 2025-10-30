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
  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const email = formData.get("email");
      const message = formData.get("message");

      const { error } = await supabase
        .from("feedback")
        .insert([{ email, message }]);

      if (error) {
        toast.error("Failed to submit feedback: " + error.message);
      } else {
        toast.success("Feedback submitted successfully!");
      }
    } catch (e) {
      console.error(e);
      toast.error("An unexpected error occurred.");
    }
  };
  return (
    <Dialog>
      <form onSubmit={connect}>
        <DialogTrigger asChild>
          <Button>
            <Cloud />
            Publish
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
