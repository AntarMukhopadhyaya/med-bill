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

// Design System Colors
export const colors = {
  primary: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  success: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    300: "#86EFAC",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
  },
  warning: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    300: "#FCD34D",
    500: "#F59E0B",
    600: "#D97706",
  },
  error: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    300: "#FCA5A5",
    500: "#EF4444",
    600: "#DC2626",
  },
  info: {
    50: "#F0F9FF",
    100: "#E0F2FE",
    300: "#A5D8FF",
    500: "#3B82F6",
    600: "#1D4ED8",
  },
  white: "#FFFFFF",
  black: "#000000",
};

// Typography Scale
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

// Spacing Scale
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

// Shadow Presets
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

// Card Component
interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined";
  padding?: keyof typeof spacing;
  margin?: keyof typeof spacing;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = 4,
  margin = 0,
  style,
}) => {
  const cardStyles: ViewStyle = {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing[padding],
    margin: spacing[margin],
    ...style,
  };

  if (variant === "elevated") {
    Object.assign(cardStyles, shadows.md);
  } else if (variant === "outlined") {
    cardStyles.borderWidth = 1;
    cardStyles.borderColor = colors.gray[200];
  } else {
    Object.assign(cardStyles, shadows.sm);
  }

  return <View style={cardStyles}>{children}</View>;
};

// Button Component
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  iconPosition?: "left" | "right";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
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
  const buttonStyles: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    ...style,
  };

  const textStyles: TextStyle = {
    fontWeight: "600",
  };

  // Size styles
  switch (size) {
    case "sm":
      buttonStyles.paddingVertical = spacing[2];
      buttonStyles.paddingHorizontal = spacing[3];
      Object.assign(textStyles, typography.sm);
      break;
    case "lg":
      buttonStyles.paddingVertical = spacing[4];
      buttonStyles.paddingHorizontal = spacing[6];
      Object.assign(textStyles, typography.lg);
      break;
    default:
      buttonStyles.paddingVertical = spacing[3];
      buttonStyles.paddingHorizontal = spacing[4];
      Object.assign(textStyles, typography.base);
  }

  // Variant styles
  switch (variant) {
    case "secondary":
      buttonStyles.backgroundColor = colors.gray[100];
      textStyles.color = colors.gray[700];
      break;
    case "outline":
      buttonStyles.backgroundColor = "transparent";
      buttonStyles.borderWidth = 1;
      buttonStyles.borderColor = colors.primary[500];
      textStyles.color = colors.primary[600];
      break;
    case "ghost":
      buttonStyles.backgroundColor = "transparent";
      textStyles.color = colors.primary[600];
      break;
    case "danger":
      buttonStyles.backgroundColor = colors.error[500];
      textStyles.color = colors.white;
      break;
    default:
      buttonStyles.backgroundColor = colors.primary[500];
      textStyles.color = colors.white;
  }

  // Disabled state
  if (disabled || loading) {
    buttonStyles.opacity = 0.5;
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {icon && iconPosition === "left" && (
        <FontAwesome
          name={icon}
          size={typography.base.fontSize}
          color={textStyles.color}
          style={{ marginRight: spacing[2] }}
        />
      )}
      <Text style={textStyles}>{loading ? "Loading..." : title}</Text>
      {icon && iconPosition === "right" && (
        <FontAwesome
          name={icon}
          size={typography.base.fontSize}
          color={textStyles.color}
          style={{ marginLeft: spacing[2] }}
        />
      )}
    </TouchableOpacity>
  );
};

