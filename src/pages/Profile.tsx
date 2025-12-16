import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, LogOut, Wallet, TrendingUp, Trophy, Edit, Plus, ArrowDownToLine, Smartphone, Loader2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface ProfileData {
  username: string;
  email: string;
  balance: number;
  locked_balance: number;
  bonus_balance: number;
  total_games: number;
  games_won: number;
  win_rate: number;
  total_winnings: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  failure_reason?: string;
}

const paymentMethods = [
  { id: 'gpay', name: 'Google Pay', icon: '💳' },
  { id: 'phonepe', name: 'PhonePe', icon: '📱' },
  { id: 'upi', name: 'UPI ID', icon: '🔗' },
];

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    fetchProfile();
    fetchWithdrawalRequests();
    
    // Subscribe to wallet changes for real-time updates
    const walletChannel = supabase
      .channel('profile-wallet-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets' },
        () => {
          fetchProfile();
        }
      )
      .subscribe();

    // Subscribe to withdrawal request changes
    const withdrawalChannel = supabase
      .channel('withdrawal-request-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawal_requests' },
        () => {
          fetchWithdrawalRequests();
          fetchProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(withdrawalChannel);
    };
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", user.id)
      .single();

    const { data: walletData } = await supabase
      .from("wallets")
      .select("balance, bonus_balance, locked_balance")
      .eq("user_id", user.id)
      .single();

    const { data: statsData } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileData && walletData && statsData) {
      const profileObj = {
        username: profileData.username,
        email: profileData.email,
        balance: parseFloat(walletData.balance.toString()),
        locked_balance: parseFloat((walletData.locked_balance || 0).toString()),
        bonus_balance: parseFloat(walletData.bonus_balance.toString()),
        total_games: statsData.total_games,
        games_won: statsData.games_won,
        win_rate: parseFloat(statsData.win_rate.toString()),
        total_winnings: parseFloat(statsData.total_winnings.toString()),
      };
      setProfile(profileObj);
      setEditedUsername(profileObj.username);
    }
    setLoading(false);
  };

  const fetchWithdrawalRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setWithdrawalRequests(data);
    }
  };

  const handleUpdateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ username: editedUsername })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
      return;
    }

    toast.success("Profile updated successfully");
    setIsEditing(false);
    fetchProfile();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const handleDeposit = async () => {
    if (!selectedPaymentMethod || !amount) {
      toast.error("Please select payment method and enter amount");
      return;
    }

    const payAmount = parseInt(amount);
    if (payAmount < 10) {
      toast.error("Minimum deposit is ₹10");
      return;
    }

    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Create Razorpay order
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount: payAmount, userId: user.id }
      });

      if (error) throw error;

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: 'RoyalFlip',
          description: `Add ₹${payAmount} via ${selectedPaymentMethod}`,
          order_id: data.orderId,
          handler: async (response: any) => {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.id,
                amount: payAmount,
              }
            });

            if (verifyError) {
              toast.error("Payment verification failed");
            } else {
              toast.success(`₹${payAmount} added to your wallet!`);
              fetchProfile();
              setDepositModalOpen(false);
              resetPaymentForm();
            }
          },
          prefill: {
            email: profile?.email,
          },
          theme: {
            color: '#D4A017',
          },
          modal: {
            ondismiss: () => {
              setProcessing(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedPaymentMethod || !amount || !upiId) {
      toast.error("Please fill all fields");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProcessing(false);
      return;
    }

    try {
      // Use the RPC function for proper validation and locking
      const { data, error } = await supabase.rpc('create_withdrawal_request', {
        p_user_id: user.id,
        p_amount: withdrawAmount,
        p_method: selectedPaymentMethod,
        p_payout_identifier: upiId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (result.success) {
        toast.success("Withdrawal request submitted! It will be processed within 24 hours.");
        fetchProfile();
        fetchWithdrawalRequests();
        setWithdrawModalOpen(false);
        resetPaymentForm();
      } else {
        toast.error(result.error || "Withdrawal failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Withdrawal failed");
    } finally {
      setProcessing(false);
    }
  };

  const resetPaymentForm = () => {
    setAmount("");
    setUpiId("");
    setSelectedPaymentMethod(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Processing';
      case 'paid':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-royal/5 to-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-royal/5 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-royal to-gold flex items-center justify-center text-4xl font-bold text-white">
                {profile.username[0].toUpperCase()}
              </div>
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value)}
                    className="max-w-xs mx-auto"
                    placeholder="Username"
                  />
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleUpdateProfile} size="sm" className="bg-gradient-to-r from-royal to-gold">
                      Save
                    </Button>
                    <Button onClick={() => setIsEditing(false)} size="sm" variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-2xl font-bold text-foreground">{profile.username}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground">{profile.email}</p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-royal/10 rounded-lg p-4 border border-royal/20">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-royal" />
                  <span className="text-sm text-muted-foreground">Available Balance</span>
                </div>
                <div className="text-2xl font-bold text-gold">
                  ₹{profile.balance.toFixed(2)}
                </div>
                {profile.locked_balance > 0 && (
                  <p className="text-xs text-yellow-500 mt-1">
                    ₹{profile.locked_balance.toFixed(2)} locked (pending withdrawal)
                  </p>
                )}
                {profile.bonus_balance > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +₹{profile.bonus_balance.toFixed(2)} bonus (non-withdrawable)
                  </p>
                )}
              </div>

              <div className="bg-gold/10 rounded-lg p-4 border border-gold/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-gold" />
                  <span className="text-sm text-muted-foreground">Total Winnings</span>
                </div>
                <div className="text-2xl font-bold text-gold">
                  ₹{profile.total_winnings.toFixed(2)}
                </div>
              </div>

              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Games Won</span>
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {profile.games_won}
                </div>
              </div>

              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  {profile.win_rate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total Games Played</div>
              <div className="text-xl font-semibold">{profile.total_games}</div>
            </div>
          </div>

          {/* Payment Options Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Payment Options
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => setDepositModalOpen(true)}
                className="h-16 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Deposit Funds
              </Button>
              <Button 
                onClick={() => setWithdrawModalOpen(true)}
                className="h-16 bg-gradient-to-r from-royal to-gold hover:opacity-90 text-white font-semibold"
              >
                <ArrowDownToLine className="w-5 h-5 mr-2" />
                Withdraw Funds
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {paymentMethods.map(method => (
                <span key={method.id} className="text-xs bg-muted px-3 py-1.5 rounded-full flex items-center gap-1">
                  {method.icon} {method.name}
                </span>
              ))}
            </div>
          </div>

          {/* Recent Withdrawal Requests */}
          {withdrawalRequests.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Withdrawal Requests
              </h3>
              <div className="space-y-3">
                {withdrawalRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(req.status)}
                      <div>
                        <p className="font-medium">₹{req.amount}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString()} • {req.method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        req.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                        req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        req.status === 'approved' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {getStatusText(req.status)}
                      </span>
                      {req.failure_reason && (
                        <p className="text-xs text-red-500 mt-1">{req.failure_reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      <Dialog open={depositModalOpen} onOpenChange={setDepositModalOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Plus className="w-5 h-5 text-green-500" />
              Deposit Funds
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Payment Method Selection */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Select Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method, i) => (
                  <motion.div
                    key={method.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Button
                      variant={selectedPaymentMethod === method.id ? "default" : "outline"}
                      className={`w-full h-16 flex-col gap-1 ${
                        selectedPaymentMethod === method.id 
                          ? "bg-primary border-primary" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      <span className="text-xl">{method.icon}</span>
                      <span className="text-xs">{method.name}</span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick amounts */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Select Amount</p>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    className={`h-12 font-semibold ${
                      amount === amt.toString() 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setAmount(amt.toString())}
                  >
                    ₹{amt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Or Enter Custom Amount</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  placeholder="Enter amount (min ₹10)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 h-12 text-lg bg-background border-border"
                  min={10}
                />
              </div>
            </div>

            <Button
              onClick={handleDeposit}
              disabled={processing || !selectedPaymentMethod || !amount}
              className="w-full h-12 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Deposit ₹{amount || 0}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ArrowDownToLine className="w-5 h-5 text-gold" />
              Withdraw Funds
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-gold">₹{profile?.balance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bonus balance (₹{profile?.bonus_balance.toFixed(2)}) is not withdrawable
              </p>
            </div>

            {/* Payment Method Selection */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Select Withdrawal Method</p>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method, i) => (
                  <motion.div
                    key={method.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Button
                      variant={selectedPaymentMethod === method.id ? "default" : "outline"}
                      className={`w-full h-16 flex-col gap-1 ${
                        selectedPaymentMethod === method.id 
                          ? "bg-primary border-primary" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      <span className="text-xl">{method.icon}</span>
                      <span className="text-xs">{method.name}</span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* UPI ID Input */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Enter UPI ID</p>
              <Input
                type="text"
                placeholder="yourname@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="h-12 bg-background border-border"
              />
            </div>

            {/* Quick amounts for withdrawal */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Select Amount</p>
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000, 2000, 5000].map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    disabled={amt > (profile?.balance || 0)}
                    className={`h-10 font-semibold ${
                      amount === amt.toString() 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setAmount(amt.toString())}
                  >
                    ₹{amt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Or Enter Amount (min ₹100)</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 h-12 text-lg bg-background border-border"
                  min={100}
                  max={profile?.balance}
                />
              </div>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={processing || !selectedPaymentMethod || !amount || !upiId}
              className="w-full h-12 bg-gradient-to-r from-royal to-gold text-white font-bold"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Withdraw ₹{amount || 0}</>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Withdrawals are processed within 24 hours. Min: ₹100
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
