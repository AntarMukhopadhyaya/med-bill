import React, { useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { InventoryItem, InventoryInsert } from "@/types/inventory";
import { colors } from "@/components/DesignSystem";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormInput,
  FormTextarea,
  FormButton,
  FormSection,
} from "@/components/FormComponents";
import { ScrollView } from "react-native";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useToast } from "@/lib/toast";

interface InventoryModalProps {
  visible: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryInsert) => Promise<void> | void;
  isLoading: boolean;
}

// Helper to coerce numeric input; Zod v4 removed some chained helpers, use refine
const coerceNumber = (field: string) =>
  z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === "number") return val;
      if (typeof val === "string" && val.trim() !== "") {
        const n = Number(val);
        return isNaN(n) ? NaN : n;
      }
      return NaN;
    })
    .refine((v) => !isNaN(v), `${field} must be a number`);

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z
    .string()
    .optional()
    .transform((v) => v || ""),
  quantity: coerceNumber("Quantity")
    .refine((v) => Number.isInteger(v), "Must be whole number")
    .refine((v) => v >= 0, "Cannot be negative"),
  price: coerceNumber("Price").refine((v) => v > 0, "Must be > 0"),
  gst: coerceNumber("GST").refine((v) => v >= 0 && v <= 100, "Invalid"),
  hsn: z
    .string()
    .optional()
    .transform((v) => v || ""),
});

type FormValues = z.infer<typeof schema>;

export const InventoryModal: React.FC<InventoryModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
  isLoading,
}) => {
  const toast = useToast();
  const methods = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: "",
      description: "",
      quantity: 0,
      price: 0,
      gst: 18,
      hsn: "",
    },
    mode: "onChange",
  });

  // Populate form when editing
  useEffect(() => {
    if (item) {
      methods.reset({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        price: item.price,
        gst: item.gst,
        hsn: item.hsn || "",
      });
    } else if (visible) {
      methods.reset({
        name: "",
        description: "",
        quantity: 0,
        price: 0,
        gst: 18,
        hsn: "",
      });
    }
  }, [item, visible]);

  const submit = async (values: FormValues): Promise<void> => {
    try {
      await onSave(values as InventoryInsert);
      toast.showSuccess("Saved", `Item ${values.name} saved.`);
      onClose();
    } catch (e: any) {
      toast.showError("Error", e?.message || "Failed to save");
    }
  };

  return (
    <Modal isOpen={visible} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-h-[90%] w-full">
        <ModalHeader>
          <HStack className="items-center justify-between w-full">
            <Text className="text-lg font-bold text-typography-900">
              {item ? "Edit Item" : "Add Item"}
            </Text>
            <Pressable
              onPress={onClose}
              className="p-1 rounded-full active:opacity-70"
            >
              <FontAwesome name="times" size={22} color={colors.gray[600]} />
            </Pressable>
          </HStack>
        </ModalHeader>
        <FormProvider {...methods}>
          <ModalBody className="px-4 py-4">
            <ScrollView
              className="max-h-[70vh]"
              keyboardShouldPersistTaps="handled"
            >
              <VStack className="gap-6">
                <FormSection>
                  <VStack className="gap-4">
                    <FormInput
                      name="name"
                      label="Item Name"
                      required
                      placeholder="Enter item name"
                    />
                    <FormTextarea
                      name="description"
                      label="Description"
                      placeholder="Enter item description"
                      height={120}
                    />
                    <HStack className="gap-4">
                      <FormInput
                        name="quantity"
                        label="Quantity"
                        required
                        placeholder="0"
                        keyboardType="numeric"
                      />
                      <FormInput
                        name="price"
                        label="Price (₹)"
                        required
                        placeholder="0.00"
                        keyboardType="numeric"
                      />
                    </HStack>
                    <HStack className="gap-4">
                      <FormInput
                        name="gst"
                        label="GST (%)"
                        placeholder="18"
                        keyboardType="numeric"
                      />
                      <FormInput
                        name="hsn"
                        label="HSN Code"
                        placeholder="HSN Code"
                      />
                    </HStack>
                  </VStack>
                </FormSection>
              </VStack>
            </ScrollView>
          </ModalBody>
          <ModalFooter className="px-4 pb-4 pt-2 border-t border-outline-200">
            <HStack className="justify-end gap-3 w-full">
              <FormButton
                title="Cancel"
                variant="outline"
                onPress={onClose}
                disabled={isLoading}
              />
              <FormButton
                title={isLoading ? "Saving..." : "Save Item"}
                onPress={methods.handleSubmit(submit as any)}
                loading={isLoading}
              />
            </HStack>
          </ModalFooter>
        </FormProvider>
      </ModalContent>
    </Modal>
  );
};

export default InventoryModal;
