'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Loader2, Phone, MessageCircle } from 'lucide-react';
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import Link from 'next/link';
import { signInWithGoogle, sendOtp, verifyOtpAndSignIn } from '@/firebase/auth/client';
import { getAuth, sendPasswordResetEmail, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isResetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleAuthError = (error: any) => {
    let message = 'An unexpected error occurred. Please try again.';
    switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            message = 'The credentials you entered are incorrect. Please try again.';
            break;
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

  const handleOtpLogin = async () => {
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
      await verifyOtpAndSignIn(confirmationResult, otp);
      toast({ title: "Login Successful!", description: "Welcome back! Redirecting..." });
      router.push('/dashboard');
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast({ title: "Login Successful!", description: "Welcome back! Redirecting..." });
      router.push('/dashboard');
    } catch (error: any) {
      handleAuthError(error);
    } finally {
        setIsGoogleLoading(false);
    }
  };

  const isButtonDisabled = isLoading || isGoogleLoading || isOtpLoading || cooldown > 0;

  return (
    <>
      <div
        className="w-full h-full bg-card/80 dark:bg-card/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/20 p-8 text-foreground flex flex-col justify-center"
      >
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-primary/10 rounded-full mb-4 border border-primary/20">
            <Image src="/icon-192x192.png" alt="Ludo League Logo" width={40} height={40} />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter">Welcome Back</h1>
          <p className="text-muted-foreground mt-1">Log in to continue your streak.</p>
        </div>

        <div className="mb-6">
          <Button
            onClick={handleGoogleLogin}
            disabled={isButtonDisabled}
            variant="outline"
            className="w-full h-12 border-border font-semibold shadow-sm transition-all duration-300 transform hover:scale-105"
          >
            {isGoogleLoading
              ? <Loader2 className="h-5 w-5 mr-3 animate-spin" />
              : <><GoogleIcon className="h-5 w-5 mr-3" /> Continue with Google</>
            }
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
            <Button onClick={handleSendOtp} disabled={isButtonDisabled || phone.length !== 10} className="w-full h-12 font-bold text-lg">
              {isOtpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send OTP"}
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
            <Button onClick={handleOtpLogin} disabled={isButtonDisabled || otp.length !== 6} className="w-full h-12 font-bold text-lg">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Login"}
            </Button>
             <Button variant="link" onClick={() => setConfirmationResult(null)}>Use a different number</Button>
          </div>
        )}
        
        {cooldown > 0 && <p className="text-center text-sm text-destructive mt-4">Too many attempts. Please try again in {cooldown} seconds.</p>}

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
      <div id="recaptcha-container"></div>
    </>
  );
}
