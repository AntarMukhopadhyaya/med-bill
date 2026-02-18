import React from "react";
import { View, ScrollView, ViewStyle } from "react-native";
import { StandardPage } from "@/components/layout";

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
          padded && { paddingHorizontal: 24, paddingBottom: 32 },
          contentStyle,
        ],
        showsVerticalScrollIndicator: false,
        style: { flex: 1 },
      }
    : {
        style: [
          { flex: 1 },
          padded && { paddingHorizontal: 24, paddingBottom: 32 },
          contentStyle,
        ],
      };

  return (
    <StandardPage
      title={title}
      subtitle={subtitle}
      right={right}
      onBack={onBack}
    >
      <Container {...containerProps}>{children}</Container>
    </StandardPage>
  );
};

export default Page;
