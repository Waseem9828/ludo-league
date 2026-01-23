'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Loader2 } from 'lucide-react';
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signInWithGoogle } from '@/firebase/auth/client';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'; // Corrected import
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleLoginError = (error: any) => {
    let message = 'An unexpected error occurred. Please try again.';
    switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            message = 'The email or password you entered is incorrect. Please try again.';
            break;
        case 'auth/invalid-email':
            message = 'The email address is not valid.';
            break;
        case 'auth/user-disabled':
            message = 'This user account has been disabled.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed login attempts. Please reset your password or try again later.';
            break;
        case 'auth/internal-error':
            message = 'An internal error occurred on the authentication server. Please try again later.';
            break;
        default:
            console.error('Unhandled login error:', error);
            message = `An unexpected error occurred: ${error.code}. Please ensure Email/Password sign-in is enabled in your Firebase project.`;
            break;
    }
    toast({ title: "Login Failed", description: message, variant: "destructive" });
    setCooldown(10); // Start a 10-second cooldown
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      toast({ title: "Login Successful!", description: "Welcome back! Redirecting..." });
    } catch (error: any) {
      handleLoginError(error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { user } = await signInWithGoogle();
      if (user) {
          toast({ title: "Login Successful!", description: "Welcome back! Redirecting..." });
      }
    } catch (error: any) {
      handleLoginError(error);
    } finally {
        setIsGoogleLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ title: 'Please enter your email.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({ title: 'Password Reset Email Sent', description: 'Please check your inbox to reset your password.' });
      setResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      if (error.code === 'auth/user-not-found') {
        toast({ title: "Error", description: "No user found with this email address.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to send password reset email. Please try again.", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const isButtonDisabled = isLoading || isGoogleLoading || cooldown > 0;

  return (
    <>
      <div
        className="w-full h-full bg-card/80 dark:bg-card/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/20 p-8 text-foreground flex flex-col justify-center"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-primary/10 rounded-full mb-4 border border-primary/20">
            <Image src="/icon-192x192.png" alt="Ludo League Logo" width={40} height={40} />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter">Welcome Back</h1>
          <p className="text-muted-foreground mt-1">Log in to continue your streak.</p>
        </div>

        {/* Google Sign-in */}
        <div className="mb-6">
          <Button
            onClick={handleGoogleLogin}
            disabled={isButtonDisabled}
            variant="outline"
            className="w-full h-12 border-border font-semibold shadow-sm transition-all duration-300 transform hover:scale-105"
            suppressHydrationWarning
          >
            {isGoogleLoading
              ? <Loader2 className="h-5 w-5 mr-3 animate-spin" />
              : cooldown > 0
                ? `Try again in ${cooldown}s`
                : <><GoogleIcon className="h-5 w-5 mr-3" /> Continue with Google</>
            }
          </Button>
        </div>

        {/* Separator */}
        <div className="flex items-center my-6">
          <hr className="w-full border-border/50" />
          <span className="px-4 text-muted-foreground text-sm">OR</span>
          <hr className="w-full border-border/50" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-background/50 border-border h-12 pl-10 focus:ring-primary focus:border-primary"
              suppressHydrationWarning
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="bg-background/50 border-border h-12 pl-10 focus:ring-primary focus:border-primary"
              suppressHydrationWarning
            />
          </div>
          <div className="text-right">
            <button type="button" onClick={() => setResetDialogOpen(true)} className="text-sm font-medium text-primary hover:underline" suppressHydrationWarning>
              Forgot Password?
            </button>
          </div>
          <Button type="submit" disabled={isButtonDisabled} className="w-full h-12 font-bold text-lg transition-all duration-300 transform hover:scale-105" suppressHydrationWarning>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : cooldown > 0 ? `Try again in ${cooldown}s` : "Login with Email"}
          </Button>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
      <Dialog open={isResetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we will send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reset-email" className="text-right">
                Email
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="col-span-3"
                placeholder="you@example.com"
                suppressHydrationWarning
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" suppressHydrationWarning>Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handlePasswordReset} disabled={isLoading} suppressHydrationWarning>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
