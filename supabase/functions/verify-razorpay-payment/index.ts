import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Amount limits
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount } = body as {
      razorpay_order_id?: unknown;
      razorpay_payment_id?: unknown;
      razorpay_signature?: unknown;
      userId?: unknown;
      amount?: unknown;
    };

    // Validate userId
    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing userId" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Razorpay fields (basic string validation)
    if (!razorpay_order_id || typeof razorpay_order_id !== "string" || razorpay_order_id.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid order ID" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!razorpay_payment_id || typeof razorpay_payment_id !== "string" || razorpay_payment_id.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid payment ID" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!razorpay_signature || typeof razorpay_signature !== "string" || razorpay_signature.length > 200) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the requesting user matches the userId
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    
    if (!user || user.id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: User mismatch" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature
    const signatureBody = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac("sha256", razorpayKeySecret)
      .update(signatureBody)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("Payment signature verification failed");
      return new Response(
        JSON.stringify({ error: "Invalid payment signature" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate payment (idempotency)
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('payment_details->payment_id', razorpay_payment_id)
      .eq('status', 'completed')
      .maybeSingle();

    if (existingTransaction) {
      return new Response(
        JSON.stringify({ error: "Payment already processed" }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, total_deposits')
      .eq('user_id', userId)
      .single();

    const currentBalance = parseFloat(wallet?.balance?.toString() || '0');
    const currentDeposits = parseFloat(wallet?.total_deposits?.toString() || '0');
    const newBalance = currentBalance + amount;
    const newDeposits = currentDeposits + amount;

    // Update wallet balance with total_deposits
    await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        total_deposits: newDeposits,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Create transaction record
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount: amount,
        balance_after: newBalance,
        status: 'completed',
        payment_method: 'razorpay',
        processed_at: new Date().toISOString(),
        payment_details: {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
        },
      });

    // Check if this is user's first deposit and process referral bonus
    const { data: profile } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', userId)
      .single();

    if (profile?.referred_by && currentDeposits === 0) {
      // First deposit - give referral bonuses
      const referralBonus = 50;
      
      // Update referral record
      await supabase
        .from('referrals')
        .update({ reward_claimed: true })
        .eq('referred_id', userId);

      // Give bonus to referrer
      const { data: referrerWallet } = await supabase
        .from('wallets')
        .select('bonus_balance')
        .eq('user_id', profile.referred_by)
        .single();
      
      const referrerBonusBalance = parseFloat(referrerWallet?.bonus_balance?.toString() || '0');
      await supabase
        .from('wallets')
        .update({ bonus_balance: referrerBonusBalance + referralBonus })
        .eq('user_id', profile.referred_by);

      // Give bonus to referred user
      await supabase
        .from('wallets')
        .update({ bonus_balance: referralBonus })
        .eq('user_id', userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        newBalance: newBalance,
        message: "Payment successful",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Log only that an error occurred, not the details
    console.error("Verify payment: unexpected error");
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
