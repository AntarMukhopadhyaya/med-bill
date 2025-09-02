import { tva } from "@gluestack-ui/utils/nativewind-utils";

export const badgeStyle = tva({
  base: "flex flex-row items-center self-start font-semibold",
  variants: {
    size: {
      sm: "px-2 py-0.5 rounded-full text-[10px] leading-4",
      md: "px-3 py-1 rounded-full text-xs leading-4",
    },
    variant: {
      primary: "bg-primary-100 text-primary-700",
      secondary: "bg-outline-100 text-typography-700",
      success: "bg-success-100 text-success-700",
      warning: "bg-warning-100 text-warning-600",
      error: "bg-error-100 text-error-600",
    },
  },
  defaultVariants: {
    size: "sm",
    variant: "primary",
  },
});
