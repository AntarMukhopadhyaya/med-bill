import React from "react";
import { View, ScrollView, ViewStyle } from "react-native";
import { SafeScreen, Header, spacing } from "@/components/DesignSystem";

interface PageProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  padded?: boolean; // apply default horizontal + vertical padding
}

export const Page: React.FC<PageProps> = ({
  title,
  subtitle,
  right,
  onBack,
  children,
  scroll = true,
  contentStyle,
  padded = true,
}) => {
  const Container = scroll ? ScrollView : View;
  const containerProps: any = scroll
    ? {
        contentContainerStyle: [
          padded && { padding: spacing[6], paddingBottom: spacing[8] },
          contentStyle,
        ],
        showsVerticalScrollIndicator: false,
        style: { flex: 1 },
      }
    : {
        style: [
          { flex: 1 },
          padded && { padding: spacing[6], paddingBottom: spacing[8] },
          contentStyle,
        ],
      };

  return (
    <SafeScreen>
      <Header
        title={title}
        subtitle={subtitle}
        rightElement={right}
        onBack={onBack}
      />
      <Container {...containerProps}>{children}</Container>
    </SafeScreen>
  );
};

export default Page;
