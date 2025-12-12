import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Send, Users, Shield, Crown, Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  balance?: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [giveAmount, setGiveAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [forceHeads, setForceHeads] = useState(false);
  const [forceTails, setForceTails] = useState(false);
  const [remainingFlips, setRemainingFlips] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");

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
    fetchForcedResults();
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

  const fetchForcedResults = async () => {
    const { data } = await supabase
      .from("forced_results")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setForceHeads(data.result === "heads");
      setForceTails(data.result === "tails");
      setRemainingFlips(data.remaining_flips);
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

  const handleForceResult = async (result: "heads" | "tails", enabled: boolean) => {
    if (result === "heads") {
      setForceHeads(enabled);
      if (enabled) setForceTails(false);
    } else {
      setForceTails(enabled);
      if (enabled) setForceHeads(false);
    }

    if (!enabled) {
      // Disable all forced results
      await supabase
        .from("forced_results")
        .update({ is_active: false })
        .eq("is_active", true);
      setRemainingFlips(0);
      toast.info("Forced results disabled");
      return;
    }

    // Create new forced result
    const { error } = await supabase
      .from("forced_results")
      .update({ is_active: false })
      .eq("is_active", true);

    const { error: insertError } = await supabase
      .from("forced_results")
      .insert({
        result,
        remaining_flips: 10,
        created_by: currentUserId,
        is_active: true
      });

    if (insertError) {
      toast.error("Failed to set forced result");
      return;
    }

    setRemainingFlips(10);
    toast.success(`Next 10 flips will be ${result.toUpperCase()}`);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Game Control Section */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          Game Result Control
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Force next 10 coin flips in Money Based Mode only
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Force Heads</p>
              <p className="text-xs text-muted-foreground">Next 10 flips will be heads</p>
            </div>
            <Switch
              checked={forceHeads}
              onCheckedChange={(checked) => handleForceResult("heads", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Force Tails</p>
              <p className="text-xs text-muted-foreground">Next 10 flips will be tails</p>
            </div>
            <Switch
              checked={forceTails}
              onCheckedChange={(checked) => handleForceResult("tails", checked)}
            />
          </div>

          {remainingFlips > 0 && (
            <div className="text-center p-2 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary">
                {remainingFlips} forced flips remaining
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Give Money Section */}
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
    </div>
  );
};

export default Admin;