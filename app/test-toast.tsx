import React from "react";
import { View } from "react-native";
import { Button, ButtonText } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { StandardPage } from "@/components/layout/StandardPage";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { VStack } from "@/components/ui/vstack";
import { router } from "expo-router";

export default function TestToastPage() {
  const toast = useToast();

  return (
    <StandardPage>
      <StandardHeader
        title="Toast Test"
        subtitle="Test the improved toast notifications"
        showBackButton
      />

      <VStack space="lg" className="p-4">
        <Button
          onPress={() =>
            toast.showSuccess(
              "Success!",
              "This is a success message with proper safe area insets."
            )
          }
          action="positive"
        >
          <ButtonText>Show Success Toast</ButtonText>
        </Button>

        <Button
          onPress={() =>
            toast.showError(
              "Error!",
              "This is an error message with proper styling and icons."
            )
          }
          action="negative"
        >
          <ButtonText>Show Error Toast</ButtonText>
        </Button>

        <Button
          onPress={() =>
            toast.showWarning(
              "Warning!",
              "This is a warning message with improved placement."
            )
          }
          action="secondary"
        >
          <ButtonText>Show Warning Toast</ButtonText>
        </Button>

        <Button
          onPress={() =>
            toast.showInfo(
              "Info",
              "This is an info message with gluestack-ui components."
            )
          }
          action="secondary"
          variant="outline"
        >
          <ButtonText>Show Info Toast</ButtonText>
        </Button>

        <Button
          onPress={() =>
            toast.showToast(
              "success",
              "Custom Toast",
              "You can also use the generic showToast method."
            )
          }
        >
          <ButtonText>Show Custom Toast</ButtonText>
        </Button>
      </VStack>
    </StandardPage>
  );
}
