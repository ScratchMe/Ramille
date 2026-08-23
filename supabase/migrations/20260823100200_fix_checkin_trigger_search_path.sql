-- Suite advisor sécurité (function_search_path_mutable) sur prevent_answered_checkin_update.
alter function public.prevent_answered_checkin_update() set search_path = public;
