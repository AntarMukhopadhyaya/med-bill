import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, Text, Alert } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  FormInput,
  FormButton,
  FormSection,
} from "@/components/FormComponents";
import { SafeScreen, spacing } from "@/components/DesignSystem";
import { useToastHelpers } from "@/lib/toast";
import ImagePickerComponent from "@/components/ImagePicker";
import { z } from "zod";

// Validation schema for store data
const StoreValidationSchema = z.object({
  name: z
    .string()
    .min(1, "Store name is required")
    .max(100, "Store name must be less than 100 characters"),
  address: z
    .string()
    .max(500, "Address must be less than 500 characters")
    .nullable(),
  phone: z
    .string()
    .regex(/^[\+]?[0-9\-\(\)\s]*$/, "Invalid phone number format")
    .max(20, "Phone number must be less than 20 characters")
    .nullable(),
  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email must be less than 100 characters")
    .nullable()
    .or(z.literal("")),
  wesbite: z
    .string()
    .url("Invalid website URL")
    .max(200, "Website URL must be less than 200 characters")
    .nullable()
    .or(z.literal("")),
  gst_number: z
    .string()
    .max(15, "GST number must be less than 15 characters")
    .nullable(),
  state: z
    .string()
    .min(1, "State is required")
    .max(50, "State must be less than 50 characters"),
  bank_name: z
    .string()
    .max(100, "Bank name must be less than 100 characters")
    .nullable(),
  bank_account_number: z
    .string()
    .max(30, "Account number must be less than 30 characters")
    .nullable(),
  bank_ifsc_code: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
    .nullable()
    .or(z.literal("")),
  logo_url: z.string().url("Invalid logo URL").nullable().or(z.literal("")),
});

interface StoreData {
  id?: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  wesbite: string | null; // Note: keeping the typo from schema
  gst_number: string | null;
  state: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  logo_url: string | null;
}