// Badge Component
interface BadgeProps {
  label: string;
  variant?: "primary" | "secondary" | "success" | "warning" | "error";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "primary",
  size = "sm",
}) => {
  const badgeStyles: ViewStyle = {
    paddingHorizontal: size === "sm" ? spacing[2] : spacing[3],
    paddingVertical: size === "sm" ? spacing[1] : spacing[2],
    borderRadius: size === "sm" ? 12 : 16,
    alignSelf: "flex-start",
  };

  const textStyles: TextStyle = {
    fontWeight: "600",
    textAlign: "center",
    ...(size === "sm" ? typography.xs : typography.sm),
  };

  switch (variant) {
    case "secondary":
      badgeStyles.backgroundColor = colors.gray[100];
      textStyles.color = colors.gray[700];
      break;
    case "success":
      badgeStyles.backgroundColor = colors.success[100];
      textStyles.color = colors.success[700];
      break;
    case "warning":
      badgeStyles.backgroundColor = colors.warning[100];
      textStyles.color = colors.warning[600];
      break;
    case "error":
      badgeStyles.backgroundColor = colors.error[100];
      textStyles.color = colors.error[600];
      break;
    default:
      badgeStyles.backgroundColor = colors.primary[100];
      textStyles.color = colors.primary[700];
  }

  return (
    <View style={badgeStyles}>
      <Text style={textStyles}>{label}</Text>
    </View>
  );
};

// Header Component
interface HeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  rightElement,
  onBack,
}) => {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
        ...shadows.sm,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={{ marginRight: spacing[4] }}
            >
              <FontAwesome
                name="arrow-left"
                size={20}
                color={colors.gray[600]}
              />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                ...typography["2xl"],
                fontWeight: "700",
                color: colors.gray[900],
              }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={{
                  ...typography.sm,
                  color: colors.gray[600],
                  marginTop: spacing[1],
                }}
              >
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

// Search Input Component
interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  placeholder = "Search...",
  style,
}) => {
  return (
    <View
      style={{
        position: "relative",
        marginBottom: spacing[4],
        ...style,
      }}
    >
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
      <TextInput
        style={{
          backgroundColor: colors.gray[50],
          borderWidth: 1,
          borderColor: colors.gray[300],
          borderRadius: 8,
          paddingLeft: spacing[10],
          paddingRight: spacing[4],
          paddingVertical: spacing[3],
          ...typography.base,
          color: colors.gray[900],
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.gray[400]}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
};

// Empty State Component
interface EmptyStateProps {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <Card variant="elevated" padding={8} style={{ alignItems: "center" }}>
      <FontAwesome name={icon} size={48} color={colors.gray[300]} />
      <Text
        style={{
          ...typography.lg,
          fontWeight: "600",
          color: colors.gray[500],
          marginTop: spacing[4],
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          ...typography.base,
          color: colors.gray[400],
          textAlign: "center",
          marginTop: spacing[2],
          marginBottom: actionLabel ? spacing[4] : 0,
        }}
      >
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="primary" />
      )}
    </Card>
  );
};

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  color?: "primary" | "success" | "warning" | "error";
  onPress?: () => void;
}

// Input Component
interface InputProps {
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
}

