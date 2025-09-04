import React from "react";
import { View, ScrollView } from "react-native";
import { router } from "expo-router";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormInput,
  FormButton,
  FormTextarea,
} from "../../components/FormComponents";
import { customerSchema, CustomerFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StandardPage } from "@/components/layout/StandardPage";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";

const CreateCustomerScreen = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  // React Hook Form setup
  const methods = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company_name: "",
      gstin: "",
      billing_address: "",
      shipping_address: "",
      country: "",
    },
  });

  const { handleSubmit, setValue, watch } = methods;
  const watchedValues = watch();

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const { data: customer, error } = await supabase
        .from("customers")
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.showSuccess(
        "Customer Created",
        "Customer has been successfully created"
      );
      router.replace(`/customers/${data.id}` as any);
    },
    onError: (error: any) => {
      toast.showError("Error", error.message || "Failed to create customer");
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  const copyBillingToShipping = () => {
    setValue("shipping_address", watchedValues.billing_address || "");
  };

  return (
    <StandardPage>
      <StandardHeader
        title="Create Customer"
        subtitle="Add a new customer to your records"
        showBackButton
      />

      <FormProvider {...methods}>
        <ScrollView className="flex-1 p-4">
          <VStack space="xl">
            {/* Basic Information */}
            <VStack space="md">
              <Text className="text-lg font-semibold text-typography-900">
                Basic Information
              </Text>
              <Text className="text-sm text-typography-600 mb-4">
                Core identity details for the customer. Phone number is required
                for contact.
              </Text>

              <FormInput
                name="name"
                label="Customer Name"
                placeholder="Enter customer name"
                required
              />

              <FormInput
                name="email"
                label="Email"
                placeholder="customer@example.com"
                keyboardType="email-address"
              />

              <FormInput
                name="phone"
                label="Phone Number"
                placeholder="+91 XXXXX XXXXX"
                keyboardType="phone-pad"
                required
              />
            </VStack>

            <Divider />

            {/* Company Information */}
            <VStack space="md">
              <Text className="text-lg font-semibold text-typography-900">
                Company Information
              </Text>
              <Text className="text-sm text-typography-600 mb-4">
                Optional company-level data used on invoices and business
                reports.
              </Text>

              <FormInput
                name="company_name"
                label="Company Name"
                placeholder="Enter company name"
              />

              <FormInput
                name="gstin"
                label="GSTIN"
                placeholder="GST Identification Number"
              />

              <FormInput
                name="country"
                label="Country"
                placeholder="Enter country"
              />
            </VStack>

            <Divider />

            {/* Address Information */}
            <VStack space="md">
              <Text className="text-lg font-semibold text-typography-900">
                Address Information
              </Text>
              <Text className="text-sm text-typography-600 mb-4">
                Billing address is used for invoices. Copy it if shipping is
                identical.
              </Text>

              <FormTextarea
                name="billing_address"
                label="Billing Address"
                placeholder="Enter billing address"
              />

              <Button
                onPress={copyBillingToShipping}
                variant="outline"
                size="sm"
                className="self-start"
              >
                <ButtonText>Copy to Shipping</ButtonText>
              </Button>

              <FormTextarea
                name="shipping_address"
                label="Shipping Address"
                placeholder="Enter shipping address"
              />
            </VStack>

            {/* Submit Button */}
            <Button
              onPress={handleSubmit(onSubmit)}
              disabled={createCustomerMutation.isPending}
              className="mt-6"
            >
              {createCustomerMutation.isPending ? (
                <ButtonSpinner className="mr-2" />
              ) : (
                <ButtonText>Create Customer</ButtonText>
              )}
            </Button>
          </VStack>
        </ScrollView>
      </FormProvider>
    </StandardPage>
  );
};

export default CreateCustomerScreen;
