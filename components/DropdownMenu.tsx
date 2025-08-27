import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { MenuItem } from "@/types/orders";
import { colors, spacing } from "@/components/DesignSystem";

interface DropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  visible,
  onClose,
  menuItems,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "flex-start",
          alignItems: "flex-end",
        }}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View
          style={{
            width: 200,
            backgroundColor: colors.white,
            borderRadius: 8,
            marginTop: 60,
            marginRight: 10,
            paddingVertical: spacing[2],
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                paddingVertical: spacing[2],
                paddingHorizontal: spacing[4],
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
              }}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <FontAwesome
                name={item.icon}
                size={16}
                color={item.color || colors.gray[700]}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: item.color || colors.gray[900],
                  fontWeight: "500",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
