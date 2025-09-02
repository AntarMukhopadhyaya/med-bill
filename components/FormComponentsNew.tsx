import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, shadows, typography } from "./DesignSystem";

// Helper spacing tokens (semantic aliases for readability)
const SPACING_XS = spacing[1]; // 4
const SPACING_SM = spacing[2]; // 8
const SPACING_MD = spacing[3]; // 12
const SPACING_LG = spacing[4]; // 16
const SPACING_XL = spacing[6]; // 24
const RADIUS_SM = 8;
const RADIUS_MD = 12;
const INPUT_MIN_HEIGHT = 50;

// Enhanced Input Component with validation
interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  required = false,
  keyboardType = "default",
  multiline = false,
  numberOfLines = 1,
  editable = true,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry = false,
  style,
  inputStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[{ marginBottom: SPACING_LG }, style]}>
      {/* Label */}
      <Text
        style={[
          typography.sm,
          {
            color: colors.gray[700],
            marginBottom: SPACING_XS,
            fontWeight: "600",
          },
        ]}
      >
        {label}
        {required && <Text style={{ color: colors.error[500] }}> *</Text>}
      </Text>

      {/* Input Container */}
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: multiline ? "flex-start" : "center",
            backgroundColor: colors.gray[50],
            borderWidth: 1,
            borderColor: error
              ? colors.error[500]
              : isFocused
              ? colors.primary[500]
              : colors.gray[200],
            borderRadius: RADIUS_SM,
            paddingHorizontal: SPACING_LG,
            paddingVertical: multiline ? SPACING_SM : 0,
            minHeight: multiline ? 100 : INPUT_MIN_HEIGHT,
          },
          !editable && { backgroundColor: colors.gray[50] },
          shadows.sm,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={colors.gray[500]}
            style={{ marginRight: SPACING_SM }}
          />
        )}

        {/* Text Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[400]}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            typography.base,
            {
              flex: 1,
              color: colors.gray[900],
              textAlignVertical: multiline ? "top" : "center",
              paddingVertical: multiline ? SPACING_SM : 0,
            },
            inputStyle,
          ]}
        />

        {/* Right Icon */}
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={{ padding: SPACING_SM, marginLeft: SPACING_SM }}
          >
            <Ionicons name={rightIcon} size={20} color={colors.gray[500]} />
          </Pressable>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text
          style={[
            typography.sm,
            {
              color: colors.error[500],
              marginTop: SPACING_XS,
            },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

// Enhanced Button Component
interface FormButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// Enhanced Button Component - SIMPLIFIED VERSION
export const FormButton: React.FC<FormButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}) => {
  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 20,
      paddingVertical: 12,
      minHeight: 48,
    };

    // Simple, explicit style definitions
    switch (variant) {
      case "primary":
        return {
          ...baseStyle,
          backgroundColor: disabled ? "#D1D5DB" : "#3B82F6",
          borderColor: disabled ? "#D1D5DB" : "#3B82F6",
        };
      case "secondary":
        return {
          ...baseStyle,
          backgroundColor: disabled ? "#F3F4F6" : "#E5E7EB",
          borderColor: disabled ? "#E5E7EB" : "#D1D5DB",
        };
      case "outline":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
          borderColor: disabled ? "#D1D5DB" : "#3B82F6",
        };
      case "ghost":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
          borderColor: "transparent",
        };
      case "danger":
        return {
          ...baseStyle,
          backgroundColor: disabled ? "#D1D5DB" : "#EF4444",
          borderColor: disabled ? "#D1D5DB" : "#EF4444",
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: "#3B82F6",
          borderColor: "#3B82F6",
        };
    }
  };

  const getTextColor = (): string => {
    if (disabled) return "#6B7280";

    switch (variant) {
      case "primary":
      case "danger":
        return "#FFFFFF";
      case "secondary":
        return "#374151";
      case "outline":
      case "ghost":
        return "#3B82F6";
      default:
        return "#FFFFFF";
    }
  };

  const buttonStyles = getButtonStyles();
  const textColor = getTextColor();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        buttonStyles,
        pressed && !disabled && { opacity: 0.8 },
        fullWidth && { width: "100%", alignSelf: "stretch" },
        style,
      ]}
    >
      {leftIcon && !loading && (
        <Ionicons
          name={leftIcon}
          size={20}
          color={textColor}
          style={{ marginRight: 8 }}
        />
      )}

      {loading && (
        <Ionicons
          name="refresh"
          size={20}
          color={textColor}
          style={{ marginRight: 8 }}
        />
      )}

      <Text
        style={[
          {
            color: textColor,
            fontSize: 16,
            fontWeight: "600",
          },
          textStyle,
        ]}
      >
        {loading ? "Loading..." : title}
      </Text>

      {rightIcon && !loading && (
        <Ionicons
          name={rightIcon}
          size={20}
          color={textColor}
          style={{ marginLeft: 8 }}
        />
      )}
    </Pressable>
  );
};

