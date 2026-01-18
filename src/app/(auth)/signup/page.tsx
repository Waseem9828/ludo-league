'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Mail, Lock, User, Gift, Loader2 } from 'lucide-react';
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail, signInWithGoogle } from '@/firebase/auth/client';
import Image from 'next/image';

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUpWithEmail(email, password, displayName, referralCode);
      toast({ title: "Account Created!", description: "Welcome! You are now logged in." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

   const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle(referralCode);
      toast({ title: "Account Created!", description: "Welcome! You are now logged in." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-card/80 dark:bg-card/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/20 p-8 text-foreground flex flex-col justify-center">
        {/* Header */}
        <div className="text-center mb-8">
            <div className="inline-block p-3 bg-primary/10 rounded-full mb-4 border border-primary/20">
                <Image src="/icon-192x192.png" alt="Ludo League Logo" width={40} height={40} />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter">Create Your Account</h1>
            <p className="text-muted-foreground mt-1">Join the ultimate Ludo arena.</p>
        </div>

        {/* Google Sign-in */}
        <div className="mb-6">
            <Button 
                onClick={handleGoogleSignUp} 
                disabled={isLoading || isGoogleLoading} 
                variant="outline"
                className="w-full h-12 border-border font-semibold shadow-sm transition-all duration-300 transform hover:scale-105"
            >
                 {isGoogleLoading ? <Loader2 className="h-5 w-5 mr-3 animate-spin"/> : <GoogleIcon className="h-5 w-5 mr-3" />}
                Sign up with Google
            </Button>
        </div>

        {/* Separator */}
        <div className="flex items-center my-6">
            <hr className="w-full border-border/50" />
            <span className="px-4 text-muted-foreground text-sm">OR</span>
            <hr className="w-full border-border/50" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
                <Input 
                    type="text" 
                    placeholder="Display Name" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    required 
                    className="bg-background/50 border-border h-12 pl-10 focus:ring-primary focus:border-primary"
                />
            </div>
             <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
                <Input 
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="bg-background/50 border-border h-12 pl-10 focus:ring-primary focus:border-primary"
                />
            </div>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
                <Input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    className="bg-background/50 border-border h-12 pl-10 focus:ring-primary focus:border-primary"
                />
            </div>
            <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
                <Input 
                    type="text" 
                    placeholder="Referral Code (Optional)" 
                    value={referralCode} 
                    onChange={e => setReferralCode(e.target.value)} 
                    className="bg-background/50 border-border h-12 pl-10 focus:ring-primary focus:border-primary"
                />
            </div>
            <Button type="submit" disabled={isLoading || isGoogleLoading} className="w-full h-12 font-bold text-lg transition-all duration-300 transform hover:scale-105">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Sign Up with Email"}
            </Button>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                    Log In
                </Link>
            </p>
        </div>
    </div>
  );
}
