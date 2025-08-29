import { PaymentWithCustomer } from "@/types/payment";
import { Text, TouchableOpacity, View } from "react-native";
import { Card, colors, spacing } from "../DesignSystem";
import { FontAwesome } from "@expo/vector-icons";

interface PaymentCardProps {
  payment: PaymentWithCustomer;
  onViewDetails: (payment: PaymentWithCustomer) => void;
}
export const PaymentCard: React.FC<PaymentCardProps> = ({
  payment,
  onViewDetails,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return "money";
      case "bank_transfer":
        return "bank";
      case "credit_card":
        return "credit-card";
      case "debit_card":
        return "credit-card";
      case "upi":
        return "mobile";
      case "cheque":
        return "file-text-o";
      default:
        return "money";
    }
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "cash":
        return "Cash";
      case "bank_transfer":
        return "Bank Transfer";
      case "credit_card":
        return "Credit Card";
      case "debit_card":
        return "Debit Card";
      case "upi":
        return "UPI";
      case "cheque":
        return "Cheque";
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };
  const customerName = payment.customers?.name || "Unknown Customer";
  const companyName = payment.customers?.company_name;
  return (
    <TouchableOpacity onPress={() => onViewDetails(payment)}>
      <Card variant="elevated" padding={4}>
        <View style={{ gap: spacing[3] }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                  marginBottom: 4,
                }}
                numberOfLines={1}
              >
                {customerName}
              </Text>
              {companyName && (
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.gray[600],
                    marginBottom: 2,
                  }}
                  numberOfLines={1}
                >
                  {companyName}
                </Text>
              )}
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[500],
                }}
              >
                {formatDate(payment.payment_date)}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.success[600],
              }}
            >
              ₹{payment.amount.toLocaleString()}
            </Text>
          </View>

          {/* Payment Details */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome
                name={getPaymentMethodIcon(payment.payment_method)}
                size={14}
                color={colors.gray[500]}
                style={{ marginRight: spacing[2] }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: colors.gray[600],
                }}
              >
                {formatPaymentMethod(payment.payment_method)}
              </Text>
              {payment.reference_number && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[500],
                    marginLeft: spacing[3],
                  }}
                  numberOfLines={1}
                >
                  Ref: {payment.reference_number}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: colors.gray[100],
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[1],
                borderRadius: 6,
              }}
              onPress={() => onViewDetails(payment)}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[700],
                  fontWeight: "500",
                }}
              >
                View
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          {payment.notes && (
            <View
              style={{
                paddingTop: spacing[3],
                borderTopWidth: 1,
                borderTopColor: colors.gray[100],
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.gray[600],
                  fontStyle: "italic",
                }}
                numberOfLines={2}
              >
                {payment.notes}
              </Text>
            </View>
          )}

          {/* Allocations (if any) */}
          {payment.payment_allocations &&
            payment.payment_allocations.length > 0 && (
              <View
                style={{
                  paddingTop: spacing[3],
                  borderTopWidth: 1,
                  borderTopColor: colors.gray[100],
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[600],
                    fontWeight: "500",
                  }}
                >
                  Allocated to {payment.payment_allocations.length} invoice(s)
                </Text>
              </View>
            )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};
