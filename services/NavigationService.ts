import { router } from "expo-router";

export class NavigationService {
  // Customer navigation
  static goToCustomer(customerId: string) {
    router.push(`/customers/${customerId}`);
  }

  static goToCustomers() {
    router.push("/(tabs)/customers");
  }

  static goToCreateCustomer() {
    router.push("/customers/create");
  }

  static goToEditCustomer(customerId: string) {
    router.push(`/customers/${customerId}/edit`);
  }

  // Order navigation
  static goToOrder(orderId: string) {
    router.push(`/orders/${orderId}`);
  }

  static goToOrders() {
    router.push("/(tabs)/orders");
  }

  static goToCreateOrder() {
    router.push("/orders/create");
  }

  static goToEditOrder(orderId: string) {
    router.push(`/orders/${orderId}/edit`);
  }

  // Invoice navigation
  static goToInvoice(invoiceId: string) {
    router.push(`/invoices/${invoiceId}`);
  }

  static goToInvoices() {
    router.push("/(tabs)/invoices");
  }

  static goToCreateInvoice(orderId?: string) {
    const params = orderId ? `?orderId=${orderId}` : "";
    router.push(`/invoices/create${params}`);
  }

  static goToEditInvoice(invoiceId: string) {
    router.push(`/invoices/${invoiceId}/edit`);
  }

  // Ledger navigation
  static goToLedger() {
    router.push("/(tabs)/ledger");
  }

  static goToCustomerLedger(customerId: string) {
    router.push(`/ledger/${customerId}`);
  }

  // General navigation
  static goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/(tabs)");
    }
  }

  static goHome() {
    router.push("/(tabs)");
  }
}

// Navigation hooks for easy access in components
export const useNavigation = () => NavigationService;
