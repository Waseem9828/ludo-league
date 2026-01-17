'use client';
import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Award, Loader2, Save, X } from 'lucide-react';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { Switch } from '@/components/ui/switch';

type BonusConfiguration = {
    enabled: boolean;
    dailyBonus: number;
    streakBonus: { [key: string]: number };
    updatedAt?: any;
};

export default function BonusSettingsPage() {
  useAdminOnly();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [config, setConfig] = useState<BonusConfiguration>({
      enabled: true,
      dailyBonus: 1,
      streakBonus: { '3': 5, '7': 10 }
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const configRef = doc(firestore, 'bonus_config', 'settings');
    const unsubscribe = onSnapshot(configRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as BonusConfiguration;
        setConfig({
            enabled: data.enabled ?? true,
            dailyBonus: data.dailyBonus ?? 1,
            streakBonus: data.streakBonus ?? { '3': 5, '7': 10 }
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  const handleSave = async () => {
    if (!firestore) {
      toast({ title: 'Firestore not available', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    try {
      const configRef = doc(firestore, 'bonus_config', 'settings');
      await setDoc(configRef, {
        ...config,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Bonus settings updated successfully!', className: 'bg-green-100 text-green-800' });
    } catch (error: any) {
      toast({
        title: 'Failed to update settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setConfig(prev => ({ ...prev, [name]: Number(value) }));
  }

  const handleStreakChange = (day: string, value: string) => {
    setConfig(prev => {
      const newStreakBonus = { ...prev.streakBonus, [day]: Number(value) };
      return { ...prev, streakBonus: newStreakBonus };
    });
  };

  const handleRemoveStreak = (day: string) => {
    setConfig(prev => {
        const newStreakBonus = { ...prev.streakBonus };
        delete newStreakBonus[day];
        return { ...prev, streakBonus: newStreakBonus };
    });
  }

  const handleAddStreak = () => {
      const newDay = prompt("Enter the streak day (e.g., 5 for 5-day streak):");
      if(newDay && !isNaN(Number(newDay)) && Number(newDay) > 0) {
        setConfig(prev => ({...prev, streakBonus: {...prev.streakBonus, [newDay]: 0}}));
      } else if (newDay) {
        toast({ title: "Invalid Day", description: "Please enter a valid number for the streak day.", variant: "destructive" });
      }
  }


  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Award className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                Daily Login Bonus Settings
            </h2>
      </div>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Configure Daily Login & Streak Bonus</CardTitle>
          <CardDescription>
            Set the amounts for daily logins and for maintaining a consecutive login streak.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {loading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading current settings...</span>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="enabled" className="text-base">Enable Bonus System</Label>
                            <p className="text-sm text-muted-foreground">Turn the entire login bonus system on or off.</p>
                        </div>
                        <Switch id="enabled" checked={config.enabled} onCheckedChange={(checked) => setConfig(prev => ({...prev, enabled: checked}))} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dailyBonus">Base Daily Bonus (₹)</Label>
                        <Input
                            id="dailyBonus"
                            name="dailyBonus"
                            type="number"
                            value={config.dailyBonus}
                            onChange={handleInputChange}
                        />
                         <p className="text-xs text-muted-foreground">Amount a user gets for just logging in each day.</p>
                    </div>

                    <div className="space-y-4">
                        <Label>Streak Bonuses</Label>
                        <p className="text-xs text-muted-foreground">Reward users for logging in on consecutive days. The bonus is added to the base daily bonus.</p>
                        
                        {Object.entries(config.streakBonus).sort((a,b) => Number(a[0]) - Number(b[0])).map(([day, amount]) => (
                            <div key={day} className="flex items-center gap-4">
                               <div className="flex items-center gap-2">
                                  <Label>Day {day}</Label>
                               </div>
                                <Input 
                                    type="number" 
                                    placeholder="Bonus amount" 
                                    value={amount} 
                                    onChange={(e) => handleStreakChange(day, e.target.value)}
                                    className="flex-grow"
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveStreak(day)}><X className="h-4 w-4 text-destructive"/></Button>
                            </div>
                        ))}
                         <Button type="button" variant="outline" onClick={handleAddStreak}>Add Streak Day</Button>
                    </div>
                </>
            )}
        </CardContent>
        <CardFooter className="bg-muted/30 px-6 py-4">
             <Button onClick={handleSave} disabled={isSaving || loading} className="w-full sm:w-auto">
                {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <Save className="mr-2 h-4 w-4" />
                )}
                Save Settings
            </Button>
        </CardFooter>
      </Card>
    </>
  );
}
