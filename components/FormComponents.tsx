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
  const getButtonStyles = () => {
    const baseStyle = {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: 8,
      borderWidth: 1,
    };

    const sizeStyles = {
      sm: {
        paddingHorizontal: SPACING_LG,
        paddingVertical: SPACING_SM,
        minHeight: 40,
      },
      md: {
        paddingHorizontal: SPACING_XL,
        paddingVertical: SPACING_MD,
        minHeight: 48,
      },
      lg: {
        paddingHorizontal: SPACING_XL,
        paddingVertical: SPACING_LG,
        minHeight: 56,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: disabled ? colors.gray[300] : colors.primary[500],
        borderColor: disabled ? colors.gray[300] : colors.primary[500],
      },
      secondary: {
        backgroundColor: disabled ? colors.gray[100] : colors.gray[200],
        borderColor: disabled ? colors.gray[200] : colors.gray[300],
      },
      outline: {
        backgroundColor: "transparent",
        borderColor: disabled ? colors.gray[300] : colors.primary[500],
      },
      ghost: {
        backgroundColor: "transparent",
        borderColor: "transparent",
      },
      danger: {
        backgroundColor: disabled ? colors.gray[300] : colors.error[500],
        borderColor: disabled ? colors.gray[300] : colors.error[500],
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...(variantStyles as any)[variant],
      ...(fullWidth ? { width: "100%" } : {}),
      ...shadows.sm,
    } as ViewStyle;
  };

  // subtle pressed depth effect helper
  const isPressedShadow = () => ({
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  });

  const getTextStyles = () => {
    const sizeStyles = {
      sm: typography.sm,
      md: typography.base,
      lg: typography.lg,
    };

    const variantStyles = {
      primary: { color: disabled ? colors.gray[500] : colors.white },
      secondary: { color: disabled ? colors.gray[400] : colors.gray[700] },
      outline: { color: disabled ? colors.gray[400] : colors.primary[500] },
      ghost: { color: disabled ? colors.gray[400] : colors.primary[500] },
      danger: { color: disabled ? colors.gray[500] : colors.white },
    };

    return {
      ...(sizeStyles as any)[size],
      ...(variantStyles as any)[variant],
      fontWeight: "600" as const,
    };
  };

  const textComputedStyle = getTextStyles();
  const buttonBaseStyle = getButtonStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        buttonBaseStyle,
        pressed && !disabled && { opacity: 0.9 },
        style,
      ]}
    >
      {leftIcon && !loading && (
        <Ionicons
          name={leftIcon}
          size={size === "sm" ? 16 : size === "lg" ? 24 : 20}
          color={textComputedStyle.color as string}
          style={{ marginRight: SPACING_SM }}
        />
      )}

      {loading && (
        <View style={{ marginRight: SPACING_SM }}>
          <Text style={[textComputedStyle, textStyle]}>⭮</Text>
        </View>
      )}

      <Text style={[textComputedStyle, textStyle]}>
        {loading ? "Loading..." : title}
      </Text>

      {rightIcon && !loading && (
        <Ionicons
          name={rightIcon}
          size={size === "sm" ? 16 : size === "lg" ? 24 : 20}
          color={textComputedStyle.color as string}
          style={{ marginLeft: SPACING_SM }}
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
              zIndex: 1000,
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
