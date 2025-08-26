import React, { useState, useEffect } from "react";
import { View, TextInput, Pressable, Text, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  shadows,
  typography,
} from "@/components/DesignSystem";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  onSubmitImmediate?: (raw: string) => void;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  onSubmitImmediate,
  style,
}) => {
  const [internal, setInternal] = useState(value);

  useEffect(() => setInternal(value), [value]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (internal !== value) onChange(internal);
    }, debounceMs);
    return () => clearTimeout(id);
  }, [internal]);

  const clear = () => {
    setInternal("");
    onChange("");
  };

  return (
    <View
      style={[
        {
          position: "relative",
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.gray[50],
          borderWidth: 1,
          borderColor: colors.gray[300],
          borderRadius: 10,
          paddingHorizontal: spacing[4],
          minHeight: 48,
        },
        shadows.sm,
        style,
      ]}
    >
      <Ionicons
        name="search"
        size={18}
        color={colors.gray[400]}
        style={{ marginRight: spacing[2] }}
      />
      <TextInput
        value={internal}
        onChangeText={setInternal}
        placeholder={placeholder}
        placeholderTextColor={colors.gray[400]}
        style={{ flex: 1, ...typography.base, color: colors.gray[900] }}
        returnKeyType="search"
        onSubmitEditing={() => onSubmitImmediate?.(internal)}
      />
      {internal.length > 0 && (
        <Pressable onPress={clear} style={{ padding: spacing[2] }}>
          <Ionicons name="close-circle" size={18} color={colors.gray[400]} />
        </Pressable>
      )}
    </View>
  );
};

export default SearchBar;
