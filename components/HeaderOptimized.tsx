import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Platform,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { colors, typography, spacing, shadows } from "./DesignSystem";

// Header configuration types
export type HeaderVariant = "default" | "transparent" | "floating";
export type HeaderBackButton = "default" | "close" | "none";
export type HeaderAlignment = "left" | "center";

interface HeaderProps {
  // Required props
  title: string;

  // Optional props
  subtitle?: string;
  variant?: HeaderVariant;
  backButton?: HeaderBackButton;
  alignment?: HeaderAlignment;
  rightElement?: React.ReactNode;
  onBack?: () => void;
  showStatusBar?: boolean;
  statusBarStyle?: "light-content" | "dark-content";
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  iconColor?: string;
  safeAreaEdges?: ("top" | "bottom" | "left" | "right")[];
  testID?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  variant = "default",
  backButton = "default",
  alignment = "left",
  rightElement,
  onBack,
  showStatusBar = true,
  statusBarStyle = "dark-content",
  backgroundColor,
  titleColor,
  subtitleColor,
  iconColor,
  safeAreaEdges = ["top"],
  testID,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      if (router.canGoBack()) {
        router.back();
      }
    }
  };

  // Memoized styles for performance
  const containerStyles = useMemo<ViewStyle>(() => {
    const baseStyles: ViewStyle = {
      paddingTop: insets.top + spacing[4],
      paddingBottom: spacing[4],
      paddingHorizontal: spacing[6],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 60 + insets.top,
      width: "100%",
    };

    switch (variant) {
      case "transparent":
        return {
          ...baseStyles,
          backgroundColor: "transparent",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        };
      case "floating":
        return {
          ...baseStyles,
          backgroundColor: backgroundColor || colors.white,
          margin: spacing[4],
          borderRadius: 12,
          ...shadows.lg,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        };
      default:
        return {
          ...baseStyles,
          backgroundColor: backgroundColor || colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.gray[200],
          ...shadows.sm,
        };
    }
  }, [variant, backgroundColor, insets.top]);

  const contentStyles = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: alignment === "center" ? "center" : "flex-start",
    }),
    [alignment]
  );

  const titleStyles = useMemo<TextStyle>(
    () => ({
      ...typography["2xl"],
      fontWeight: "700",
      color: titleColor || colors.gray[900],
      textAlign: alignment === "center" ? "center" : "left",
      maxWidth: width - 120, // Ensure title doesn't overflow
    }),
    [titleColor, alignment, width]
  );

  const subtitleStyles = useMemo<TextStyle>(
    () => ({
      ...typography.sm,
      color: subtitleColor || colors.gray[600],
      marginTop: spacing[1],
      textAlign: alignment === "center" ? "center" : "left",
      maxWidth: width - 120,
    }),
    [subtitleColor, alignment, width]
  );

  const iconStyles = useMemo(
    () => ({
      color: iconColor || colors.gray[600],
      size: 20,
    }),
    [iconColor]
  );

  // Determine which back icon to show
  const backIconName = backButton === "close" ? "times" : "arrow-left";

  return (
    <>
      {showStatusBar && (
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={
            variant === "transparent"
              ? "transparent"
              : backgroundColor || colors.white
          }
          translucent={variant === "transparent"}
        />
      )}

      <View
        style={containerStyles}
        testID={testID}
        accessible
        accessibilityLabel={`Header: ${title}${subtitle ? `, ${subtitle}` : ""}`}
      >
        {/* Left Section - Back Button */}
        <View style={{ minWidth: 44, alignItems: "flex-start" }}>
          {backButton !== "none" && (
            <TouchableOpacity
              onPress={handleBack}
              accessibilityLabel={backButton === "close" ? "Close" : "Go back"}
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="header-back-button"
            >
              <FontAwesome name={backIconName} {...iconStyles} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center Section - Title and Subtitle */}
        <View style={contentStyles}>
          <View
            style={{
              flex: alignment === "center" ? 1 : undefined,
              alignItems: alignment === "center" ? "center" : "flex-start",
            }}
          >
            <Text
              style={titleStyles}
              numberOfLines={1}
              ellipsizeMode="tail"
              accessibilityRole="header"
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={subtitleStyles}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Right Section - Custom Elements */}
        <View style={{ minWidth: 44, alignItems: "flex-end" }}>
          {rightElement}
        </View>
      </View>
    </>
  );
};

// Header Action Button Component for consistent right-side actions
interface HeaderActionProps {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  disabled?: boolean;
  testID?: string;
}

export const HeaderAction: React.FC<HeaderActionProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.gray[600],
  disabled = false,
  testID,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      testID={testID}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <FontAwesome name={icon} size={20} color={color} />
    </TouchableOpacity>
  );
};

// Header Group for multiple actions
interface HeaderActionGroupProps {
  children: React.ReactNode;
  spacing?: number;
}

export const HeaderActionGroup: React.FC<HeaderActionGroupProps> = ({
  children,
  spacing: spacingProp = spacing[3],
}) => {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacingProp }}
    >
      {children}
    </View>
  );
};

// Pre-configured Header variants for common use cases
export const PageHeader: React.FC<Omit<HeaderProps, "variant">> = (props) => (
  <Header variant="default" {...props} />
);

export const ModalHeader: React.FC<
  Omit<HeaderProps, "variant" | "backButton">
> = (props) => <Header variant="default" backButton="close" {...props} />;

export const TransparentHeader: React.FC<Omit<HeaderProps, "variant">> = (
  props
) => <Header variant="transparent" statusBarStyle="light-content" {...props} />;

export const FloatingHeader: React.FC<Omit<HeaderProps, "variant">> = (
  props
) => <Header variant="floating" {...props} />;

// Header with search capability
interface SearchHeaderProps extends Omit<HeaderProps, "rightElement"> {
  searchValue: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
  onCancel?: () => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchValue,
  onSearchChange,
  placeholder = "Search...",
  onCancel,
  ...headerProps
}) => {
  return (
    <Header
      {...headerProps}
      rightElement={
        <HeaderAction
          icon="times"
          onPress={onCancel || (() => onSearchChange(""))}
          accessibilityLabel="Clear search"
        />
      }
    >
      {/* Search input would be implemented here */}
    </Header>
  );
};
