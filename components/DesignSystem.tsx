import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInput,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";

// Import gluestack UI components
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { FormControl } from "./ui/form-control";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { Modal } from "./ui/modal";
import { HStack } from "./ui/hstack";
import { VStack } from "./ui/vstack";
import { Icon } from "./ui/icon";
import { Heading } from "./ui/heading";
import { Button as GSButton, ButtonText } from "./ui/button";
import { Input as GSInput, InputField } from "./ui/input";
import { BaseCard } from "./shared/BaseCard";

// Re-export gluestack UI components
export {
  Card,
  Badge,
  FormControl,
  Textarea,
  Select,
  Modal,
  HStack,
  VStack,
  Icon,
  Heading,
  BaseCard,
};

// Custom components built on gluestack are exported individually (Button, Input, etc.)

// Theme-aware Design System Colors (mapped to NativeWind & gluestack semantic tokens with native fallbacks)
// Rationale: instead of refactoring every legacy inline usage (e.g. colors.primary[500]) we remap the palette
// to reference semantic CSS variables on web while retaining hex fallbacks for native platforms.
// This lets existing DesignSystem consumers automatically pick up dark/light theme changes.
const varOr = (token: string, fallback: string) =>
  Platform.OS === "web" ? `rgb(var(--color-${token}))` : fallback;

export const colors = {
  primary: {
    50: varOr("primary-50", "#EFF6FF"),
    100: varOr("primary-100", "#DBEAFE"),
    200: varOr("primary-200", "#BFDBFE"),
    300: varOr("primary-300", "#93C5FD"),
    400: varOr("primary-400", "#60A5FA"),
    500: varOr("primary-500", "#3B82F6"),
    600: varOr("primary-600", "#2563EB"),
    700: varOr("primary-700", "#1D4ED8"),
    800: varOr("primary-800", "#1E40AF"),
    900: varOr("primary-900", "#1E3A8A"),
  },
  gray: {
    50: varOr("gray-50", "#F9FAFB"),
    100: varOr("gray-100", "#F3F4F6"),
    200: varOr("gray-200", "#E5E7EB"),
    300: varOr("gray-300", "#D1D5DB"),
    400: varOr("gray-400", "#9CA3AF"),
    500: varOr("gray-500", "#6B7280"),
    600: varOr("gray-600", "#4B5563"),
    700: varOr("gray-700", "#374151"),
    800: varOr("gray-800", "#1F2937"),
    900: varOr("gray-900", "#111827"),
  },
  success: {
    50: varOr("success-50", "#F0FDF4"),
    100: varOr("success-100", "#DCFCE7"),
    300: varOr("success-300", "#86EFAC"),
    500: varOr("success-500", "#10B981"),
    600: varOr("success-600", "#059669"),
    700: varOr("success-700", "#047857"),
  },
  warning: {
    50: varOr("warning-50", "#FFFBEB"),
    100: varOr("warning-100", "#FEF3C7"),
    300: varOr("warning-300", "#FCD34D"),
    500: varOr("warning-500", "#F59E0B"),
    600: varOr("warning-600", "#D97706"),
  },
  error: {
    50: varOr("error-50", "#FEF2F2"),
    100: varOr("error-100", "#FEE2E2"),
    300: varOr("error-300", "#FCA5A5"),
    500: varOr("error-500", "#EF4444"),
    600: varOr("error-600", "#DC2626"),
  },
  info: {
    50: varOr("info-50", "#F0F9FF"),
    100: varOr("info-100", "#E0F2FE"),
    300: varOr("info-300", "#A5D8FF"),
    500: varOr("info-500", "#3B82F6"),
    600: varOr("info-600", "#1D4ED8"),
  },
  white: varOr("white", "#FFFFFF"),
  black: varOr("black", "#000000"),
};

// Typography Scale (for compatibility)
export const typography = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 28 },
  "2xl": { fontSize: 24, lineHeight: 32 },
  "3xl": { fontSize: 30, lineHeight: 36 },
  "4xl": { fontSize: 36, lineHeight: 40 },
};

// Spacing Scale (for compatibility)
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

// Shadow Presets (for compatibility)
export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
};

