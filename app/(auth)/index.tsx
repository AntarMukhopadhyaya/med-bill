import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBar } from "expo-status-bar";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { FormInput, FormSection } from "@/components/FormComponents";
import { Box } from "@/components/ui/box";
import { useToast } from "@/lib/toast";

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignIn() {
  const { signIn, user } = useAuth();
  const toast = useToast();
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  React.useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user]);

  const onSubmit = async (values: SignInValues) => {
    const { error } = await signIn(values.email, values.password);
    if (error) {
      toast.showError(error.message || "Failed to sign in");
    } else {
      toast.showSuccess("Signed in successfully");
      router.replace("/(tabs)");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <FormProvider {...form}>
          <VStack className="flex-1 justify-center px-6 py-12 gap-8">
            {/* Logo/Header */}
            <VStack className="items-center gap-3">
              <Box className="w-20 h-20 rounded-full overflow-hidden items-center justify-center bg-primary-600">
                <Image
                  source={require("@/assets/images/adaptive-icon.png")}
                  size="md"
                  className="w-16 h-16"
                  resizeMode="contain"
                  alt="Yava Accessesories"
                />
              </Box>
              <Text className="text-3xl font-bold text-typography-900">
                Welcome Back
              </Text>
              <Text className="text-sm text-typography-600 text-center">
                Sign in to your medical billing account
              </Text>
            </VStack>

            {/* Sign In Form */}
            <FormSection>
              <VStack className="gap-4">
                <FormInput
                  name="email"
                  label="Email"
                  placeholder="you@example.com"
                  required
                  rules={{}}
                />
                <FormInput
                  name="password"
                  label="Password"
                  placeholder="••••••••"
                  required
                  secureTextEntry
                  rules={{}}
                />
                <Button
                  variant="solid"
                  size="md"
                  onPress={handleSubmit(onSubmit)}
                  isDisabled={isSubmitting}
                >
                  {isSubmitting && <ButtonSpinner className="mr-2" />}
                  <ButtonText>
                    {isSubmitting ? "Signing In..." : "Sign In"}
                  </ButtonText>
                </Button>
              </VStack>
            </FormSection>

            <VStack className="items-center gap-4">
              <Button variant="link" size="md">
                <ButtonText>Forgot Password?</ButtonText>
              </Button>
              <HStack className="items-center">
                <Text className="text-sm text-typography-600 mr-1">
                  Don't have an account?
                </Text>
                <Link href="/(auth)/sign-up" asChild>
                  <Button variant="link" size="md">
                    <ButtonText className="font-semibold">Sign Up</ButtonText>
                  </Button>
                </Link>
              </HStack>
            </VStack>
          </VStack>
        </FormProvider>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
