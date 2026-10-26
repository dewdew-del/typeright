-- Profiles are publicly readable, so the availability check does not need elevated rights.
alter function public.username_available(text) security invoker;
