REVOKE ALL ON FUNCTION public.process_sale(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_bartender_pin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_sale(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_bartender_pin(text, text) TO service_role;

-- Keep app-facing RPCs (they enforce is_staff internally) and role helpers used by RLS policies
GRANT EXECUTE ON FUNCTION public.add_item_to_order(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ingredient_stock(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin(uuid) TO authenticated;