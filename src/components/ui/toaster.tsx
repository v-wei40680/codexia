import { Toast, ToastContainer } from "@/components/ui/toast";
import { useToastStore } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <ToastContainer>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </ToastContainer>
  );
}
