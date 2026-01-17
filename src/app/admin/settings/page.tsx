'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { Loader2, Save, Megaphone, Settings, ShieldX } from "lucide-react";

type AppSettings = {
    maintenanceMode: boolean;
    announcement: { message: string; active: boolean; };
};

export default function SettingsPage() {
    useAdminOnly();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [settings, setSettings] = useState<Partial<AppSettings>>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!firestore) return;
        const settingsRef = doc(firestore, "settings", "global");
        getDoc(settingsRef).then(docSnap => {
            if (docSnap.exists()) {
                setSettings(docSnap.data() as AppSettings);
            } else {
                // Set default values if not present
                setSettings({
                    maintenanceMode: false,
                    announcement: { message: '', active: false },
                });
            }
        }).finally(() => setLoading(false));
    }, [firestore]);

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            const settingsRef = doc(firestore, "settings", "global");
            await setDoc(settingsRef, settings, { merge: true });
            toast({ title: "Success", description: "Global settings have been updated successfully.", className: "bg-green-100 text-green-800" });
        } catch (error) {
            console.error("Error saving settings: ", error);
            toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSwitchChange = (id: keyof AppSettings, checked: boolean) => {
        setSettings(prev => ({ ...prev, [id]: checked }));
    };

    const handleAnnouncementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;
        setSettings(prev => ({...prev, announcement: {...(prev.announcement || { active: false }), message: value }}));
    };

    const handleAnnouncementSwitch = (checked: boolean) => {
        setSettings(prev => ({...prev, announcement: {...(prev.announcement || { message: '' }), active: checked}}));
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                 <div>
                    <h2 className="text-3xl font-bold tracking-tight">Global App Settings</h2>
                    <p className="text-muted-foreground">Manage your application&apos;s global configuration from one place.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldX/> Maintenance Mode</CardTitle>
                    <CardDescription>Temporarily disable access to the app for non-admin users. Admins can still log in.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between rounded-lg border p-4">
                    <Label htmlFor="maintenanceMode" className="font-semibold">Enable Maintenance Mode</Label>
                    <Switch id="maintenanceMode" checked={settings.maintenanceMode} onCheckedChange={(c) => handleSwitchChange('maintenanceMode', c)} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Megaphone/> Promotion Banner</CardTitle>
                    <CardDescription>Display a thin, animated promotional banner at the very top of the app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Textarea id="announcementMessage" placeholder="E.g., Diwali Dhamaka! 50% bonus on all deposits today." value={settings.announcement?.message} onChange={handleAnnouncementChange} />
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <Label htmlFor="announcementActive" className="font-semibold">Activate Promotion Banner</Label>
                        <Switch id="announcementActive" checked={settings.announcement?.active} onCheckedChange={handleAnnouncementSwitch} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                 <Button onClick={handleSave} disabled={isSaving} size="lg">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Settings
                </Button>
            </div>
        </div>
    );
}
