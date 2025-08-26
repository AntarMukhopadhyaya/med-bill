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
          payment_status: string;
          subtotal: number;
          total_tax: number;
          notes: string | null;
          updated_at: string | null;
          total_amount: number;
          order_number: string;
          order_status: string;
          order_date: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          customer_id: string;
          payment_status?: string;
          subtotal?: number;
          total_tax?: number;
          notes?: string | null;
          updated_at?: string | null;
          total_amount?: number;
          order_number: string;
          order_status?: string;
          order_date?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          customer_id?: string;
          payment_status?: string;
          subtotal?: number;
          total_tax?: number;
          notes?: string | null;
          updated_at?: string | null;
          total_amount?: number;
          order_number?: string;
          order_status?: string;
          order_date?: string;
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
          status: string;
          pdf_url: string;
          created_at: string | null;
          updated_at: string | null;
          customer_id: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          invoice_number: string;
          issue_date?: string;
          due_date?: string | null;
          amount: number;
          tax: number;
          status?: string;
          pdf_url: string;
          created_at?: string | null;
          updated_at?: string | null;
          customer_id: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          invoice_number?: string;
          issue_date?: string;
          due_date?: string | null;
          amount?: number;
          tax?: number;
          status?: string;
          pdf_url?: string;
          created_at?: string | null;
          updated_at?: string | null;
          customer_id?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          customer_id: string;
          amount: number;
          payment_date: string;
          payment_method: string;
          reference_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          amount: number;
          payment_date?: string;
          payment_method: string;
          reference_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: string;
          reference_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
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
      payment_allocations: {
        Row: {
          id: string;
          payment_id: string;
          invoice_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          invoice_id: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          invoice_id?: string;
          amount?: number;
          created_at?: string;
        };
      };
    };
  };
}
