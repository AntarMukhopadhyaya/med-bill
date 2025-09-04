import React from "react";
import { ViewStyle } from "react-native";
import { colors, spacing, Card, HStack, VStack } from "./DesignSystem";
import { Spinner } from "./ui/spinner";
import { Text } from "./ui/text";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  message?: string;
  color?: string;
  style?: ViewStyle;
  overlay?: boolean;
  overlayColor?: string;
  variant?: "default" | "card" | "minimal";
  /** Center vertically (useful inside flex containers) */
  center?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "large",
  message = "Loading...",
  color = colors.primary[500],
  style,
  overlay = false,
  overlayColor = "rgba(255,255,255,0.9)",
  variant = "default",
  center = true,
}) => {
  const containerStyle: ViewStyle = {
    ...(center && { justifyContent: "center", alignItems: "center" }),
    ...(overlay && {
      position: "absolute",
      inset: 0 as any,
      backgroundColor: overlayColor,
      zIndex: 1000,
    }),
    ...style,
  };

  const contentPadding =
    variant === "card" ? "p-6" : variant === "default" ? "p-4" : "";

  const inner = (
    <VStack className={`items-center ${contentPadding}`}>
      <Spinner
        size={size}
        color={color}
        className={message ? "mb-3" : undefined}
        accessibilityLabel={message}
      />
      {message && (
        <Text className="text-sm font-medium text-typography-600 text-center">
          {message}
        </Text>
      )}
    </VStack>
  );

  if (variant === "card") {
    return (
      <VStack style={containerStyle} className="">
        <Card variant="elevated" className="items-center justify-center">
          {inner}
        </Card>
      </VStack>
    );
  }

  return (
    <VStack style={containerStyle} className="bg-transparent">
      {inner}
    </VStack>
  );
};

// Convenience components for common use cases
export const OverlaySpinner: React.FC<Omit<LoadingSpinnerProps, "overlay">> = (
  props
) => <LoadingSpinner {...props} overlay={true} />;

export const CardSpinner: React.FC<Omit<LoadingSpinnerProps, "variant">> = (
  props
) => <LoadingSpinner {...props} variant="card" />;

export const MinimalSpinner: React.FC<Omit<LoadingSpinnerProps, "variant">> = (
  props
) => <LoadingSpinner {...props} variant="minimal" />;

export default LoadingSpinner;
