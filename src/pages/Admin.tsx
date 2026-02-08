import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import { ArrowLeft, Send, Users, Shield, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  balance?: number;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  payout_identifier: string;
  status: string;
  created_at: string;
  admin_notes?: string;
  username?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [giveAmount, setGiveAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    setCurrentUserId(user.id);

    // Check if user has admin role using RPC
    const { data: hasAdminRole } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (!hasAdminRole) {
      // Not an admin - redirect to home
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchUsers();
    fetchWithdrawalRequests();

    // Subscribe to withdrawal request changes
    const channel = supabase
      .channel('admin-withdrawal-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawal_requests' },
        () => {
          fetchWithdrawalRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUsers = async () => {
    // Admins can view all profiles due to admin policy
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, email")
      .order("username");

    if (profiles) {
      // Fetch wallet balances for each user
      const usersWithBalance = await Promise.all(
        profiles.map(async (profile) => {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", profile.id)
            .single();
          
          return {
            ...profile,
            balance: wallet?.balance || 0
          };
        })
      );
      setUsers(usersWithBalance);
    }
  };


  const fetchWithdrawalRequests = async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Get usernames for each request
      const requestsWithUsernames = await Promise.all(
        data.map(async (req) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", req.user_id)
            .single();
          
          return {
            ...req,
            username: profile?.username || "Unknown"
          };
        })
      );
      setWithdrawalRequests(requestsWithUsernames);
    }
  };

  const handleGiveMoney = async () => {
    if (!selectedUser || !giveAmount) {
      toast.error("Select a user and enter amount");
      return;
    }

    const amount = parseFloat(giveAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_give_money", {
        p_admin_id: currentUserId,
        p_target_user_id: selectedUser,
        p_amount: amount
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast.success(`₹${amount} sent successfully!`);
        setGiveAmount("");
        setSelectedUser("");
        fetchUsers();
      } else {
        toast.error(result.error || "Failed to send money");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleApproveWithdrawal = async (requestId: string) => {
    setProcessingWithdrawal(requestId);
    try {
      const { data, error } = await supabase.rpc("admin_process_withdrawal", {
        p_admin_id: currentUserId,
        p_request_id: requestId,
        p_action: "approve",
        p_notes: null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast.success("Withdrawal approved!");
        fetchWithdrawalRequests();
      } else {
        toast.error(result.error || "Failed to approve");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingWithdrawal(null);
    }
  };

  const handleRejectWithdrawal = async (requestId: string) => {
    setProcessingWithdrawal(requestId);
    try {
      const { data, error } = await supabase.rpc("admin_process_withdrawal", {
        p_admin_id: currentUserId,
        p_request_id: requestId,
        p_action: "reject",
        p_notes: "Request rejected by admin"
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast.success("Withdrawal rejected. Amount refunded.");
        fetchWithdrawalRequests();
      } else {
        toast.error(result.error || "Failed to reject");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingWithdrawal(null);
    }
  };

  const handleMarkPaid = async (requestId: string) => {
    setProcessingWithdrawal(requestId);
    try {
      const { data, error } = await supabase.rpc("admin_mark_withdrawal_paid", {
        p_admin_id: currentUserId,
        p_request_id: requestId,
        p_razorpay_payout_id: null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast.success("Withdrawal marked as paid!");
        fetchWithdrawalRequests();
      } else {
        toast.error(result.error || "Failed to mark as paid");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingWithdrawal(null);
    }
  };

  const handleMarkFailed = async (requestId: string) => {
    setProcessingWithdrawal(requestId);
    try {
      const { data, error } = await supabase.rpc("admin_mark_withdrawal_failed", {
        p_admin_id: currentUserId,
        p_request_id: requestId,
        p_failure_reason: "Payment failed. Amount refunded."
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast.success("Withdrawal marked as failed. Amount refunded.");
        fetchWithdrawalRequests();
      } else {
        toast.error(result.error || "Failed");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingWithdrawal(null);
    }
  };

  const maskUpiId = (upiId: string) => {
    if (!upiId || upiId.length < 5) return "****";
    const parts = upiId.split("@");
    if (parts.length === 2) {
      const name = parts[0];
      const masked = name.substring(0, 2) + "****" + name.substring(name.length - 1);
      return `${masked}@${parts[1]}`;
    }
    return upiId.substring(0, 3) + "****";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-500">Pending</span>;
      case "approved":
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-500">Approved</span>;
      case "paid":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-500">Paid</span>;
      case "rejected":
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-500">Rejected</span>;
      case "failed":
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-500">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">{status}</span>;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = withdrawalRequests.filter(r => r.status === "pending");
  const approvedRequests = withdrawalRequests.filter(r => r.status === "approved");
  const completedRequests = withdrawalRequests.filter(r => ["paid", "rejected", "failed"].includes(r.status));

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2 text-primary">
          <Shield className="w-5 h-5" />
          <span className="font-bold">Admin Panel</span>
        </div>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-lg mx-auto">
          <TabsTrigger value="withdrawals" className="relative">
            Withdrawals
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="space-y-4">
          {/* Pending Requests */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Pending Requests ({pendingRequests.length})
            </h2>
            
            {pendingRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 bg-background/50 rounded-lg border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{req.username}</p>
                        <p className="text-2xl font-bold text-gold">₹{req.amount}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {req.method} • {maskUpiId(req.payout_identifier)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleString()}
                        </p>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveWithdrawal(req.id)}
                        disabled={processingWithdrawal === req.id}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {processingWithdrawal === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectWithdrawal(req.id)}
                        disabled={processingWithdrawal === req.id}
                        className="flex-1"
                      >
                        {processingWithdrawal === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved (Ready to Pay) */}
          {approvedRequests.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
                Ready to Pay ({approvedRequests.length})
              </h2>
              <div className="space-y-3">
                {approvedRequests.map((req) => (
                  <div key={req.id} className="p-4 bg-background/50 rounded-lg border border-blue-500/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{req.username}</p>
                        <p className="text-2xl font-bold text-gold">₹{req.amount}</p>
                        <p className="text-sm text-foreground mt-1">
                          Pay to: <span className="font-mono">{req.payout_identifier}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.method} • {new Date(req.created_at).toLocaleString()}
                        </p>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleMarkPaid(req.id)}
                        disabled={processingWithdrawal === req.id}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {processingWithdrawal === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Paid
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleMarkFailed(req.id)}
                        disabled={processingWithdrawal === req.id}
                        className="flex-1"
                      >
                        {processingWithdrawal === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Mark Failed
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Requests */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Completed ({completedRequests.length})
            </h2>
            {completedRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No completed requests</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {completedRequests.slice(0, 20).map((req) => (
                  <div key={req.id} className="p-3 bg-background/50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{req.username}</p>
                      <p className="text-sm text-muted-foreground">₹{req.amount} • {req.method}</p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Give Money to User
            </h2>

            {/* Search */}
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            {/* User List */}
            <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedUser === user.id
                      ? "bg-primary/20 border border-primary"
                      : "bg-background/50 border border-transparent hover:bg-background/80"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-foreground">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <p className="text-sm font-bold text-primary">₹{user.balance?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Amount Input */}
            <div className="flex gap-3">
              <Input
                type="number"
                placeholder="Amount to give"
                value={giveAmount}
                onChange={(e) => setGiveAmount(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleGiveMoney}
                disabled={!selectedUser || !giveAmount || isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mt-3 justify-center flex-wrap">
              {[100, 500, 1000, 5000, 10000].map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  onClick={() => setGiveAmount(amt.toString())}
                  className="text-xs"
                >
                  ₹{amt}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Admin;
