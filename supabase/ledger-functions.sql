-- Function to automatically create ledger when customer is created
CREATE OR REPLACE FUNCTION create_customer_ledger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ledgers (customer_id, opening_balance, current_balance)
  VALUES (NEW.id, 0.0, 0.0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create ledger for new customers
CREATE TRIGGER trigger_create_customer_ledger
  AFTER INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION create_customer_ledger();

-- Function to update ledger balance when transactions are added
CREATE OR REPLACE FUNCTION update_ledger_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ledgers
    SET current_balance = current_balance +
      CASE
        WHEN NEW.transaction_type = 'debit' THEN NEW.amount
        WHEN NEW.transaction_type = 'credit' THEN -NEW.amount
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = NEW.ledger_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction
    UPDATE public.ledgers
    SET current_balance = current_balance -
      CASE
        WHEN OLD.transaction_type = 'debit' THEN OLD.amount
        WHEN OLD.transaction_type = 'credit' THEN -OLD.amount
        ELSE 0
      END
    WHERE id = OLD.ledger_id;

    -- Apply new transaction
    UPDATE public.ledgers
    SET current_balance = current_balance +
      CASE
        WHEN NEW.transaction_type = 'debit' THEN NEW.amount
        WHEN NEW.transaction_type = 'credit' THEN -NEW.amount
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = NEW.ledger_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ledgers
    SET current_balance = current_balance -
      CASE
        WHEN OLD.transaction_type = 'debit' THEN OLD.amount
        WHEN OLD.transaction_type = 'credit' THEN -OLD.amount
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = OLD.ledger_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update ledger balance
CREATE TRIGGER trigger_update_ledger_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.ledger_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_ledger_balance();

-- Function to record transaction when invoice is created/paid
CREATE OR REPLACE FUNCTION record_invoice_transaction()
RETURNS TRIGGER AS $$
DECLARE
  customer_ledger_id UUID;
BEGIN
  -- Get the ledger ID for the customer
  SELECT id INTO customer_ledger_id
  FROM public.ledgers
  WHERE customer_id = NEW.customer_id;

  -- If no ledger exists, create one
  IF customer_ledger_id IS NULL THEN
    INSERT INTO public.ledgers (customer_id, opening_balance, current_balance)
    VALUES (NEW.customer_id, 0.0, 0.0)
    RETURNING id INTO customer_ledger_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Record invoice as debit transaction
    INSERT INTO public.ledger_transactions (
      ledger_id,
      amount,
      transaction_type,
      reference_type,
      reference_id,
      description
    ) VALUES (
      customer_ledger_id,
      NEW.amount + NEW.tax,
      'debit',
      'invoice',
      NEW.id,
      'Invoice: ' || NEW.invoice_number
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If status changed to paid, handle accordingly
    IF OLD.status != 'paid' AND NEW.status = 'paid' THEN
      -- This would typically be handled by payment records
      -- but we could add logic here if needed
      NULL;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice transactions
CREATE TRIGGER trigger_record_invoice_transaction
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION record_invoice_transaction();

-- Function to record payment transactions
CREATE OR REPLACE FUNCTION record_payment_transaction()
RETURNS TRIGGER AS $$
DECLARE
  customer_ledger_id UUID;
BEGIN
  -- Get the ledger ID for the customer
  SELECT id INTO customer_ledger_id
  FROM public.ledgers
  WHERE customer_id = NEW.customer_id;

  -- If no ledger exists, create one
  IF customer_ledger_id IS NULL THEN
    INSERT INTO public.ledgers (customer_id, opening_balance, current_balance)
    VALUES (NEW.customer_id, 0.0, 0.0)
    RETURNING id INTO customer_ledger_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Record payment as credit transaction
    INSERT INTO public.ledger_transactions (
      ledger_id,
      amount,
      transaction_type,
      reference_type,
      reference_id,
      description
    ) VALUES (
      customer_ledger_id,
      NEW.amount,
      'credit',
      'payment',
      NEW.id,
      'Payment via ' || NEW.payment_method ||
      CASE
        WHEN NEW.reference_number IS NOT NULL
        THEN ' - Ref: ' || NEW.reference_number
        ELSE ''
      END
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment transactions
CREATE TRIGGER trigger_record_payment_transaction
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION record_payment_transaction();

-- Function to get ledger summary for all customers
CREATE OR REPLACE FUNCTION get_ledger_summary()
RETURNS TABLE (
  total_customers INTEGER,
  customers_with_positive_balance INTEGER,
  customers_with_negative_balance INTEGER,
  customers_with_zero_balance INTEGER,
  total_outstanding_receivables NUMERIC,
  total_outstanding_payables NUMERIC,
  net_position NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_customers,
    COUNT(CASE WHEN current_balance > 0 THEN 1 END)::INTEGER as customers_with_positive_balance,
    COUNT(CASE WHEN current_balance < 0 THEN 1 END)::INTEGER as customers_with_negative_balance,
    COUNT(CASE WHEN current_balance = 0 THEN 1 END)::INTEGER as customers_with_zero_balance,
    COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) as total_outstanding_receivables,
    COALESCE(SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END), 0) as total_outstanding_payables,
    COALESCE(SUM(current_balance), 0) as net_position
  FROM public.ledgers;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer aging analysis
CREATE OR REPLACE FUNCTION get_customer_aging_analysis(days_30 INTEGER DEFAULT 30, days_60 INTEGER DEFAULT 60, days_90 INTEGER DEFAULT 90)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  current_balance NUMERIC,
  days_0_30 NUMERIC,
  days_31_60 NUMERIC,
  days_61_90 NUMERIC,
  days_over_90 NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.customer_id,
    c.name as customer_name,
    l.current_balance,
    COALESCE(SUM(CASE
      WHEN lt.transaction_type = 'debit'
      AND lt.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
      THEN lt.amount
      ELSE 0
    END), 0) as days_0_30,
    COALESCE(SUM(CASE
      WHEN lt.transaction_type = 'debit'
      AND lt.transaction_date >= CURRENT_DATE - INTERVAL '60 days'
      AND lt.transaction_date < CURRENT_DATE - INTERVAL '30 days'
      THEN lt.amount
      ELSE 0
    END), 0) as days_31_60,
    COALESCE(SUM(CASE
      WHEN lt.transaction_type = 'debit'
      AND lt.transaction_date >= CURRENT_DATE - INTERVAL '90 days'
      AND lt.transaction_date < CURRENT_DATE - INTERVAL '60 days'
      THEN lt.amount
      ELSE 0
    END), 0) as days_61_90,
    COALESCE(SUM(CASE
      WHEN lt.transaction_type = 'debit'
      AND lt.transaction_date < CURRENT_DATE - INTERVAL '90 days'
      THEN lt.amount
      ELSE 0
    END), 0) as days_over_90
  FROM public.ledgers l
  JOIN public.customers c ON l.customer_id = c.id
  LEFT JOIN public.ledger_transactions lt ON l.id = lt.ledger_id
  WHERE l.current_balance > 0  -- Only customers with outstanding balances
  GROUP BY l.customer_id, c.name, l.current_balance
  ORDER BY l.current_balance DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- Added: amount_paid column support & payment atomic RPC
-- ==============================================

-- Safely add amount_paid column to invoices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN amount_paid NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Ensure existing rows have amount_paid populated
UPDATE public.invoices SET amount_paid = 0 WHERE amount_paid IS NULL;

-- RPC: create_payment_with_allocations (atomic)
CREATE OR REPLACE FUNCTION public.create_payment_with_allocations(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_allocations JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (payment_id UUID) AS $$
DECLARE
  v_payment_id UUID;
  v_allocation JSONB;
  v_invoice_id UUID;
  v_alloc_amount NUMERIC;
  v_invoice_total NUMERIC;
  v_invoice_paid NUMERIC;
  v_new_paid NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Start transaction (function executes in single txn by default)
  INSERT INTO public.payments (customer_id, amount, payment_method, reference_number, notes, payment_date)
  VALUES (p_customer_id, p_amount, p_payment_method, p_reference_number, p_notes, p_payment_date)
  RETURNING id INTO v_payment_id;

  -- Process allocations
  FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    v_invoice_id := (v_allocation->>'invoice_id')::uuid;
    v_alloc_amount := (v_allocation->>'amount')::numeric;
    IF v_invoice_id IS NULL OR v_alloc_amount IS NULL THEN
      RAISE EXCEPTION 'Invalid allocation entry: %', v_allocation;
    END IF;
    INSERT INTO public.payment_allocations (payment_id, invoice_id, amount)
    VALUES (v_payment_id, v_invoice_id, v_alloc_amount);

    SELECT amount + tax, COALESCE(amount_paid,0) INTO v_invoice_total, v_invoice_paid
    FROM public.invoices WHERE id = v_invoice_id FOR UPDATE; -- lock row

    v_new_paid := v_invoice_paid + v_alloc_amount;

    IF v_new_paid >= v_invoice_total THEN
      v_new_status := 'paid';
      v_new_paid := v_invoice_total; -- cap
    ELSIF v_new_paid > 0 THEN
      v_new_status := 'partially_paid';
    ELSE
      v_new_status := 'sent';
    END IF;

    UPDATE public.invoices
    SET amount_paid = v_new_paid,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = v_invoice_id;
  END LOOP;

  -- Return id
  RETURN QUERY SELECT v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: refund_payment (simple reversal creating a negative credit / debit pair)
CREATE OR REPLACE FUNCTION public.refund_payment(
  p_payment_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_payment RECORD;
  v_refund_amount NUMERIC;
  v_ledger_id UUID;
  v_remaining NUMERIC;
  v_alloc RECORD;
  v_invoice_total NUMERIC;
  v_new_paid NUMERIC;
BEGIN
  -- Ensure payment_refunds table exists (idempotent create)
  PERFORM 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_refunds';
  IF NOT FOUND THEN
    EXECUTE $$CREATE TABLE public.payment_refunds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      reason TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );$$;
    -- Basic index for lookup
    CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id ON public.payment_refunds(payment_id);
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  v_refund_amount := COALESCE(p_amount, v_payment.amount);
  IF v_refund_amount <= 0 OR v_refund_amount > v_payment.amount THEN
    RAISE EXCEPTION 'Invalid refund amount';
  END IF;

  -- Insert a reversing ledger transaction (debit because original was credit)
  SELECT id INTO v_ledger_id FROM public.ledgers WHERE customer_id = v_payment.customer_id;
  IF v_ledger_id IS NULL THEN RAISE EXCEPTION 'Ledger not found for customer'; END IF;

  INSERT INTO public.ledger_transactions (
    ledger_id, amount, transaction_type, reference_type, reference_id, description
  ) VALUES (
    v_ledger_id, v_refund_amount, 'debit', 'payment_refund', p_payment_id, COALESCE('Refund: '||p_reason,'Refund of payment')
  );

  -- Log refund record
  INSERT INTO public.payment_refunds (payment_id, amount, reason)
  VALUES (p_payment_id, v_refund_amount, p_reason);

  -- Reverse allocations proportionally (or fully if full refund)
  v_remaining := v_refund_amount;
  FOR v_alloc IN
    SELECT * FROM public.payment_allocations WHERE payment_id = p_payment_id ORDER BY created_at DESC
  LOOP
    EXIT WHEN v_remaining <= 0;
    -- amount to reverse for this allocation
    IF v_alloc.amount <= v_remaining THEN
      -- full reversal of this allocation
      v_remaining := v_remaining - v_alloc.amount;
      -- Update invoice paid amount/status
      SELECT (amount + tax) INTO v_invoice_total FROM public.invoices WHERE id = v_alloc.invoice_id FOR UPDATE;
      UPDATE public.invoices
        SET amount_paid = GREATEST(0, amount_paid - v_alloc.amount),
            status = CASE
              WHEN GREATEST(0, amount_paid - v_alloc.amount) = 0 THEN 'sent'
              WHEN GREATEST(0, amount_paid - v_alloc.amount) < (amount + tax) THEN 'partially_paid'
              ELSE 'paid'
            END,
            updated_at = NOW()
      WHERE id = v_alloc.invoice_id;
      -- Reduce allocation record amount to 0 (or delete)
      DELETE FROM public.payment_allocations WHERE id = v_alloc.id;
    ELSE
      -- partial reversal
      SELECT (amount + tax), amount_paid INTO v_invoice_total, v_new_paid FROM public.invoices WHERE id = v_alloc.invoice_id FOR UPDATE;
      UPDATE public.invoices
        SET amount_paid = GREATEST(0, amount_paid - v_remaining),
            status = CASE
              WHEN GREATEST(0, amount_paid - v_remaining) = 0 THEN 'sent'
              WHEN GREATEST(0, amount_paid - v_remaining) < (amount + tax) THEN 'partially_paid'
              ELSE 'paid'
            END,
            updated_at = NOW()
      WHERE id = v_alloc.invoice_id;
      UPDATE public.payment_allocations SET amount = amount - v_remaining WHERE id = v_alloc.id;
      v_remaining := 0;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Order -> ledger impact: create ledger debit on delivered order if not already invoiced
CREATE OR REPLACE FUNCTION public.record_order_ledger_debit()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id UUID;
  v_existing BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.order_status IS DISTINCT FROM NEW.order_status) AND NEW.order_status = 'delivered' THEN
    -- Only if no invoice exists yet for order
    SELECT EXISTS(SELECT 1 FROM public.invoices WHERE order_id = NEW.id) INTO v_existing;
    IF v_existing THEN
      RETURN NEW; -- invoice trigger will handle ledger
    END IF;
    SELECT id INTO v_ledger_id FROM public.ledgers WHERE customer_id = NEW.customer_id;
    IF v_ledger_id IS NULL THEN
      INSERT INTO public.ledgers (customer_id, opening_balance, current_balance) VALUES (NEW.customer_id,0,0) RETURNING id INTO v_ledger_id;
    END IF;
    INSERT INTO public.ledger_transactions (
      ledger_id, amount, transaction_type, reference_type, reference_id, description
    ) VALUES (
      v_ledger_id, NEW.total_amount, 'debit', 'order', NEW.id, 'Delivered order: '||NEW.order_number
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_order_ledger_debit ON public.orders;
CREATE TRIGGER trigger_record_order_ledger_debit
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.record_order_ledger_debit();

-- Sales report function with proper FROM clause
CREATE OR REPLACE FUNCTION get_sales_report_data(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_sales numeric,
  total_orders bigint,
  average_order_value numeric,
  top_customers jsonb,
  top_products jsonb,
  sales_by_month jsonb,
  payment_status jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date timestamptz := COALESCE(p_end_date, NOW());
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT
      COALESCE(SUM(o.total_amount), 0) as total_sales,
      COUNT(o.id) as total_orders,
      CASE
        WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(o.id)
        ELSE 0
      END as average_order_value
    FROM orders o
    WHERE o.order_date BETWEEN v_start_date AND v_end_date
  ),
  customer_stats AS (
    SELECT
      c.id,
      c.name,
      COUNT(o.id) as order_count,
      COALESCE(SUM(o.total_amount), 0) as total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE o.order_date BETWEEN v_start_date AND v_end_date
    GROUP BY c.id, c.name
    ORDER BY total_spent DESC
    LIMIT 10
  ),
  product_stats AS (
    SELECT
      i.name as product_name,
      COALESCE(SUM(oi.quantity), 0) as quantity_sold,
      COALESCE(SUM(oi.total_price), 0) as revenue
    FROM inventory i
    LEFT JOIN order_items oi ON oi.item_id = i.id
    LEFT JOIN orders o ON o.id = oi.order_id
    WHERE o.order_date BETWEEN v_start_date AND v_end_date
    GROUP BY i.name
    ORDER BY revenue DESC
    LIMIT 10
  ),
  monthly_stats AS (
    SELECT
      DATE_TRUNC('month', o.order_date) as month,
      COALESCE(SUM(o.total_amount), 0) as sales,
      COUNT(o.id) as orders
    FROM orders o
    WHERE o.order_date BETWEEN v_start_date AND v_end_date
    GROUP BY DATE_TRUNC('month', o.order_date)
    ORDER BY month
  ),
  payment_stats AS (
    SELECT
      COUNT(CASE WHEN o.payment_status = 'paid' THEN 1 END) as paid,
      COUNT(CASE WHEN o.payment_status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN o.payment_status = 'overdue' THEN 1 END) as overdue
    FROM orders o
    WHERE o.order_date BETWEEN v_start_date AND v_end_date
  )
  SELECT
    os.total_sales,
    os.total_orders,
    os.average_order_value,
    (SELECT jsonb_agg(jsonb_build_object(
      'name', name,
      'totalSpent', total_spent,
      'orderCount', order_count
    )) FROM customer_stats) as top_customers,
    (SELECT jsonb_agg(jsonb_build_object(
      'name', product_name,
      'quantitySold', quantity_sold,
      'revenue', revenue
    )) FROM product_stats) as top_products,
    (SELECT jsonb_agg(jsonb_build_object(
      'month', TO_CHAR(month, 'Mon YYYY'),
      'sales', sales,
      'orders', orders
    )) FROM monthly_stats) as sales_by_month,
    (SELECT jsonb_build_object(
      'paid', paid,
      'pending', pending,
      'overdue', overdue
    ) FROM payment_stats) as payment_status
  FROM order_stats os;
END;
$$;
