import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Bug, Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import supabase from '@/lib/supabase';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function FeedbackDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);

  const resetStatus = () => {
    setStatusMessage(null);
    setStatusType(null);
  };

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      const message = 'Cloud publishing is not configured.';
      toast.error(message);
      setStatusMessage(message);
      setStatusType('error');
      return;
    }

    try {
      setIsSubmitting(true);
      resetStatus();

      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const email = formData.get('email') as string | null;
      const message = formData.get('message') as string | null;

      const { error } = await supabase.from('feedback').insert([{ email, message }]);

      if (error) {
        const failureMessage = 'Failed to submit feedback: ' + error.message;
        toast.error(failureMessage);
        setStatusMessage(failureMessage);
        setStatusType('error');
      } else {
        const successMessage = 'Feedback submitted successfully!';
        toast.success(successMessage);
        setStatusMessage(successMessage);
        setStatusType('success');
      }
    } catch (e) {
      const fallbackMessage = 'An unexpected error occurred.';
      console.error(e);
      toast.error(fallbackMessage);
      setStatusMessage(fallbackMessage);
      setStatusType('error');
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
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <Bug className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden gap-0">
        {statusType === 'success' ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Thanks for the feedback!</p>
              <p className="text-sm text-muted-foreground">We'll review it and get back to you if needed.</p>
            </div>
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="mt-2">Close</Button>
            </DialogClose>
          </div>
        ) : (
          <form onSubmit={connect}>
            {/* Header with gradient accent */}
            <div className="relative px-6 pt-6 pb-5 border-b border-border/60">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500" />
              <DialogHeader className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Share your feedback
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Let us know your experience or ideas about Codexia.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Form body */}
            <div className="flex flex-col gap-4 px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  Email <span className="text-muted-foreground/50">(optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="message" className="text-xs font-medium text-muted-foreground">
                  Message
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Tell us what you think..."
                  className="min-h-[100px] resize-none text-sm"
                />
              </div>

              {statusMessage && statusType === 'error' && (
                <p role="status" className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {statusMessage}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 pb-5">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
