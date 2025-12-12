import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount } = await req.json();

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeySecret) {
      throw new Error("Razorpay credentials not configured");
    }

    console.log(`Verifying payment: ${razorpay_payment_id} for order: ${razorpay_order_id}`);

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac("sha256", razorpayKeySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      throw new Error("Invalid payment signature");
    }

    console.log("Signature verified successfully");

    // Update database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

      console.log(`Referral bonuses processed: ₹${referralBonus} each to referrer and referred`);
    }

    console.log(`Payment verified and wallet updated. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        newBalance: newBalance,
        message: "Payment successful",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});