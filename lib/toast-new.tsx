import React, { createContext, useContext } from "react";
import {
  Toast,
  ToastTitle,
  ToastDescription,
  useToast as useGluestackToast,
} from "@/components/ui/toast";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastHelpers {
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showWarning: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
  showToast: (type: ToastType, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastHelpers | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const toast = useGluestackToast();

  const showToast = (type: ToastType, title: string, description?: string) => {
    const actionMap = {
      success: "success",
      error: "error",
      warning: "warning",
      info: "info",
    };

    toast.show({
      placement: "top",
      render: ({ id }) => (
        <Toast
          nativeID={`toast-${id}`}
          action={actionMap[type]}
          variant="solid"
        >
          <ToastTitle>{title}</ToastTitle>
          {description && <ToastDescription>{description}</ToastDescription>}
        </Toast>
      ),
    });
  };

  const showSuccess = (title: string, description?: string) => {
    showToast("success", title, description);
  };

  const showError = (title: string, description?: string) => {
    showToast("error", title, description);
  };

  const showWarning = (title: string, description?: string) => {
    showToast("warning", title, description);
  };

  const showInfo = (title: string, description?: string) => {
    showToast("info", title, description);
  };

  const value: ToastHelpers = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showToast,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

// For backward compatibility
export const useToastHelpers = () => {
  return useToast();
};
