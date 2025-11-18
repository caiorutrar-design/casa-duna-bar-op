-- Add separate columns for debit and credit cards in cash_closures
ALTER TABLE public.cash_closures 
ADD COLUMN card_debit_expected numeric DEFAULT 0 NOT NULL,
ADD COLUMN card_debit_actual numeric DEFAULT 0 NOT NULL,
ADD COLUMN card_credit_expected numeric DEFAULT 0 NOT NULL,
ADD COLUMN card_credit_actual numeric DEFAULT 0 NOT NULL,
ADD COLUMN payment_methods_used jsonb DEFAULT '{"cash": true, "card_debit": true, "card_credit": true, "pix": true}'::jsonb;

-- Update existing records to split card values equally between debit and credit
UPDATE public.cash_closures
SET 
  card_debit_expected = card_expected / 2,
  card_debit_actual = card_actual / 2,
  card_credit_expected = card_expected / 2,
  card_credit_actual = card_actual / 2;