// Enhanced Picker Component
interface FormPickerProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  error?: string;
  placeholder?: string;
  required?: boolean;
  style?: ViewStyle;
}

export const FormPicker: React.FC<FormPickerProps> = ({
  label,
  value,
  onValueChange,
  options,
  error,
  placeholder = "Select an option",
  required = false,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <View style={[{ marginBottom: SPACING_LG }, style]}>
      {/* Label */}
      <Text
        style={[
          typography.sm,
          {
            color: colors.gray[700],
            marginBottom: SPACING_XS,
            fontWeight: "600",
          },
        ]}
      >
        {label}
        {required && <Text style={{ color: colors.error[500] }}> *</Text>}
      </Text>

      {/* Picker Button */}
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.gray[50],
            borderWidth: 1,
            borderColor: error ? colors.error[500] : colors.gray[200],
            borderRadius: RADIUS_SM,
            paddingHorizontal: SPACING_LG,
            paddingVertical: SPACING_MD,
            minHeight: 52,
          },
          shadows.sm,
        ]}
      >
        <Text
          style={[
            typography.base,
            {
              color: selectedOption ? colors.gray[900] : colors.gray[400],
              flex: 1,
            },
          ]}
        >
          {selectedOption?.label || placeholder}
        </Text>

        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.gray[500]}
        />
      </Pressable>

      {/* Options List */}
      {isOpen && (
        <View
          style={[
            {
              position: "absolute",
              top: "105%",
              left: 0,
              right: 0,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.gray[200],
              borderRadius: RADIUS_MD,
              zIndex: 9999,
              elevation: 10,
              maxHeight: 260,
              overflow: "hidden",
            },
            shadows.lg,
          ]}
        >
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onValueChange(option.value);
                setIsOpen(false);
              }}
              style={({ pressed }) => [
                {
                  paddingHorizontal: SPACING_LG,
                  paddingVertical: SPACING_MD,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.gray[100],
                },
                pressed && { backgroundColor: colors.gray[50] },
                option.value === value && {
                  backgroundColor: colors.primary[50],
                },
              ]}
            >
              <Text
                style={[
                  typography.base,
                  {
                    color:
                      option.value === value
                        ? colors.primary[700]
                        : colors.gray[900],
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Error Message */}
      {error && (
        <Text
          style={[
            typography.sm,
            {
              color: colors.error[500],
              marginTop: SPACING_XS,
            },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

// Form Container with validation
interface FormContainerProps {
  children: React.ReactNode;
  onSubmit: () => void;
  isValid?: boolean;
  style?: ViewStyle;
}

export const FormContainer: React.FC<FormContainerProps> = ({
  children,
  onSubmit,
  isValid = true,
  style,
}) => {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
};

// Form Section Component for grouping related fields
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  inset?: boolean; // reduces outer margin
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  style,
  inset = false,
}) => {
  return (
    <View
      style={[
        {
          marginBottom: SPACING_XL,
          backgroundColor: colors.white,
          borderRadius: RADIUS_MD,
          padding: SPACING_XL,
          borderWidth: 1,
          borderColor: colors.gray[100],
          gap: SPACING_LG,
        },
        shadows.sm,
        inset && { marginHorizontal: SPACING_SM },
        style,
      ]}
    >
      {(title || description) && (
        <View style={{ gap: SPACING_SM }}>
          {title && (
            <Text
              style={[
                typography.lg,
                {
                  color: colors.gray[900],
                  fontWeight: "700",
                },
              ]}
            >
              {title}
            </Text>
          )}
          {description && (
            <Text
              style={[
                typography.sm,
                { color: colors.gray[600], lineHeight: 20 },
              ]}
            >
              {description}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
};
