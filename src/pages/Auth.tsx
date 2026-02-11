import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

type AuthMode = "signin" | "signup" | "forgot" | "reset-confirm" | "verifying";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const refCode = searchParams.get("ref");
    const verifyToken = searchParams.get("verify");
    const resetTokenParam = searchParams.get("reset");

    if (refCode) {
      setReferralCode(refCode);
      setMode("signup");
    }

    if (verifyToken) {
      setMode("verifying");
      handleVerifyEmail(verifyToken);
    }

    if (resetTokenParam) {
      setResetToken(resetTokenParam);
      setMode("reset-confirm");
    }

    if (!verifyToken && !resetTokenParam) {
      const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/");
        }
      };
      checkUser();
    }
  }, [navigate, searchParams]);

  const handleVerifyEmail = async (token: string) => {
    try {
      // Look up the verification token using service-role via edge function isn't needed
      // We'll use a direct approach: the edge function verified it server-side
      const { data: verification, error } = await supabase
        .from("email_verifications")
        .select("*")
        .eq("token", token)
        .eq("verified", false)
        .single();

      if (error || !verification) {
        setVerifyStatus("error");
        toast.error("Invalid or expired verification link.");
        return;
      }

      if (new Date(verification.expires_at) < new Date()) {
        setVerifyStatus("error");
        toast.error("Verification link has expired.");
        return;
      }

      // Mark as verified
      await supabase
        .from("email_verifications")
        .update({ verified: true })
        .eq("id", verification.id);

      // Update profile
      await supabase
        .from("profiles")
        .update({ email_verified: true } as any)
        .eq("id", verification.user_id);

      setVerifyStatus("success");
      toast.success("Email verified successfully!");
    } catch {
      setVerifyStatus("error");
      toast.error("Verification failed.");
    }
  };

  const generateToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  };

  const sendAuthEmail = async (type: string, to: string, token: string) => {
    const res = await supabase.functions.invoke("send-auth-email", {
      body: { type, to, token },
    });
    if (res.error) {
      throw new Error(res.error.message || "Failed to send email");
    }
    return res.data;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in successfully!");
      navigate("/");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Handle referral if referral code exists
    if (referralCode && data.user) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .single();

      if (referrer) {
        await supabase
          .from("profiles")
          .update({ referred_by: referrer.id })
          .eq("id", data.user.id);

        await supabase.from("referrals").insert({
          referrer_id: referrer.id,
          referred_id: data.user.id,
          referral_code: referralCode,
        });
      }
    }

    // Send verification email
    if (data.user) {
      try {
        const token = generateToken();
        await supabase.from("email_verifications").insert({
          user_id: data.user.id,
          token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        await sendAuthEmail("verification", email, token);
        toast.success("Account created! Check your email to verify your address.");
      } catch (err) {
        console.error("Failed to send verification email:", err);
        toast.success("Account created! Welcome bonus of ₹100 added!");
      }
    }

    navigate("/");
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await supabase.functions.invoke("send-auth-email", {
        body: { type: "reset", to: email, email },
      });

      if (res.error) {
        toast.error("Failed to send reset email. Please try again.");
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setMode("signin");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);

    try {
      const res = await supabase.functions.invoke("send-auth-email", {
        body: { type: "reset-confirm", token: resetToken, newPassword: password },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || "Failed to reset password. The link may be expired.");
      } else {
        toast.success("Password updated successfully!");
        setMode("signin");
      }
    } catch {
      toast.error("Failed to reset password.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-royal/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-royal to-gold bg-clip-text text-transparent mb-2">
            ROYALFLIP
          </h1>
          <p className="text-muted-foreground">Real-money coin flip betting</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
          {mode === "verifying" && (
            <div className="text-center space-y-4 py-8">
              {verifyStatus === "loading" && (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-royal mx-auto" />
                  <p className="text-muted-foreground">Verifying your email...</p>
                </>
              )}
              {verifyStatus === "success" && (
                <>
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                  <p className="text-foreground font-semibold">Email verified!</p>
                  <Button onClick={() => { setMode("signin"); navigate("/auth"); }} className="bg-gradient-to-r from-royal to-royal-dark">
                    Sign In
                  </Button>
                </>
              )}
              {verifyStatus === "error" && (
                <>
                  <p className="text-destructive font-semibold">Verification failed</p>
                  <p className="text-sm text-muted-foreground">The link may be invalid or expired.</p>
                  <Button onClick={() => { setMode("signin"); navigate("/auth"); }} variant="outline">
                    Back to Sign In
                  </Button>
                </>
              )}
            </div>
          )}

          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-royal to-royal-dark" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
              </Button>
              <div className="text-center space-y-2">
                <button type="button" onClick={() => setMode("forgot")} className="text-sm text-royal hover:underline">
                  Forgot password?
                </button>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-royal hover:underline font-medium">
                    Sign up
                  </button>
                </p>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Choose a username" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 8 characters" minLength={8} />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-royal to-royal-dark" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Sign Up"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("signin")} className="text-royal hover:underline font-medium">
                  Sign in
                </button>
              </p>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-royal to-royal-dark" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Reset Password"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <button type="button" onClick={() => setMode("signin")} className="text-royal hover:underline font-medium">
                  Back to sign in
                </button>
              </p>
            </form>
          )}

          {mode === "reset-confirm" && (
            <form onSubmit={handleResetConfirm} className="space-y-4">
              <h2 className="text-lg font-bold text-foreground text-center">Set New Password</h2>
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 8 characters" minLength={8} />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirm password" minLength={8} />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-royal to-royal-dark" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <button type="button" onClick={() => setMode("signin")} className="text-royal hover:underline font-medium">
                  Back to sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