// Button Component using gluestack
export const Button: React.FC<{
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  iconPosition?: "left" | "right";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  disabled = false,
  loading = false,
  style,
}) => {
  const variantMap = {
    primary: "solid",
    secondary: "outline",
    outline: "outline",
    ghost: "link",
    danger: "solid",
  };

  const actionMap = {
    primary: "primary",
    secondary: "secondary",
    outline: "secondary",
    ghost: "secondary",
    danger: "negative",
  };

  return (
    <GSButton
      size={size}
      variant={variantMap[variant] as any}
      action={actionMap[variant] as any}
      onPress={onPress}
      isDisabled={disabled || loading}
      style={style}
      className={variant === "danger" ? "bg-error-500" : ""}
    >
      {icon && iconPosition === "left" && (
        <FontAwesome
          name={icon}
          size={16}
          // Use theme-aware palette (primary/danger -> onPrimary text, else neutral foreground)
          color={
            variant === "primary" || variant === "danger"
              ? colors.white
              : colors.gray[700]
          }
          style={{ marginRight: 8 }}
        />
      )}
      <ButtonText
        className={
          variant === "primary" || variant === "danger"
            ? "text-white"
            : "text-typography-700"
        }
      >
        {loading ? "Loading..." : title}
      </ButtonText>
      {icon && iconPosition === "right" && (
        <FontAwesome
          name={icon}
          size={16}
          color={
            variant === "primary" || variant === "danger"
              ? colors.white
              : colors.gray[700]
          }
          style={{ marginLeft: 8 }}
        />
      )}
    </GSButton>
  );
};

// Input Component using gluestack
export const Input: React.FC<{
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
  numberOfLines?: number;
  required?: boolean;
  style?: ViewStyle;
}> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  keyboardType = "default",
  multiline = false,
  numberOfLines = 1,
  required = false,
  style,
}) => {
  return (
    <View style={{ marginBottom: spacing[4], ...style }}>
      {label && (
        <Text className="text-sm font-medium text-typography-700 mb-1">
          {label}
          {required && <Text className="text-error-500">*</Text>}
        </Text>
      )}
      <GSInput
        variant={error ? "error" : "outline"}
        size="md"
        className="bg-background-0"
      >
        {icon && (
          <View className="absolute left-3 top-3 z-10">
            <FontAwesome name={icon} size={16} color={colors.gray[400]} />
          </View>
        )}
        <InputField
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          className={`${icon ? "pl-10" : "pl-4"} pr-4 py-3 text-typography-900`}
        />
      </GSInput>
      {error && <Text className="text-sm text-error-600 mt-1">{error}</Text>}
    </View>
  );
};

// Header Component using gluestack
export const Header: React.FC<{
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onBack?: () => void;
}> = ({ title, subtitle, rightElement, onBack }) => {
  return (
    <View className="bg-background-0 px-6 py-4 border-b border-outline-200 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          {onBack && (
            <TouchableOpacity onPress={onBack} className="mr-4">
              <FontAwesome
                name="arrow-left"
                size={20}
                color={colors.gray[600]}
              />
            </TouchableOpacity>
          )}
          <View className="flex-1">
            <Heading size="xl" className="font-bold text-typography-900">
              {title}
            </Heading>
            {subtitle && (
              <Text className="text-sm text-typography-600 mt-1">
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {rightElement}
      </View>
    </View>
  );
};

// SearchInput Component
export const SearchInput: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}> = ({ value, onChangeText, placeholder = "Search...", style }) => {
  return (
    <View className="relative mb-4" style={style}>
      <FontAwesome
        name="search"
        size={16}
        color={colors.gray[400]}
        style={{
          position: "absolute",
          left: spacing[3],
          top: spacing[3],
          zIndex: 1,
        }}
      />
      <GSInput variant="outline" size="md" className="bg-background-50">
        <InputField
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          className="pl-10 pr-4 py-3 text-typography-900"
        />
      </GSInput>
    </View>
  );
};

// EmptyState Component using gluestack
export const EmptyState: React.FC<{
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, description, actionLabel, onAction }) => {
  return (
    <Card variant="elevated" className="p-8 items-center">
      <FontAwesome name={icon} size={48} color={colors.gray[300]} />
      <Heading
        size="lg"
        className="font-semibold text-typography-500 mt-4 text-center"
      >
        {title}
      </Heading>
      <Text className="text-base text-typography-400 text-center mt-2 mb-4">
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="primary" />
      )}
    </Card>
  );
};

