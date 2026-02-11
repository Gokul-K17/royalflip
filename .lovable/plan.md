

# Update Report Email and Add Resend Email Integration

## Overview
Two changes: (1) update the report email address, and (2) integrate Resend API for sending email verification and password reset emails.

## 1. Update Report Email
Simple text change in `src/components/InfoPanel.tsx` -- update `notifications.projects@gmail.com` to `notifications.myprojects@gmail.com` in the mailto link on line 164.

## 2. Resend Email Integration

### Store the API Key
- Save `RESEND_API_KEY` as a backend secret (value: the key you provided)
- This keeps it secure and accessible only from backend functions

### Create `send-auth-email` Edge Function
A new backend function at `supabase/functions/send-auth-email/index.ts` that:
- Accepts a JSON body with `to`, `subject`, `html`, and `type` (verification / reset)
- Uses the Resend API (`https://api.resend.com/emails`) to send emails
- Sends from `onboarding@resend.dev` (Resend's default sender -- you can update this later if you verify your own domain)

### Database Changes
Create two new tables:

**`email_verifications`** -- stores verification tokens for new signups
- `id`, `user_id`, `token` (unique random string), `expires_at`, `verified` (boolean), `created_at`

**`password_resets`** -- stores password reset tokens
- `id`, `user_id`, `email`, `token` (unique random string), `expires_at`, `used` (boolean), `created_at`

Both tables will have RLS policies so users can only access their own records.

### Updated Auth Flow

**Sign Up:**
1. User signs up (auto-confirm enabled so they can proceed)
2. A verification token is generated and stored in `email_verifications`
3. The `send-auth-email` edge function sends a verification email via Resend with a link like `https://royalflip.lovable.app/auth?verify=TOKEN`
4. When user clicks the link, the token is validated and their profile is marked as `email_verified = true`
5. Add an `email_verified` column to `profiles` table

**Forgot Password:**
1. User enters email and clicks "Reset Password"
2. A reset token is generated and stored in `password_resets`
3. The `send-auth-email` edge function sends a reset email via Resend with a link like `https://royalflip.lovable.app/auth?reset=TOKEN`
4. When user clicks the link, they see a "Set New Password" form
5. On submit, the token is validated and `supabase.auth.updateUser({ password })` is called

### Auth Page Updates (`src/pages/Auth.tsx`)
- After signup, call the edge function to send verification email
- Handle `?verify=TOKEN` query param to verify email
- Handle `?reset=TOKEN` query param to show password reset form
- Add a new `"reset-confirm"` mode for entering the new password
- Update forgot password to use the edge function instead of Supabase's built-in `resetPasswordForEmail`

### Config Update
- Add `[functions.send-auth-email]` with `verify_jwt = false` to `supabase/config.toml` (needs to be accessible without auth for password reset)

## Technical Details

### Edge Function Structure
```
supabase/functions/send-auth-email/index.ts
- POST endpoint
- Validates request body (type, to, token)
- For "verification" type: generates email with verify link
- For "reset" type: generates email with reset link
- Calls Resend API with RESEND_API_KEY
- Returns success/error response
```

### Files to Create
- `supabase/functions/send-auth-email/index.ts`

### Files to Modify
- `src/components/InfoPanel.tsx` (line 164 -- email address)
- `src/pages/Auth.tsx` (add verification and reset token handling)

### Database Migration
- Add `email_verified` column to `profiles`
- Create `email_verifications` table
- Create `password_resets` table
- RLS policies for both new tables
- Enable auto-confirm for email signups (so users aren't blocked by Supabase's default email)

