import React, { createContext, useContext } from "react";
import {
  Toast,
  ToastTitle,
  ToastDescription,
  useToast as useGluestackToast,
} from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  InfoIcon,
} from "@/components/ui/icon";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

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
  const insets = useSafeAreaInsets();

  const showToast = (type: ToastType, title: string, description?: string) => {
    const typeConfig = {
      success: {
        action: "success" as const,
        icon: CheckCircleIcon,
        iconClass: "stroke-success-600",
      },
      error: {
        action: "error" as const,
        icon: AlertCircleIcon,
        iconClass: "stroke-error-600",
      },
      warning: {
        action: "warning" as const,
        icon: AlertCircleIcon,
        iconClass: "stroke-warning-600",
      },
      info: {
        action: "info" as const,
        icon: InfoIcon,
        iconClass: "stroke-info-600",
      },
    };

    const config = typeConfig[type];

    toast.show({
      id: String(Math.random()),
      placement: "top",
      duration: 4000,
      avoidKeyboard: true,
      containerStyle: {
        paddingTop: insets.top + 10,
        paddingLeft: 16,
        paddingRight: 16,
        zIndex: 9999,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
      },
      render: ({ id }) => (
        <Toast
          nativeID={`toast-${id}`}
          action={config.action}
          variant="solid"
          style={{
            padding: 16,
            borderRadius: 8,
            minWidth: 320,
            maxWidth: 500,
            width: "90%",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 5,
          }}
          className="flex-row"
        >
          <HStack
            space="md"
            className="items-start"
            style={{ flex: 1, width: "100%" }}
          >
            <Icon
              as={config.icon}
              size="lg"
              className={`${config.iconClass} mt-0.5 flex-shrink-0`}
            />
            <VStack
              space="xs"
              className="flex-1"
              style={{ flex: 1, minWidth: 0 }}
            >
              <ToastTitle
                className="font-semibold text-typography-0 leading-5"
                style={{ flexWrap: "wrap" }}
              >
                {title}
              </ToastTitle>
              {description && (
                <ToastDescription
                  className="text-typography-100 opacity-90 text-sm leading-4"
                  style={{ flexWrap: "wrap" }}
                >
                  {description}
                </ToastDescription>
              )}
            </VStack>
          </HStack>
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