export default function StoreManagement() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastHelpers();
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<StoreData>({
    name: "",
    address: "",
    phone: "",
    email: "",
    wesbite: "",
    gst_number: "",
    state: "West Bengal",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    logo_url: "",
  });

  // Fetch store data
  const { data: storeData, isLoading } = useQuery({
    queryKey: ["store"],
    queryFn: async (): Promise<StoreData | null> => {
      const { data, error } = await supabase.from("store").select("*").single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }
      return data || null;
    },
  });

  // Update form data when store data changes
  React.useEffect(() => {
    if (storeData) {
      setFormData(storeData);
    }
  }, [storeData]);

  // Create or update store mutation
  const saveStoreMutation = useMutation({
    mutationFn: async (data: Omit<StoreData, "id">) => {
      const client = supabase as any; // Bypass type checking for now

      if (storeData?.id) {
        // Update existing store
        const { data: updated, error } = await client
          .from("store")
          .update(data)
          .eq("id", storeData.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Create new store
        const { data: created, error } = await client
          .from("store")
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store"] });
      setIsEditing(false);
      showSuccess(
        "Store Updated",
        "Store details have been saved successfully"
      );
    },
    onError: (error: any) => {
      showError("Error", error.message || "Failed to save store details");
    },
  });

  const handleSave = () => {
    try {
      // Validate form data using Zod
      const validatedData = StoreValidationSchema.parse({
        ...formData,
        // Convert empty strings to null for optional fields
        address: formData.address?.trim() || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        wesbite: formData.wesbite?.trim() || null,
        gst_number: formData.gst_number?.trim() || null,
        bank_name: formData.bank_name?.trim() || null,
        bank_account_number: formData.bank_account_number?.trim() || null,
        bank_ifsc_code: formData.bank_ifsc_code?.trim() || null,
        logo_url: formData.logo_url?.trim() || null,
      });

      saveStoreMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Show the first validation error
        const firstError = error.issues[0];
        showError("Validation Error", firstError.message);
      } else {
        showError("Error", "Failed to validate store data");
      }
    }
  };

  const handleCancel = () => {
    if (storeData) {
      setFormData(storeData);
    }
    setIsEditing(false);
  };

  const updateFormData = (field: keyof StoreData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SafeScreen>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => router.back()} className="mr-4">
                <FontAwesome name="arrow-left" size={20} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-gray-900">
                Store Settings
              </Text>
            </View>

            {!isEditing ? (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
              >
                <FontAwesome name="edit" size={16} color="white" />
                <Text className="text-white font-medium ml-2">Edit</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-row">
                <TouchableOpacity
                  onPress={handleCancel}
                  className="bg-gray-500 px-4 py-2 rounded-lg mr-2"
                >
                  <Text className="text-white font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="bg-green-500 px-4 py-2 rounded-lg"
                  disabled={saveStoreMutation.isPending}
                >
                  <Text className="text-white font-medium">
                    {saveStoreMutation.isPending ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: spacing[6],
            paddingBottom: spacing[8],
          }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View className="bg-white rounded-lg p-8 items-center">
              <FontAwesome name="spinner" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 mt-4 text-lg font-medium">
                Loading store details...
              </Text>
            </View>
          ) : (
            <>
              {/* Store Logo - Moved to top for better accessibility */}
              <FormSection
                title="Store Branding"
                description="Upload your store logo and visual identity"
              >
                <View style={{ marginVertical: spacing[2] }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: spacing[3],
                      textAlign: "center",
                    }}
                  >
                    Store Logo
                  </Text>

                  <ImagePickerComponent
                    imageUrl={formData.logo_url}
                    onImageUploaded={(imageUrl) =>
                      updateFormData("logo_url", imageUrl)
                    }
                    bucket="store-logos"
                    folder="logos"
                    size={140}
                    variant="circle"
                    description="Upload your store logo. This will appear on invoices and business documents. Recommended size: 500x500px"
                    disabled={!isEditing}
                    isLoading={saveStoreMutation.isPending}
                    maxSizeBytes={3 * 1024 * 1024} // 3MB limit for logos
                    allowedTypes={["image/jpeg", "image/png", "image/webp"]}
                  />

                  {!isEditing && !formData.logo_url && (
                    <View
                      style={{
                        backgroundColor: "#F3F4F6",
                        padding: spacing[3],
                        borderRadius: 8,
                        marginTop: spacing[2],
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                          textAlign: "center",
                        }}
                      >
                        No logo uploaded. Click edit to add your store logo.
                      </Text>
                    </View>
                  )}
                </View>
              </FormSection>

              {/* Basic Information */}
              <FormSection
                title="Basic Information"
                description="Core details about your store"
              >
                <FormInput
                  label="Store Name *"
                  value={formData.name}
                  onChangeText={(value) => updateFormData("name", value)}
                  placeholder="Enter store name"
                  editable={isEditing}
                />

                <FormInput
                  label="Address"
                  value={formData.address || ""}
                  onChangeText={(value) => updateFormData("address", value)}
                  placeholder="Enter store address"
                  multiline
                  numberOfLines={3}
                  editable={isEditing}
                />

                <FormInput
                  label="State"
                  value={formData.state}
                  onChangeText={(value) => updateFormData("state", value)}
                  placeholder="Enter state"
                  editable={isEditing}
                />
              </FormSection>

              {/* Contact Information */}
              <FormSection
                title="Contact Information"
                description="How customers can reach you"
              >
                <FormInput
                  label="Phone Number"
                  value={formData.phone || ""}
                  onChangeText={(value) => updateFormData("phone", value)}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  editable={isEditing}
                />

                <FormInput
                  label="Email"
                  value={formData.email || ""}
                  onChangeText={(value) => updateFormData("email", value)}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  editable={isEditing}
                />

                <FormInput
                  label="Website"
                  value={formData.wesbite || ""}
                  onChangeText={(value) => updateFormData("wesbite", value)}
                  placeholder="Enter website URL"
                  editable={isEditing}
                />
              </FormSection>

              {/* Tax Information */}
              <FormSection
                title="Tax Information"
                description="GST and tax related details"
              >
                <FormInput
                  label="GST Number"
                  value={formData.gst_number || ""}
                  onChangeText={(value) => updateFormData("gst_number", value)}
                  placeholder="Enter GST number"
                  editable={isEditing}
                />
              </FormSection>

              {/* Banking Information */}
              <FormSection
                title="Banking Information"
                description="Bank account details for payments"
              >
                <FormInput
                  label="Bank Name"
                  value={formData.bank_name || ""}
                  onChangeText={(value) => updateFormData("bank_name", value)}
                  placeholder="Enter bank name"
                  editable={isEditing}
                />

                <FormInput
                  label="Account Number"
                  value={formData.bank_account_number || ""}
                  onChangeText={(value) =>
                    updateFormData("bank_account_number", value)
                  }
                  placeholder="Enter account number"
                  keyboardType="numeric"
                  editable={isEditing}
                />

                <FormInput
                  label="IFSC Code"
                  value={formData.bank_ifsc_code || ""}
                  onChangeText={(value) =>
                    updateFormData("bank_ifsc_code", value)
                  }
                  placeholder="Enter IFSC code"
                  editable={isEditing}
                />
              </FormSection>

              {/* Branding */}
              <FormSection
                title="Branding"
                description="Logo and visual identity"
              >
                <View style={{ marginVertical: spacing[2] }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: spacing[3],
                      textAlign: "center",
                    }}
                  >
                    Store Logo
                  </Text>

                  <ImagePickerComponent
                    imageUrl={formData.logo_url}
                    onImageUploaded={(imageUrl) =>
                      updateFormData("logo_url", imageUrl)
                    }
                    bucket="store-logos"
                    folder="logos"
                    size={140}
                    variant="circle"
                    description="Upload your store logo. This will appear on invoices and business documents. Recommended size: 500x500px"
                    disabled={!isEditing}
                    isLoading={saveStoreMutation.isPending}
                    maxSizeBytes={3 * 1024 * 1024} // 3MB limit for logos
                    allowedTypes={["image/jpeg", "image/png", "image/webp"]}
                  />

                  {!isEditing && !formData.logo_url && (
                    <View
                      style={{
                        backgroundColor: "#F3F4F6",
                        padding: spacing[3],
                        borderRadius: 8,
                        marginTop: spacing[2],
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                          textAlign: "center",
                        }}
                      >
                        No logo uploaded. Click edit to add your store logo.
                      </Text>
                    </View>
                  )}
                </View>
              </FormSection>

              {/* Save Button for mobile */}
              {isEditing && (
                <View className="flex-row mt-6">
                  <FormButton
                    title="Cancel"
                    onPress={handleCancel}
                    variant="outline"
                    style={{ flex: 1, marginRight: spacing[2] }}
                  />
                  <FormButton
                    title="Save Changes"
                    onPress={handleSave}
                    loading={saveStoreMutation.isPending}
                    disabled={saveStoreMutation.isPending}
                    style={{ flex: 2 }}
                  />
                </View>
              )}

              {/* Info Message */}
              {!storeData && (
                <View className="bg-blue-50 p-4 rounded-lg mt-6">
                  <View className="flex-row items-center">
                    <FontAwesome name="info-circle" size={16} color="#3B82F6" />
                    <Text className="text-blue-800 font-medium ml-2">
                      Store Setup Required
                    </Text>
                  </View>
                  <Text className="text-blue-700 mt-2">
                    Please configure your store details. This information will
                    be used on invoices and business documents.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
