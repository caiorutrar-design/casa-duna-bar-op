DELETE FROM public.sales WHERE created_at > now() - interval '30 minutes';
DELETE FROM public.stock_movements WHERE created_at > now() - interval '30 minutes';
DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE created_at > now() - interval '30 minutes');
DELETE FROM public.orders WHERE created_at > now() - interval '30 minutes';
UPDATE public.tables SET status='available' WHERE id NOT IN (SELECT table_id FROM public.orders WHERE status='open');