export const Input: React.FC<InputProps> = ({
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
        <Text
          style={{
            ...typography.sm,
            fontWeight: "600",
            color: colors.gray[700],
            marginBottom: spacing[1],
          }}
        >
          {label}
          {required && <Text style={{ color: colors.error[500] }}>*</Text>}
        </Text>
      )}
      <View
        style={{
          position: "relative",
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
        }}
      >
        {icon && (
          <FontAwesome
            name={icon}
            size={16}
            color={colors.gray[400]}
            style={{
              position: "absolute",
              left: spacing[3],
              top: multiline ? spacing[3] : "50%",
              marginTop: multiline ? 0 : -8,
              zIndex: 1,
            }}
          />
        )}
        <TextInput
          style={{
            flex: 1,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: error ? colors.error[300] : colors.gray[300],
            borderRadius: 8,
            paddingLeft: icon ? spacing[10] : spacing[4],
            paddingRight: spacing[4],
            paddingVertical: spacing[3],
            ...typography.base,
            color: colors.gray[900],
            minHeight: multiline ? numberOfLines * 20 + spacing[6] : undefined,
            textAlignVertical: multiline ? "top" : "center",
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[400]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
      </View>
      {error && (
        <Text
          style={{
            ...typography.sm,
            color: colors.error[600],
            marginTop: spacing[1],
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

// Modal Component
interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  rightElement?: React.ReactNode;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onClose,
  rightElement,
}) => {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          ...typography.xl,
          fontWeight: "700",
          color: colors.gray[900],
          flex: 1,
        }}
      >
        {title}
      </Text>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}
      >
        {rightElement}
        <TouchableOpacity onPress={onClose}>
          <FontAwesome name="times" size={24} color={colors.gray[600]} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Filter Chip Component
interface FilterChipProps {
  label: string;
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  selected: boolean;
  onPress: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  icon,
  selected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[2],
        borderRadius: 20,
        borderWidth: 1,
        borderColor: selected ? colors.primary[500] : colors.gray[300],
        backgroundColor: selected ? colors.primary[500] : colors.white,
        marginRight: spacing[2],
      }}
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
        style={{
          ...typography.sm,
          fontWeight: "600",
          color: selected ? colors.white : colors.gray[700],
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// Section Header Component
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  rightElement,
}) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing[4],
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...typography.lg,
            fontWeight: "700",
            color: colors.gray[900],
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              ...typography.sm,
              color: colors.gray[600],
              marginTop: spacing[1],
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement}
    </View>
  );
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = "primary",
  onPress,
}) => {
  const colorConfig = {
    primary: { bg: colors.primary[50], iconColor: colors.primary[500] },
    success: { bg: colors.success[50], iconColor: colors.success[500] },
    warning: { bg: colors.warning[50], iconColor: colors.warning[500] },
    error: { bg: colors.error[50], iconColor: colors.error[500] },
  };

  const config = colorConfig[color];

  const content = (
    <Card variant="elevated" padding={4}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 48,
            height: 48,
            backgroundColor: config.bg,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginRight: spacing[3],
          }}
        >
          <FontAwesome name={icon} size={24} color={config.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...typography.sm,
              color: colors.gray[600],
              marginBottom: spacing[1],
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              ...typography["2xl"],
              fontWeight: "700",
              color: colors.gray[900],
            }}
          >
            {value}
          </Text>
          {subtitle && (
            <Text
              style={{
                ...typography.xs,
                color: colors.gray[500],
                marginTop: spacing[1],
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }

  return content;
};

// Safe Screen Component
interface SafeScreenProps {
  children: React.ReactNode;
  backgroundColor?: string;
  style?: ViewStyle;
  edges?: ("top" | "bottom" | "left" | "right")[];
}

export const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  backgroundColor = colors.gray[50],
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
      <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor }, style]}>
        {children}
      </SafeAreaView>
    </>
  );
};

// Picker Component
interface PickerProps {
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  error?: string;
  placeholder?: string;
}

export const Picker: React.FC<PickerProps> = ({
  label,
  selectedValue,
  onValueChange,
  items,
  error,
  placeholder = "Select an option",
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const selectedItem = items.find((item) => item.value === selectedValue);

  return (
    <View>
      {label && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: colors.gray[700],
            marginBottom: spacing[2],
          }}
        >
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        style={{
          borderWidth: 1,
          borderColor: error ? colors.error[500] : colors.gray[300],
          borderRadius: 8,
          padding: spacing[3],
          backgroundColor: colors.white,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: selectedItem ? colors.gray[900] : colors.gray[500],
          }}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <FontAwesome name="chevron-down" size={14} color={colors.gray[400]} />
      </TouchableOpacity>

      {error && (
        <Text
          style={{
            fontSize: 12,
            color: colors.error[500],
            marginTop: spacing[1],
          }}
        >
          {error}
        </Text>
      )}

      {isVisible && (
        <View
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: colors.gray[200],
            borderRadius: 8,
            maxHeight: 200,
            zIndex: 1000,
            elevation: 5,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <ScrollView>
            {items.map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => {
                  onValueChange(item.value);
                  setIsVisible(false);
                }}
                style={{
                  padding: spacing[3],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.gray[100],
                  backgroundColor:
                    selectedValue === item.value
                      ? colors.primary[50]
                      : colors.white,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color:
                      selectedValue === item.value
                        ? colors.primary[600]
                        : colors.gray[900],
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};
