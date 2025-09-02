import React, { useState, useEffect } from "react";
import { Pressable, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";

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
    <HStack
      className="
        items-center bg-background-50 border border-outline-300
        rounded-lg px-4 min-h-[48px] shadow-sm
      "
      style={style}
    >
      <Ionicons
        name="search"
        size={18}
        color="rgb(var(--color-typography-400))"
        style={{ marginRight: 8 }}
      />
      <Input className="flex-1 border-0 bg-transparent">
        <InputField
          value={internal}
          onChangeText={setInternal}
          placeholder={placeholder}
          className="text-typography-900 text-base"
          returnKeyType="search"
          onSubmitEditing={() => onSubmitImmediate?.(internal)}
        />
      </Input>
      {internal.length > 0 && (
        <Pressable onPress={clear} className="p-2">
          <Ionicons
            name="close-circle"
            size={18}
            color="rgb(var(--color-typography-400))"
          />
        </Pressable>
      )}
    </HStack>
  );
};

export default SearchBar;
