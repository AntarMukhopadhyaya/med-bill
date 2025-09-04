import React, { useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, CustomerFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast";
import { StandardPage } from "@/components/layout/StandardPage";
import { StandardHeader } from "@/components/layout/StandardHeader";
import {
  FormInput,
  FormSection,
  FormButton,
} from "@/components/FormComponents";
import { VStack } from "@/components/ui/vstack";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Text } from "@/components/ui/text";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

export default function EditCustomerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

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

  const { handleSubmit, reset } = methods;

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async (): Promise<Customer | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        company_name: customer.company_name || "",
        gstin: customer.gstin || "",
        billing_address: customer.billing_address || "",
        shipping_address: customer.shipping_address || "",
        country: customer.country || "",
      });
    }
  }, [customer, reset]);

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!id) throw new Error("No customer ID");
      const payload: Database["public"]["Tables"]["customers"]["Update"] = {
        ...data,
        updated_at: new Date().toISOString(),
      };
      // Temporary any-cast due to type generation issue where update expects never
      const { error } = await (supabase as any)
        .from("customers")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customer-details", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.showSuccess("Customer Updated", "Changes saved successfully");
      router.back();
    },
    onError: (error: any) => {
      toast.showError(
        "Update Failed",
        error.message || "Could not update customer"
      );
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    // Fallback: if shipping empty use billing
    if (!data.shipping_address && data.billing_address) {
      data.shipping_address = data.billing_address;
    }
    updateCustomerMutation.mutate(data);
  };

  // Loading / Not found states
  if (isLoading) {
    return (
      <StandardPage>
        <StandardHeader title="Edit Customer" showBackButton />
        <Text className="text-typography-600">Loading customer...</Text>
      </StandardPage>
    );
  }

  if (!customer) {
    return (
      <StandardPage>
        <StandardHeader title="Customer Not Found" showBackButton />
        <Text className="text-typography-600">
          The customer you're trying to edit doesn't exist.
        </Text>
      </StandardPage>
    );
  }

  return (
    <StandardPage>
      <StandardHeader
        title="Edit Customer"
        subtitle={customer.name}
        showBackButton
        rightElement={
          <Button
            onPress={handleSubmit(onSubmit)}
            isDisabled={updateCustomerMutation.isPending}
            size="sm"
          >
            <ButtonText>
              {updateCustomerMutation.isPending ? "Saving..." : "Save"}
            </ButtonText>
          </Button>
        }
      />
      <FormProvider {...methods}>
        <VStack space="xl" className="pb-8">
          <FormSection
            title="Basic Information"
            description="Core identity details for the customer."
          >
            <FormInput
              name="name"
              label="Customer Name"
              required
              placeholder="Enter customer name"
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
              required
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            <FormInput
              name="country"
              label="Country"
              placeholder="Enter country"
            />
          </FormSection>

          <FormSection
            title="Company Information"
            description="Company level details for invoices & records."
          >
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
          </FormSection>

          <FormSection
            title="Address Information"
            description="Billing address is used on invoices; shipping can mirror billing."
          >
            <FormInput
              name="billing_address"
              label="Billing Address"
              placeholder="Enter billing address"
              multiline
              numberOfLines={3}
            />
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                const billing = methods.getValues("billing_address");
                methods.setValue("shipping_address", billing || "");
                toast.showInfo("Copied", "Billing address copied to shipping");
              }}
              className="self-start"
              isDisabled={updateCustomerMutation.isPending}
            >
              <ButtonText>Copy to Shipping</ButtonText>
            </Button>
            <FormInput
              name="shipping_address"
              label="Shipping Address"
              placeholder="Enter shipping address (leave empty to use billing)"
              multiline
              numberOfLines={3}
            />
          </FormSection>

          <Divider />
          <VStack space="md">
            <Button
              onPress={handleSubmit(onSubmit)}
              isDisabled={updateCustomerMutation.isPending}
            >
              <ButtonText>
                {updateCustomerMutation.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </ButtonText>
            </Button>
            <Button
              variant="outline"
              onPress={() => router.back()}
              isDisabled={updateCustomerMutation.isPending}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </FormProvider>
    </StandardPage>
  );
}
