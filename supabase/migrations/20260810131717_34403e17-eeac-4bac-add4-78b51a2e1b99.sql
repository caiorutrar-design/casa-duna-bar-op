GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_bartender_pin(text, text) TO authenticated;