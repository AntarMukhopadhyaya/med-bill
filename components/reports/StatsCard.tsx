import React from "react";
import { MetricCard } from "./MetricCard";

type ColorVariant = "primary" | "success" | "warning" | "error";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: ColorVariant;
  subtitle?: string;
}

const colorClassMap: Record<ColorVariant, string> = {
  primary: "bg-primary-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  error: "bg-error-500",
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color = "primary",
  subtitle,
}) => {
  return (
    <MetricCard
      title={title}
      value={value}
      icon={icon}
      color={colorClassMap[color]}
      subtitle={subtitle}
    />
  );
};

export default StatsCard;
