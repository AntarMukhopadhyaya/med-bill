import React from "react";
import { Input, InputField, InputIcon, InputSlot } from "./ui/input";
import {
  FormControlError,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlErrorIcon,
  FormControlErrorText,
} from "./ui/form-control";
import { Text } from "./ui/text";
import { Controller, useFormContext } from "react-hook-form";
import {
  AlertCircleIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
} from "./ui/icon";
import { Button, ButtonSpinner, ButtonText } from "./ui/button";
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from "./ui/select";
import { Box } from "./ui/box";
import { Textarea, TextareaInput } from "./ui/textarea";

// Enhanced Input Component with validation
interface FormInputProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  rules?: any;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export const FormInput: React.FC<FormInputProps> = ({
  name,
  label,
  placeholder,
  required = false,
  keyboardType = "default",
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  leftIcon,
  rightIcon,
  secureTextEntry = false,
  autoCapitalize,
  rules,
}) => {
  const { control } = useFormContext();
  const [showPassword, setShowPassword] = React.useState(!secureTextEntry);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isDisabled={disabled}>
          <FormControlLabel>
            <FormControlLabelText className="text-sm font-semibold text-typography-700 mb-1">
              {label}
              {required && <Text className="text-error-500"> *</Text>}
            </FormControlLabelText>
          </FormControlLabel>

          <Input
            variant="outline"
            size="md"
            isDisabled={disabled}
            isInvalid={!!error}
          >
            {leftIcon && (
              <InputSlot className="pl-3">
                <InputIcon as={leftIcon as any} />
              </InputSlot>
            )}

            <InputField
              type={secureTextEntry && !showPassword ? "password" : "text"}
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              // theme-aware placeholder via className below
              keyboardType={keyboardType}
              multiline={multiline}
              numberOfLines={numberOfLines}
              autoCapitalize={autoCapitalize}
              className={`flex-1 text-typography-900 ${
                multiline ? "py-3" : "py-0"
              } ${leftIcon ? "pl-2" : "pl-4"} ${rightIcon ? "pr-2" : "pr-4"}`}
            />

            {secureTextEntry && (
              <InputSlot
                className="pr-3"
                onPress={() => setShowPassword(!showPassword)}
              >
                <InputIcon
                  as={showPassword ? EyeOffIcon : EyeIcon}
                  className="text-typography-500"
                />
              </InputSlot>
            )}

            {rightIcon && !secureTextEntry && (
              <InputSlot className="pr-3">
                <InputIcon as={rightIcon as any} />
              </InputSlot>
            )}
          </Input>

          {error && (
            <FormControlError>
              <FormControlErrorIcon as={AlertCircleIcon} />
              <FormControlErrorText>{error.message}</FormControlErrorText>
            </FormControlError>
          )}
        </FormControl>
      )}
    />
  );
};

// Enhanced Button Component
interface FormButtonProps {
  title: string;
  onPress: () => void;
  variant?: "solid" | "outline" | "link";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const FormButton: React.FC<FormButtonProps> = ({
  title,
  onPress,
  variant = "solid",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      isDisabled={disabled || loading}
      onPress={onPress}
      className={fullWidth ? "w-full" : ""}
    >
      {loading && <ButtonSpinner className="mr-2" />}
      {!loading &&
        leftIcon &&
        React.cloneElement(leftIcon as React.ReactElement<any>, {
          className: "mr-2",
        })}

      <ButtonText>{loading ? "Loading..." : title}</ButtonText>

      {!loading &&
        rightIcon &&
        React.cloneElement(rightIcon as React.ReactElement<any>, {
          className: "ml-2",
        })}
    </Button>
  );
};

// Enhanced Select Component
interface FormSelectProps {
  name: string;
  label: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rules?: any;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  name,
  label,
  options,
  placeholder = "Select an option",
  required = false,
  disabled = false,
  rules,
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isDisabled={disabled}>
          <FormControlLabel>
            <FormControlLabelText className="text-sm font-semibold text-typography-700 mb-1">
              {label}
              {required && <Text className="text-error-500"> *</Text>}
            </FormControlLabelText>
          </FormControlLabel>

          <Select onValueChange={onChange} selectedValue={value}>
            <SelectTrigger variant="outline" size="md">
              <SelectInput placeholder={placeholder} />
              <SelectIcon as={ChevronDownIcon} />
            </SelectTrigger>

            <SelectPortal>
              <SelectBackdrop />
              <SelectContent>
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>

                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </SelectContent>
            </SelectPortal>
          </Select>

          {error && (
            <FormControlError>
              <FormControlErrorIcon as={AlertCircleIcon} />
              <FormControlErrorText>{error.message}</FormControlErrorText>
            </FormControlError>
          )}
        </FormControl>
      )}
    />
  );
};

// Form Container with validation
interface FormContainerProps {
  children: React.ReactNode;
  onSubmit: () => void;
  style?: any;
}

export const FormContainer: React.FC<FormContainerProps> = ({
  children,
  onSubmit,
  style,
}) => {
  return (
    <Box className="flex-1" style={style}>
      {children}
    </Box>
  );
};

// Form Section Component for grouping related fields
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  style?: any;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  style,
}) => {
  return (
    <Box
      className="mb-6 bg-background-0 rounded-lg p-6 border border-outline-200 gap-4 shadow-sm"
      style={style}
    >
      {(title || description) && (
        <Box className="gap-2">
          {title && (
            <Text className="text-lg font-bold text-typography-900">
              {title}
            </Text>
          )}
          {description && (
            <Text className="text-sm text-typography-600 leading-5">
              {description}
            </Text>
          )}
        </Box>
      )}
      <Box className="gap-4">{children}</Box>
    </Box>
  );
};

// FormTextarea Component (gluestack Textarea + RHF)
interface FormTextareaProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rules?: any;
  height?: number; // optional custom height override
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  rules,
  height,
  autoCapitalize,
}) => {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isDisabled={disabled}>
          <FormControlLabel>
            <FormControlLabelText className="text-sm font-semibold text-typography-700 mb-1">
              {label}
              {required && <Text className="text-error-500"> *</Text>}
            </FormControlLabelText>
          </FormControlLabel>
          <Textarea
            variant="default"
            size="md"
            isDisabled={disabled}
            isInvalid={!!error}
            // allow consumer to tweak height without redefining styles
            style={height ? { height } : undefined}
          >
            <TextareaInput
              value={value ?? ""}
              onChangeText={onChange}
              placeholder={placeholder}
              // theme-aware placeholder via className
              autoCapitalize={autoCapitalize}
              // ensure multi-line semantics
              multiline
              className="text-typography-900"
            />
          </Textarea>
          {error && (
            <FormControlError>
              <FormControlErrorIcon as={AlertCircleIcon} />
              <FormControlErrorText>{error.message}</FormControlErrorText>
            </FormControlError>
          )}
        </FormControl>
      )}
    />
  );
};
