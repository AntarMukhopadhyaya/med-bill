/// <reference types="nativewind/types" />

/// <reference types="nativewind/types" />

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          email: string | null;
          phone: string;
          gstin: string | null;
          billing_address: string | null;
          shipping_address: string | null;
          updated_at: string | null;
          company_name: string | null;
          country: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          email?: string | null;
          phone: string;
          gstin?: string | null;
          billing_address?: string | null;
          shipping_address?: string | null;
          updated_at?: string | null;
          company_name?: string | null;
          country?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          email?: string | null;
          phone?: string;
          gstin?: string | null;
          billing_address?: string | null;
          shipping_address?: string | null;
          updated_at?: string | null;
          company_name?: string | null;
          country?: string | null;
        };
      };
      inventory: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          quantity: number;
          price: number;
          gst: number;
          hsn: string | null;
          description: string | null;
          restock_at: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          quantity?: number;
          price?: number;
          gst?: number;
          hsn?: string | null;
          description?: string | null;
          restock_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          quantity?: number;
          price?: number;
          gst?: number;
          hsn?: string | null;
          description?: string | null;
          restock_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          created_at: string;
          customer_id: string;
          subtotal: number;
          total_tax: number;
          notes: string | null;
          updated_at: string | null;
          total_amount: number;
          order_number: string;
          order_status: "pending" | "paid"; // CHANGED: Simplified to only pending/paid
          order_date: string;
          delivery_charge: number | null;
          purchase_order_number: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          customer_id: string;
          subtotal?: number;
          total_tax?: number;
          notes?: string | null;
          updated_at?: string | null;
          total_amount?: number;
          order_number: string;
          order_status?: "pending" | "paid"; // CHANGED
          order_date?: string;
          delivery_charge?: number | null;
          purchase_order_number?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          customer_id?: string;
          subtotal?: number;
          total_tax?: number;
          notes?: string | null;
          updated_at?: string | null;
          total_amount?: number;
          order_number?: string;
          order_status?: "pending" | "paid"; // CHANGED
          order_date?: string;
          delivery_charge?: number | null;
          purchase_order_number?: string | null;
        };
      };
      order_items: {
        Row: {
          id: number;
          created_at: string;
          order_id: string;
          unit_price: number;
          quantity: number;
          gst_percent: number;
          tax_amount: number;
          total_price: number;
          item_name: string;
          item_id: string | null;
        };
        Insert: {
          created_at?: string;
          order_id: string;
          unit_price?: number;
          quantity?: number;
          gst_percent?: number;
          tax_amount?: number;
          total_price?: number;
          item_name: string;
          item_id?: string | null;
        };
        Update: {
          created_at?: string;
          order_id?: string;
          unit_price?: number;
          quantity?: number;
          gst_percent?: number;
          tax_amount?: number;
          total_price?: number;
          item_name?: string;
          item_id?: string | null;
        };
      };
      invoices: {
        Row: {
          id: string;
          order_id: string;
          invoice_number: string;
          issue_date: string;
          due_date: string | null;
          amount: number;
          tax: number;
          pdf_url: string;
          created_at: string | null;
          updated_at: string | null;
          customer_id: string;
          delivery_charge: number | null;
          // REMOVED: status and amount_paid columns
        };
        Insert: {
          id?: string;
          order_id: string;
          invoice_number: string;
          issue_date?: string;
          due_date?: string | null;
          amount: number;
          tax: number;
          pdf_url: string;
          created_at?: string | null;
          updated_at?: string | null;
          customer_id: string;
          delivery_charge?: number | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          invoice_number?: string;
          issue_date?: string;
          due_date?: string | null;
          amount?: number;
          tax?: number;
          pdf_url?: string;
          created_at?: string | null;
          updated_at?: string | null;
          customer_id?: string;
          delivery_charge?: number | null;
        };
      };
      // REMOVED: payments table
      // REMOVED: payment_allocations table
      profiles: {
        Row: {
          id: string;
          created_at: string;
          role: string;
          profile_url: string | null;
          email: string;
          name: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          role?: string;
          profile_url?: string | null;
          email: string;
          name?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          role?: string;
          profile_url?: string | null;
          email?: string;
          name?: string | null;
        };
      };
      store: {
        Row: {
          id: number;
          created_at: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          wesbite: string | null;
          gst_number: string | null;
          state: string | null;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_ifsc_code: string | null;
          updated_at: string | null;
          logo_url: string | null;
        };
        Insert: {
          created_at?: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          wesbite?: string | null;
          gst_number?: string | null;
          state?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_ifsc_code?: string | null;
          updated_at?: string | null;
          logo_url?: string | null;
        };
        Update: {
          created_at?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          wesbite?: string | null;
          gst_number?: string | null;
          state?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_ifsc_code?: string | null;
          updated_at?: string | null;
          logo_url?: string | null;
        };
      };
      ledgers: {
        Row: {
          id: string;
          customer_id: string;
          opening_balance: number;
          current_balance: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          opening_balance?: number;
          current_balance?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          opening_balance?: number;
          current_balance?: number;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ledger_transactions: {
        Row: {
          id: string;
          ledger_id: string;
          transaction_date: string;
          amount: number;
          transaction_type: string;
          reference_type: string | null;
          reference_id: string | null;
          description: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          ledger_id: string;
          transaction_date?: string;
          amount: number;
          transaction_type: string;
          reference_type?: string | null;
          reference_id?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          ledger_id?: string;
          transaction_date?: string;
          amount?: number;
          transaction_type?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      inventory_logs: {
        Row: {
          id: string;
          item_id: string;
          order_id: string | null;
          quantity_changed: number;
          change_type: string;
          description: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          order_id?: string | null;
          quantity_changed: number;
          change_type: string;
          description?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          order_id?: string | null;
          quantity_changed?: number;
          change_type?: string;
          description?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
      };
      low_stock_alerts: {
        Row: {
          id: string;
          item_id: string;
          threshold_quantity: number;
          current_quantity: number;
          alert_status: string;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          threshold_quantity?: number;
          current_quantity: number;
          alert_status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          threshold_quantity?: number;
          current_quantity?: number;
          alert_status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
      };
    };
    Views: {
      // Add any views you might have, e.g.:
      customer_balance_report: {
        Row: {
          customer_id: string;
          customer_name: string;
          email: string | null;
          phone: string;
          outstanding_balance: number;
          total_orders: number;
          paid_orders: number; // CHANGED: Now based on order_status
          pending_orders: number; // CHANGED: Now based on order_status
          total_order_value: number;
          paid_amount: number; // CHANGED: Now based on order_status
        };
      };
    };
    Functions: {
      get_sales_report_data: {
        Args: {
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: {
          total_sales: number;
          total_orders: number;
          average_order_value: number;
          top_customers: any; // Use more specific type if known
          top_products: any;
          sales_by_month: any;
          order_status: any; // CHANGED: from payment_status
        };
      };
      get_database_health_metrics: {
        Args: Record<string, never>;
        Returns: any;
      };
      // Add other functions as needed
    };
  };
}
