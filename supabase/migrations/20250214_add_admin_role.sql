-- Migration: Assign admin role to specific user
-- This migration will grant admin privileges to the user with the specified email.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'admin.royalflip@gmail.com';
