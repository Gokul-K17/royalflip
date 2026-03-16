import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function secureRandomWinner(): "king" | "tail" {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % 2 === 0 ? "king" : "tail";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { roundId } = body as { roundId?: unknown };
    if (
      !roundId ||
      typeof roundId !== "string" ||
      !UUID_REGEX.test(roundId)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing roundId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get round
    const { data: round, error: roundErr } = await supabase
      .from("multiplayer_rounds")
      .select("*")
      .eq("id", roundId)
      .eq("status", "betting")
      .single();

    if (roundErr || !round) {
      return new Response(
        JSON.stringify({
          error: "Round not found or already completed",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get bets
    const { data: bets } = await supabase
      .from("multiplayer_bets")
      .select("*")
      .eq("round_id", roundId);

    const kingBets = (bets || []).filter((b: any) => b.side === "king");
    const tailBets = (bets || []).filter((b: any) => b.side === "tail");

    // If one side has no players, refund all
    if (kingBets.length === 0 || tailBets.length === 0) {
      for (const bet of bets || []) {
        await supabase
          .from("wallets")
          .update({
            balance: supabase.rpc ? undefined : undefined, // we'll use raw SQL-like approach
          });
        // Refund via direct increment
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", bet.user_id)
          .single();
        if (wallet) {
          await supabase
            .from("wallets")
            .update({
              balance: parseFloat(wallet.balance) + parseFloat(bet.amount),
              last_updated: new Date().toISOString(),
            })
            .eq("user_id", bet.user_id);
        }

        await supabase
          .from("multiplayer_bets")
          .update({ payout: bet.amount })
          .eq("id", bet.id);
      }

      await supabase
        .from("multiplayer_rounds")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
          winner: null,
        })
        .eq("id", roundId);

      return new Response(
        JSON.stringify({
          success: true,
          cancelled: true,
          message: "Round cancelled - both sides need at least one player",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Set to flipping
    await supabase
      .from("multiplayer_rounds")
      .update({ status: "flipping" })
      .eq("id", roundId);

    // Cryptographically secure winner
    const winner = secureRandomWinner();
    const winnerTotal =
      winner === "king"
        ? parseFloat(round.king_total)
        : parseFloat(round.tail_total);
    const totalPool =
      parseFloat(round.king_total) + parseFloat(round.tail_total);
    const amountToShare = totalPool * 0.95; // 5% fee

    // Distribute payouts to winners
    const winningBets = (bets || []).filter((b: any) => b.side === winner);
    for (const bet of winningBets) {
      const payout = (parseFloat(bet.amount) / winnerTotal) * amountToShare;

      await supabase
        .from("multiplayer_bets")
        .update({ payout })
        .eq("id", bet.id);

      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", bet.user_id)
        .single();
      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            balance: parseFloat(wallet.balance) + payout,
            last_updated: new Date().toISOString(),
          })
          .eq("user_id", bet.user_id);
      }
    }

    // Mark completed
    await supabase
      .from("multiplayer_rounds")
      .update({
        status: "completed",
        winner,
        completed_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    return new Response(
      JSON.stringify({
        success: true,
        winner,
        king_players: kingBets.length,
        tail_players: tailBets.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Complete multiplayer round: unexpected error");
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
