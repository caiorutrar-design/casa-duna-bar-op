-- Add payment method field to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_method text CHECK (payment_method IN ('cash', 'card_debit', 'card_credit', 'pix'));