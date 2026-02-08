import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const buildCorsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Vary": "Origin",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
});

// Cryptographically secure random coin flip
function secureRandomFlip(): "heads" | "tails" {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % 2 === 0 ? "heads" : "tails";
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { gameSessionId } = body as { gameSessionId?: unknown };
    
    // Validate gameSessionId is a valid UUID
    if (!gameSessionId || typeof gameSessionId !== "string" || !UUID_REGEX.test(gameSessionId)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing gameSessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller and get session with user JWT for player identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: session, error: fetchError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", gameSessionId)
      .single();

    if (fetchError || !session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.status !== "waiting") {
      return new Response(
        JSON.stringify({ error: "Already flipped" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const player1Id = session.player1_id as string;
    const player2Id = session.player2_id as string;
    if (user.id !== player1Id && user.id !== player2Id) {
      return new Response(
        JSON.stringify({ error: "Not a player in this session" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use cryptographically secure random for the coin flip
    const flipResult = secureRandomFlip();
    const player1Choice = session.player1_choice as string;
    const winnerId =
      flipResult === player1Choice ? player1Id : player2Id;

    const now = new Date().toISOString();
    const { data: updateResult, error: updateError } = await supabase
      .from("game_sessions")
      .update({
        status: "completed",
        flip_result: flipResult,
        winner_id: winnerId,
        flipped_at: now,
        completed_at: now,
      })
      .eq("id", gameSessionId)
      .eq("status", "waiting")
      .select();

    if (updateError) {
      // Log sanitized error (no sensitive details)
      console.error("Execute flip update failed");
      return new Response(
        JSON.stringify({ error: "Failed to update game session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!updateResult || updateResult.length === 0) {
      return new Response(
        JSON.stringify({ error: "Already flipped" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Log only that an error occurred, not the details
    console.error("Execute coin flip: unexpected error");
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
