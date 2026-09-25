-- RPC functions used by the login and admin user-management screens.

DROP FUNCTION IF EXISTS public.verify_login(text, text);
CREATE OR REPLACE FUNCTION public.verify_login(
  p_username text,
  p_password text
)
RETURNS TABLE (
  id uuid,
  username text,
  status_message text,
  is_admin boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.username, u.status_message, u.is_admin
  FROM public.users AS u
  WHERE u.username = p_username
    AND u.password = p_password
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.create_user(text, text, boolean);
CREATE OR REPLACE FUNCTION public.create_user(
  p_username text,
  p_password text,
  p_is_admin boolean DEFAULT false
)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.users (username, password, is_admin)
  VALUES (trim(p_username), p_password, coalesce(p_is_admin, false))
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user(text, text, boolean) TO anon, authenticated;
