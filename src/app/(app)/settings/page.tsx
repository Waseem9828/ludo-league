'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Bell, KeyRound, Palette, Trash2, User, Loader2 } from "lucide-react";
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';


export default function SettingsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Please fill both password fields.", variant: "destructive" });
      return;
    }
    if (!user || !user.email) {
      toast({ title: "User not found or email provider not used.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
       toast({ title: "You must be logged in.", variant: "destructive" });
       setIsLoading(false);
       return;
    }

    const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);

    try {
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast({ title: "Password Updated Successfully!", className: 'bg-green-100 text-green-800' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      let errorMessage = "An unknown error occurred.";
      if (error.code === 'auth/wrong-password') {
        errorMessage = "The current password you entered is incorrect.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The new password is too weak. It should be at least 6 characters long.";
      }
      toast({ title: "Password Change Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="grid gap-8">
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-6 w-6 text-primary"/>
                    Account Settings
                </CardTitle>
                <CardDescription>Manage your account details and password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <Button onClick={handleChangePassword} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                    Change Password
                </Button>
            </CardContent>
        </Card>

        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Palette className="h-6 w-6 text-primary"/>
                    Appearance
                </CardTitle>
                <CardDescription>Customize the look and feel of the app.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <Label htmlFor="dark-mode">Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">Enable or disable dark theme.</p>
                    </div>
                    <Switch id="dark-mode" />
                </div>
            </CardContent>
        </Card>
        
        <Card className="shadow-md border-destructive">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-6 w-6"/>
                    Danger Zone
                </CardTitle>
                 <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                </div>
                <Button variant="destructive">Delete My Account</Button>
            </CardContent>
        </Card>
    </div>
  );
}
