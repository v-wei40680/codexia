import { create } from "zustand";
import { type ToastType } from "./toast";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface UseToastStore {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<UseToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = "info", duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const { addToast } = useToastStore();

  const toast = (options: ToastOptions) => {
    const message = options.description || options.title || "Notification";
    const type: ToastType =
      options.variant === "destructive" ? "error" : "info";
    addToast(message, type, 3000);
  };

  return { toast };
}

export { useToastStore };
