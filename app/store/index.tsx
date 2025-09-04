import React, { useState } from "react";
import { ScrollView } from "react-native"; // ScrollView retained (no gluestack scroll wrapper)
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
// Gluestack UI primitives
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Box } from "@/components/ui/box";
import { useToastHelpers } from "@/lib/toast";
import ImagePickerComponent from "@/components/ImagePicker";
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StandardPage } from "@/components/layout";

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

  type StoreFormValues = z.infer<typeof StoreValidationSchema>;

  const formMethods = useForm<StoreFormValues>({
    resolver: zodResolver(StoreValidationSchema),
    defaultValues: {
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
    },
    mode: "onBlur",
  });

  const { handleSubmit, reset, setValue, watch } = formMethods;

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
      // Ensure all nullable fields become empty strings for form editing convenience
      reset({
        name: storeData.name ?? "",
        address: storeData.address ?? "",
        phone: storeData.phone ?? "",
        email: storeData.email ?? "",
        wesbite: storeData.wesbite ?? "",
        gst_number: storeData.gst_number ?? "",
        state: storeData.state ?? "West Bengal",
        bank_name: storeData.bank_name ?? "",
        bank_account_number: storeData.bank_account_number ?? "",
        bank_ifsc_code: storeData.bank_ifsc_code ?? "",
        logo_url: storeData.logo_url ?? "",
      });
    }
  }, [storeData, reset]);

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

  const onSubmit = (values: StoreFormValues) => {
    // Transform empty strings to null for nullable fields before persisting
    const payload = {
      ...values,
      address: values.address?.trim() === "" ? null : values.address?.trim(),
      phone: values.phone?.trim() === "" ? null : values.phone?.trim(),
      email: values.email?.trim() === "" ? null : values.email?.trim(),
      wesbite: values.wesbite?.trim() === "" ? null : values.wesbite?.trim(),
      gst_number:
        values.gst_number?.trim() === "" ? null : values.gst_number?.trim(),
      bank_name:
        values.bank_name?.trim() === "" ? null : values.bank_name?.trim(),
      bank_account_number:
        values.bank_account_number?.trim() === ""
          ? null
          : values.bank_account_number?.trim(),
      bank_ifsc_code:
        values.bank_ifsc_code?.trim() === ""
          ? null
          : values.bank_ifsc_code?.trim(),
      logo_url: values.logo_url?.trim() === "" ? null : values.logo_url?.trim(),
    } as Omit<StoreData, "id">;
    saveStoreMutation.mutate(payload);
  };

  const handleCancel = () => {
    if (storeData) {
      reset({
        name: storeData.name ?? "",
        address: storeData.address ?? "",
        phone: storeData.phone ?? "",
        email: storeData.email ?? "",
        wesbite: storeData.wesbite ?? "",
        gst_number: storeData.gst_number ?? "",
        state: storeData.state ?? "West Bengal",
        bank_name: storeData.bank_name ?? "",
        bank_account_number: storeData.bank_account_number ?? "",
        bank_ifsc_code: storeData.bank_ifsc_code ?? "",
        logo_url: storeData.logo_url ?? "",
      });
    } else {
      reset();
    }
    setIsEditing(false);
  };

  const logoUrl = watch("logo_url");

  return (
    <StandardPage>
      <FormProvider {...formMethods}>
        <VStack className="flex-1 bg-background">
          {/* Header */}
          <VStack className="bg-card px-6 py-4 border-b border-border">
            <HStack className="justify-between items-center">
              <HStack className="items-center flex-1">
                <Pressable
                  onPress={() => router.back()}
                  className="mr-4 p-2 rounded-md bg-muted-100 active:opacity-80"
                >
                  <FontAwesome
                    name="arrow-left"
                    size={18}
                    color="rgb(var(--color-typography-600))"
                  />
                </Pressable>
                <Text className="text-2xl font-bold text-typography-900">
                  Store Settings
                </Text>
              </HStack>
              {!isEditing ? (
                <Pressable
                  onPress={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg flex-row items-center bg-primary-500 data-[hover=true]:bg-primary-600"
                >
                  <FontAwesome
                    name="edit"
                    size={16}
                    color="rgb(var(--color-typography-0))"
                  />
                  <Text className="text-sm font-medium text-typography-0 ml-2">
                    Edit
                  </Text>
                </Pressable>
              ) : (
                <HStack className="gap-2">
                  <Pressable
                    onPress={handleCancel}
                    className="px-4 py-2 rounded-lg bg-muted-300"
                  >
                    <Text className="text-sm font-medium text-typography-800">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit(onSubmit)}
                    disabled={saveStoreMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-success-500 data-[hover=true]:bg-success-600 disabled:opacity-50"
                  >
                    <Text className="text-sm font-medium text-typography-0">
                      {saveStoreMutation.isPending ? "Saving..." : "Save"}
                    </Text>
                  </Pressable>
                </HStack>
              )}
            </HStack>
          </VStack>

          {/* Content */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <VStack className="bg-card rounded-lg p-8 items-center border border-border">
                <FontAwesome
                  name="spinner"
                  size={40}
                  color="rgb(var(--color-muted-400))"
                />
                <Text className="text-sm mt-4 font-medium text-typography-600">
                  Loading store details...
                </Text>
              </VStack>
            ) : (
              <>
                {/* Store Logo - Moved to top for better accessibility */}
                <FormSection
                  title="Store Branding"
                  description="Upload your store logo and visual identity"
                >
                  <VStack className="my-2">
                    <Text className="text-sm font-semibold text-typography-700 mb-3 text-center">
                      Store Logo
                    </Text>

                    <ImagePickerComponent
                      imageUrl={logoUrl || undefined}
                      onImageUploaded={(imageUrl) =>
                        setValue("logo_url", imageUrl, { shouldDirty: true })
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

                    {!isEditing && !logoUrl && (
                      <VStack className="bg-muted-100 p-3 rounded-lg mt-2">
                        <Text className="text-xs text-typography-600 text-center">
                          No logo uploaded. Click edit to add your store logo.
                        </Text>
                      </VStack>
                    )}
                  </VStack>
                </FormSection>

                {/* Basic Information */}
                <FormSection
                  title="Basic Information"
                  description="Core details about your store"
                >
                  <FormInput
                    name="name"
                    label="Store Name"
                    required
                    placeholder="Enter store name"
                    disabled={!isEditing}
                  />
                  <FormInput
                    name="address"
                    label="Address"
                    placeholder="Enter store address"
                    multiline
                    numberOfLines={3}
                    disabled={!isEditing}
                  />
                  <FormInput
                    name="state"
                    label="State"
                    required
                    placeholder="Enter state"
                    disabled={!isEditing}
                  />
                </FormSection>

                {/* Contact Information */}
                <FormSection
                  title="Contact Information"
                  description="How customers can reach you"
                >
                  <FormInput
                    name="phone"
                    label="Phone Number"
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    disabled={!isEditing}
                  />
                  <FormInput
                    name="email"
                    label="Email"
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    disabled={!isEditing}
                  />
                  <FormInput
                    name="wesbite"
                    label="Website"
                    placeholder="Enter website URL"
                    disabled={!isEditing}
                  />
                </FormSection>

                {/* Tax Information */}
                <FormSection
                  title="Tax Information"
                  description="GST and tax related details"
                >
                  <FormInput
                    name="gst_number"
                    label="GST Number"
                    placeholder="Enter GST number"
                    disabled={!isEditing}
                  />
                </FormSection>

                {/* Banking Information */}
                <FormSection
                  title="Banking Information"
                  description="Bank account details for payments"
                >
                  <FormInput
                    name="bank_name"
                    label="Bank Name"
                    placeholder="Enter bank name"
                    disabled={!isEditing}
                  />
                  <FormInput
                    name="bank_account_number"
                    label="Account Number"
                    placeholder="Enter account number"
                    keyboardType="numeric"
                    disabled={!isEditing}
                  />
                  <FormInput
                    name="bank_ifsc_code"
                    label="IFSC Code"
                    placeholder="Enter IFSC code"
                    disabled={!isEditing}
                  />
                </FormSection>

                {/* Branding */}
                <FormSection
                  title="Branding"
                  description="Logo and visual identity"
                >
                  <VStack className="my-2">
                    <Text className="text-sm font-semibold text-typography-700 mb-3 text-center">
                      Store Logo
                    </Text>
                  </VStack>
                </FormSection>

                {/* Save Button for mobile */}
                {isEditing && (
                  <HStack className="mt-6" style={{ gap: 8 }}>
                    <Box className="flex-1 mr-2">
                      <FormButton
                        title="Cancel"
                        onPress={handleCancel}
                        variant="outline"
                        fullWidth
                      />
                    </Box>
                    <Box className="flex-[2]">
                      <FormButton
                        title="Save Changes"
                        onPress={handleSubmit(onSubmit)}
                        loading={saveStoreMutation.isPending}
                        disabled={saveStoreMutation.isPending}
                        fullWidth
                      />
                    </Box>
                  </HStack>
                )}

                {/* Info Message */}
                {!storeData && (
                  <VStack className="bg-muted-100 p-4 rounded-lg mt-6 border border-border">
                    <HStack className="items-center">
                      <FontAwesome
                        name="info-circle"
                        size={16}
                        color="rgb(var(--color-primary-500))"
                      />
                      <Text className="font-medium ml-2 text-typography-800">
                        Store Setup Required
                      </Text>
                    </HStack>
                    <Text className="text-sm mt-2 text-typography-600 leading-5">
                      Please configure your store details. This information will
                      be used on invoices and business documents.
                    </Text>
                  </VStack>
                )}
              </>
            )}
          </ScrollView>
        </VStack>
      </FormProvider>
    </StandardPage>
  );
}
