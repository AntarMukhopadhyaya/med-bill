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
