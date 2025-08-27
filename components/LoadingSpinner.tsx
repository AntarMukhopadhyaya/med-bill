import React from "react";
import { View, ActivityIndicator, Text, ViewStyle } from "react-native";
import { colors, spacing } from "./DesignSystem";

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: "small" | "large";
  /** Loading message to display */
  message?: string;
  /** Custom color for the spinner */
  color?: string;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Whether to show as overlay (absolute positioned) */
  overlay?: boolean;
  /** Background color for overlay mode */
  overlayColor?: string;
  /** Whether to show in a card-like container */
  variant?: "default" | "card" | "minimal";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "large",
  message = "Loading...",
  color = colors.primary[500],
  style,
  overlay = false,
  overlayColor = "rgba(255, 255, 255, 0.9)",
  variant = "default",
}) => {
  const containerStyle: ViewStyle = {
    justifyContent: "center",
    alignItems: "center",
    ...(overlay && {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: overlayColor,
      zIndex: 1000,
    }),
    ...style,
  };

  const contentStyle: ViewStyle = {
    alignItems: "center",
    justifyContent: "center",
    ...(variant === "card" && {
      backgroundColor: colors.white,
      padding: spacing[6],
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
    ...(variant === "default" && {
      padding: spacing[4],
    }),
  };

  return (
    <View style={containerStyle}>
      <View style={contentStyle}>
        <ActivityIndicator
          size={size}
          color={color}
          style={{ marginBottom: message ? spacing[3] : 0 }}
        />
        {message && (
          <Text
            style={{
              fontSize: 14,
              color: colors.gray[600],
              textAlign: "center",
              fontWeight: "500",
            }}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
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
