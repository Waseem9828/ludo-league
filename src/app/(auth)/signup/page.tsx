'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Gift, Loader2, Phone, MessageCircle } from 'lucide-react';
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithGoogle, sendOtp, verifyOtpAndSignIn } from '@/firebase/auth/client';
import Image from 'next/image';
import { getAuth, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
import { motion } from 'framer-motion';

function SignUpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

   useEffect(() => {
    if (searchParams) {
      const refCode = searchParams.get('ref');
      if (refCode) {
        setReferralCode(refCode);
        toast({
          title: "Referral Applied!",
          description: `You were referred by code: ${refCode}`
        });
      }
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleAuthError = (error: any) => {
    let message = 'An unexpected error occurred. Please try again.';
     switch (error.code) {
        case 'auth/invalid-phone-number':
            message = 'The phone number format is not valid. Please enter a 10-digit number.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many attempts. Please wait a moment before trying again.';
            break;
        case 'auth/code-expired':
            message = 'The OTP has expired. Please request a new one.';
            break;
        case 'auth/invalid-verification-code':
            message = 'The OTP you entered is incorrect.';
            break;
        case 'auth/invalid-referral-code':
            message = 'The referral code you entered is invalid. Please check the code and try again.';
            break;
        default:
            console.error('Unhandled auth error:', error);
            message = `An unexpected error occurred: ${error.message}`;
            break;
    }
    toast({ title: "Authentication Failed", description: message, variant: "destructive" });
    setCooldown(10);
  };
  
  const handleSendOtp = async () => {
    setIsOtpLoading(true);
    const fullPhoneNumber = `+91${phone}`;
    try {
      const auth = getAuth();
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
      const result = await sendOtp(fullPhoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
    } catch (error: any) {
      handleAuthError(error);
      setConfirmationResult(null); // Reset on error
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleOtpSignup = async () => {
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
      const { isNewUser } = await verifyOtpAndSignIn(confirmationResult, otp, referralCode);
      if (isNewUser) {
        toast({ title: "Account Created!", description: "Welcome! You are now being redirected." });
      } else {
        toast({ title: "Login Successful!", description: "Welcome back! Redirecting..." });
      }
      router.push('/dashboard');
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

   const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const { isNewUser } = await signInWithGoogle(referralCode);
      if (isNewUser) {
        toast({ title: "Account Created!", description: "Welcome! You are now being redirected." });
      } else {
        toast({ title: "Login Successful!", description: "Welcome back! Redirecting..." });
      }
      router.push('/dashboard');
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isButtonDisabled = isLoading || isGoogleLoading || isOtpLoading || cooldown > 0;

  return (
    <div className="relative mt-16">
      <motion.div
        className="absolute -top-16 left-1/2 -translate-x-1/2 z-20"
        initial={{ scale: 0, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.2
        }}
      >
        <div className="p-3 bg-card/80 backdrop-blur-md rounded-full shadow-2xl border border-border/20">
          <Image src="/icon-192x192.png" alt="Ludo League Logo" width={96} height={96} priority />
        </div>
      </motion.div>

      <div className="w-full h-full bg-card/60 dark:bg-card/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/20 p-8 pt-24 text-foreground flex flex-col justify-center">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tighter">Create Your Account</h1>
            <p className="text-muted-foreground mt-1">Join the ultimate Ludo arena.</p>
        </div>

        <div className="mb-6">
            <Button 
                onClick={handleGoogleSignUp} 
                disabled={isButtonDisabled} 
                variant="outline"
                className="w-full h-12 border-border font-semibold shadow-sm"
            >
                 {isGoogleLoading 
                    ? <Loader2 className="h-5 w-5 mr-3 animate-spin"/> 
                    : <><GoogleIcon className="h-5 w-5 mr-3" />Sign up with Google</>}
            </Button>
        </div>

        <div className="flex items-center my-6">
            <hr className="w-full border-border/50" />
            <span className="px-4 text-muted-foreground text-sm">OR</span>
            <hr className="w-full border-border/50" />
        </div>
        
        {!confirmationResult ? (
            <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <div className="flex h-12 w-16 items-center justify-center rounded-md bg-background/50 border border-border">
                        <span className="text-muted-foreground font-semibold">+91</span>
                    </div>
                    <Input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={10}
                        required
                        className="bg-background/50 border-border h-12"
                    />
                </div>
                 <div className="relative">
                    <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
                    <Input 
                        type="text" 
                        placeholder="Referral Code (Optional)" 
                        value={referralCode} 
                        onChange={e => setReferralCode(e.target.value)} 
                        className="bg-background/50 border-border h-12 pl-10"
                    />
                </div>
                <Button onClick={handleSendOtp} disabled={isButtonDisabled || phone.length !== 10} className="w-full h-12 font-bold text-lg">
                    {isOtpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Send OTP"}
                </Button>
            </div>
        ) : (
             <div className="space-y-4">
                <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={6}
                    required
                    className="bg-background/50 border-border h-12 pl-10"
                />
                </div>
                <Button onClick={handleOtpSignup} disabled={isButtonDisabled || otp.length !== 6} className="w-full h-12 font-bold text-lg">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Create Account"}
                </Button>
                <Button variant="link" onClick={() => setConfirmationResult(null)}>Use a different number</Button>
            </div>
        )}

        {cooldown > 0 && <p className="text-center text-sm text-destructive mt-4">Too many attempts. Please try again in {cooldown} seconds.</p>}

        <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                    Log In
                </Link>
            </p>
        </div>
         <div id="recaptcha-container"></div>
    </div>
  );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>}>
            <SignUpForm />
        </Suspense>
    )
}
