-- Create cash_closures table for daily cash register closures
CREATE TABLE IF NOT EXISTS public.cash_closures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closure_date DATE NOT NULL,
  bartender_name TEXT NOT NULL,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  cash_expected NUMERIC NOT NULL DEFAULT 0,
  cash_actual NUMERIC NOT NULL DEFAULT 0,
  card_expected NUMERIC NOT NULL DEFAULT 0,
  card_actual NUMERIC NOT NULL DEFAULT 0,
  pix_expected NUMERIC NOT NULL DEFAULT 0,
  pix_actual NUMERIC NOT NULL DEFAULT 0,
  total_difference NUMERIC NOT NULL DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access on cash_closures" 
ON public.cash_closures 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on cash_closures" 
ON public.cash_closures 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on cash_closures" 
ON public.cash_closures 
FOR UPDATE 
USING (true);

-- Create index for faster queries by date
CREATE INDEX idx_cash_closures_date ON public.cash_closures(closure_date DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_cash_closures_updated_at
BEFORE UPDATE ON public.cash_closures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();