// StatsCard Component
export const StatsCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  color?: "primary" | "success" | "warning" | "error";
  onPress?: () => void;
}> = ({ title, value, subtitle, icon, color = "primary", onPress }) => {
  // NOTE: color prop retained for backward compatibility but icon styling is now neutral
  // to match QuickActionCard (consistent UI). If future accent needed, apply subtle border.

  const cardBody = (
    <Card
      variant="elevated"
      className="p-4"
      // Fixed height so all StatCards align uniformly regardless of text length
      style={{ height: 112 }}
    >
      <HStack className="items-center" space="md">
        <VStack
          className="w-12 h-12 bg-background-100 rounded-xl items-center justify-center"
          accessibilityRole="image"
        >
          <FontAwesome name={icon} size={24} color={undefined} />
        </VStack>
        <VStack className="flex-1 justify-center">
          <Text
            className="text-sm text-typography-600 mb-1"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          <Heading
            size="xl"
            className="font-bold text-typography-900"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value}
          </Heading>
          {subtitle && (
            <Text
              className="text-xs text-typography-500 mt-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          )}
        </VStack>
      </HStack>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {cardBody}
      </TouchableOpacity>
    );
  }

  return cardBody;
};

// ModalHeader Component
export const ModalHeader: React.FC<{
  title: string;
  onClose: () => void;
  rightElement?: React.ReactNode;
}> = ({ title, onClose, rightElement }) => {
  return (
    <View className="bg-background-0 px-6 py-4 border-b border-outline-200 flex-row items-center justify-between">
      <Heading size="lg" className="font-bold text-typography-900 flex-1">
        {title}
      </Heading>
      <View className="flex-row items-center gap-2">
        {rightElement}
        <TouchableOpacity onPress={onClose}>
          <FontAwesome name="times" size={24} color={colors.gray[600]} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// FilterChip Component
export const FilterChip: React.FC<{
  label: string;
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  selected: boolean;
  onPress: () => void;
}> = ({ label, icon, selected, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${
        selected
          ? "border-primary-500 bg-primary-500"
          : "border-outline-300 bg-background-0"
      }`}
    >
      {icon && (
        <FontAwesome
          name={icon}
          size={14}
          color={selected ? colors.white : colors.gray[600]}
          style={{ marginRight: spacing[2] }}
        />
      )}
      <Text
        className={`text-sm font-semibold ${
          selected ? "text-white" : "text-typography-700"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// SectionHeader Component
export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}> = ({ title, subtitle, rightElement }) => {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-1">
        <Heading size="lg" className="font-bold text-typography-900">
          {title}
        </Heading>
        {subtitle && (
          <Text className="text-sm text-typography-600 mt-1">{subtitle}</Text>
        )}
      </View>
      {rightElement}
    </View>
  );
};

// SafeScreen Component
export const SafeScreen: React.FC<{
  children: React.ReactNode;
  backgroundColor?: string;
  style?: ViewStyle;
  edges?: ("top" | "bottom" | "left" | "right")[];
}> = ({
  children,
  backgroundColor,
  style,
  edges = ["top", "left", "right"],
}) => {
  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          Platform.OS === "android" ? backgroundColor : undefined
        }
        translucent={false}
      />
      <SafeAreaView
        edges={edges}
        className="flex-1 bg-background-50"
        style={style}
      >
        {children}
      </SafeAreaView>
    </>
  );
};

// Picker Component using gluestack Select
import {
  Select as GSSelect,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
} from "./ui/select";
import { ChevronDownIcon } from "./ui/icon";

export const Picker: React.FC<{
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  error?: string;
  placeholder?: string;
}> = ({
  label,
  selectedValue,
  onValueChange,
  items,
  error,
  placeholder = "Select an option",
}) => {
  const selectedItem = items.find((item) => item.value === selectedValue);

  return (
    <View>
      {label && (
        <Text className="text-sm font-medium text-typography-700 mb-2">
          {label}
        </Text>
      )}

      <GSSelect selectedValue={selectedValue} onValueChange={onValueChange}>
        <SelectTrigger variant={error ? "error" : "outline"} size="md">
          <SelectInput
            placeholder={placeholder}
            value={selectedItem?.label || ""}
            className="text-typography-900"
          />
          <SelectIcon className="mr-3">
            <ChevronDownIcon />
          </SelectIcon>
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent>
            <SelectDragIndicatorWrapper>
              <SelectDragIndicator />
            </SelectDragIndicatorWrapper>
            {items.map((item) => (
              <SelectItem
                key={item.value}
                label={item.label}
                value={item.value}
              />
            ))}
          </SelectContent>
        </SelectPortal>
      </GSSelect>

      {error && <Text className="text-sm text-error-500 mt-1">{error}</Text>}
    </View>
  );
};

// Re-export LoadingSpinner for convenience
export {
  LoadingSpinner,
  OverlaySpinner,
  CardSpinner,
  MinimalSpinner,
} from "./LoadingSpinner";

// Re-export HeaderWithSearch for convenience
export { HeaderWithSearch } from "./HeaderOptimized";
