import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const APP_URL = "https://royalflip.lovable.app";

    // Handle password reset confirmation (no email sent)
    if (type === "reset-confirm") {
      const { token, newPassword } = body;
      if (!token || !newPassword) {
        return new Response(JSON.stringify({ error: "Token and new password required" }), { status: 400, headers: jsonHeaders });
      }

      // Validate token
      const { data: resetData, error: resetError } = await supabase
        .from("password_resets")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .single();

      if (resetError || !resetData) {
        return new Response(JSON.stringify({ error: "Invalid or expired reset link" }), { status: 400, headers: jsonHeaders });
      }

      if (new Date(resetData.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Reset link has expired" }), { status: 400, headers: jsonHeaders });
      }

      // Update password using admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(resetData.user_id, {
        password: newPassword,
      });

      if (updateError) {
        console.error("Failed to update password:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update password" }), { status: 500, headers: jsonHeaders });
      }

      // Mark token as used
      await supabase.from("password_resets").update({ used: true }).eq("id", resetData.id);

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    }

    // Email sending types
    const { to, token, email } = body;
    if (!to) {
      return new Response(JSON.stringify({ error: "Recipient email required" }), { status: 400, headers: jsonHeaders });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Resend API key not configured" }), { status: 500, headers: jsonHeaders });
    }

    let subject: string;
    let html: string;

    if (type === "verification") {
      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), { status: 400, headers: jsonHeaders });
      }
      subject = "Verify your RoyalFlip email";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a2e; color: #fff; border-radius: 12px;">
          <h1 style="color: #f5c542; text-align: center;">ROYALFLIP</h1>
          <h2 style="text-align: center;">Verify Your Email</h2>
          <p style="text-align: center; color: #ccc;">Click the button below to verify your email address.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/auth?verify=${token}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #6c3baa, #4a2080); color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email</a>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px;">This link expires in 24 hours.</p>
        </div>`;
    } else if (type === "reset") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email required" }), { status: 400, headers: jsonHeaders });
      }

      // Find user by email
      const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).single();
      if (!profile) {
        // Don't reveal if user exists
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
      }

      // Generate reset token server-side
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const resetToken = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

      const { error: insertError } = await supabase.from("password_resets").insert({
        user_id: profile.id,
        email,
        token: resetToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      if (insertError) {
        console.error("Failed to store reset token:", insertError);
        return new Response(JSON.stringify({ error: "Failed to process request" }), { status: 500, headers: jsonHeaders });
      }

      subject = "Reset your RoyalFlip password";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a2e; color: #fff; border-radius: 12px;">
          <h1 style="color: #f5c542; text-align: center;">ROYALFLIP</h1>
          <h2 style="text-align: center;">Reset Your Password</h2>
          <p style="text-align: center; color: #ccc;">Click the button below to set a new password.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/auth?reset=${resetToken}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #6c3baa, #4a2080); color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid email type" }), { status: 400, headers: jsonHeaders });
    }

    // Send via Resend API
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RoyalFlip <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders });
  }
});
