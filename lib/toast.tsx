import React, { createContext, useContext, useState, useCallback } from "react";
import { View, Text, Animated, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../components/DesignSystem";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  hideToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

const ToastItem: React.FC<{ toast: Toast; onHide: (id: string) => void }> = ({
  toast,
  onHide,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  React.useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after duration
    const timer = setTimeout(() => {
      hideToast();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, []);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  }, [toast.id, onHide]);

  const getToastColors = () => {
    switch (toast.type) {
      case "success":
        return {
          background: colors.success[500],
          text: colors.white,
          icon: "checkmark-circle" as const,
        };
      case "error":
        return {
          background: colors.error[500],
          text: colors.white,
          icon: "close-circle" as const,
        };
      case "warning":
        return {
          background: colors.warning[500],
          text: colors.white,
          icon: "warning" as const,
        };
      case "info":
        return {
          background: colors.primary[500],
          text: colors.white,
          icon: "information-circle" as const,
        };
      default:
        return {
          background: colors.primary[500],
          text: colors.white,
          icon: "information-circle" as const,
        };
    }
  };

  const toastColors = getToastColors();

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        zIndex: 9999,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View
        style={{
          backgroundColor: toastColors.background,
          borderRadius: 12,
          padding: 16,
          flexDirection: "row",
          alignItems: "flex-start",
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons
          name={toastColors.icon}
          size={24}
          color={toastColors.text}
          style={{ marginRight: 12, marginTop: 2 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: toastColors.text,
              fontSize: 16,
              fontWeight: "600",
              marginBottom: toast.message ? 4 : 0,
            }}
          >
            {toast.title}
          </Text>
          {toast.message && (
            <Text
              style={{
                color: toastColors.text,
                fontSize: 14,
                opacity: 0.9,
              }}
            >
              {toast.message}
            </Text>
          )}
        </View>
        <Pressable
          onPress={hideToast}
          style={{
            padding: 4,
            marginLeft: 8,
          }}
        >
          <Ionicons name="close" size={20} color={toastColors.text} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [newToast, ...prev.slice(0, 2)]); // Keep max 3 toasts
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toasts }}>
      {children}
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
      ))}
    </ToastContext.Provider>
  );
};

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { showToast } = useToast();

  return {
    showSuccess: (title: string, message?: string) =>
      showToast({ type: "success", title, message }),

    showError: (title: string, message?: string) =>
      showToast({ type: "error", title, message }),

    showWarning: (title: string, message?: string) =>
      showToast({ type: "warning", title, message }),

    showInfo: (title: string, message?: string) =>
      showToast({ type: "info", title, message }),
  };
};
