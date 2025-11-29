import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface AddFundsModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

const quickAmounts = [100, 200, 500, 1000];

const AddFundsModal = ({ open, onClose, userId, onSuccess }: AddFundsModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePayment = async (payAmount: number) => {
    if (payAmount < 10) {
      toast.error("Minimum amount is ₹10");
      return;
    }

    setLoading(true);
    try {
      // Create Razorpay order
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount: payAmount, userId }
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
          description: 'Add funds to wallet',
          order_id: data.orderId,
          handler: async (response: any) => {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId,
                amount: payAmount,
              }
            });

            if (verifyError) {
              toast.error("Payment verification failed");
            } else {
              toast.success(`₹${payAmount} added to your wallet!`);
              onSuccess();
              onClose();
            }
          },
          prefill: {},
          theme: {
            color: '#D4A017',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Wallet className="w-6 h-6 text-gold" />
            Add Funds
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick amounts */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Quick Select</p>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((amt, i) => (
                <motion.div
                  key={amt}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Button
                    variant="outline"
                    className="w-full h-12 border-gold/30 hover:border-gold hover:bg-gold/10 text-lg font-semibold"
                    onClick={() => handlePayment(amt)}
                    disabled={loading}
                  >
                    ₹{amt}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Custom Amount</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 h-12 text-lg bg-background border-border"
                  min={10}
                />
              </div>
              <Button
                onClick={() => handlePayment(parseInt(amount))}
                disabled={loading || !amount || parseInt(amount) < 10}
                className="h-12 px-6 bg-gradient-to-r from-gold to-gold-light text-navy-light font-bold"
              >
                <Plus className="w-5 h-5 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center gap-2 p-3 bg-gold/10 rounded-lg border border-gold/20">
            <Sparkles className="w-5 h-5 text-gold" />
            <p className="text-sm text-muted-foreground">
              Instant deposit via Razorpay. Min ₹10, Max ₹50,000
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddFundsModal;
