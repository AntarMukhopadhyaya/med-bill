import { Database } from "@/types/database.types";
import { FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Text, TouchableOpacity, View } from "react-native";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface CustomerCardProps {
  customer: Customer;
  onDelete: (customer: Customer) => void;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onDelete }) => {
  return (
    <View className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mx-4">
      <TouchableOpacity
        onPress={() => {
          router.push(`/customers/${customer.id}` as any);
        }}
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Text className="text-lg font-semibold text-gray-900 flex-1">
                {customer.name}
              </Text>
            </View>

            {customer.company_name && (
              <Text className="text-sm text-gray-600 mb-1">
                {customer.company_name}
              </Text>
            )}

            <View className="flex-row items-center mb-2">
              <FontAwesome name="phone" size={12} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-2">
                {customer.phone}
              </Text>
            </View>

            {customer.email && (
              <View className="flex-row items-center mb-2">
                <FontAwesome name="envelope" size={12} color="#6B7280" />
                <Text className="text-sm text-gray-600 ml-2">
                  {customer.email}
                </Text>
              </View>
            )}

            {customer.gstin && (
              <View className="flex-row items-center mb-2">
                <FontAwesome name="id-card" size={12} color="#6B7280" />
                <Text className="text-sm text-gray-600 ml-2">
                  GSTIN: {customer.gstin}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
      <View className="flex-row justify-end space-x-2 pt-3 border-t border-gray-100">
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${customer.phone}`)}
          className="bg-green-50 p-2 rounded-lg"
        >
          <FontAwesome name="phone" size={16} color="#059669" />
        </TouchableOpacity>
        {customer.email && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${customer.email}`)}
            className="bg-blue-50 p-2 rounded-lg"
          >
            <FontAwesome name="envelope" size={16} color="#3B82F6" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => router.push(`/customers/${customer.id}/edit`)}
          className="bg-gray-50 p-2 rounded-lg"
        >
          <FontAwesome name="edit" size={16} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(customer)}
          className="bg-red-50 p-2 rounded-lg"
        >
          <FontAwesome name="trash" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CustomerCard;
