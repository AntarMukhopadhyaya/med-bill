import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { MenuItem } from "@/types/orders";

const MENU_BG = "#ffffff";
const MENU_TEXT = "#111827"; // gray-900
const MENU_TEXT_MUTED = "#4b5563"; // gray-700
const MENU_BORDER = "rgba(0,0,0,0.1)";
const SPACING_2 = 8;
const SPACING_3 = 12;
const SPACING_4 = 16;

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
            backgroundColor: MENU_BG,
            borderRadius: 8,
            marginTop: 60,
            marginRight: 10,
            paddingVertical: SPACING_2,
            shadowColor: "#000",
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
                paddingVertical: SPACING_2,
                paddingHorizontal: SPACING_4,
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING_3,
              }}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <FontAwesome
                name={item.icon}
                size={16}
                color={item.color || MENU_TEXT_MUTED}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: item.color || MENU_TEXT,
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
