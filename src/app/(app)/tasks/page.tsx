
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Award, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Task, UserTaskProgress } from '@/lib/types';
import { functions } from '@/firebase/functions';

type TaskWithProgress = Task & {
    progress: number;
    completed: boolean;
    claimed: boolean;
};

const TaskCard = ({ task, onClaim, isClaiming }: { task: TaskWithProgress; onClaim: (taskId: string) => void; isClaiming: boolean }) => {
    const isCompleted = task.progress >= task.target;
    
    return (
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{task.title}</CardTitle>
                        <CardDescription>{task.description}</CardDescription>
                    </div>
                     <div className="flex items-center gap-2 text-amber-500 font-bold">
                        <Award className="h-5 w-5"/>
                        <span>₹{task.reward}</span>
                     </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Progress value={(task.progress / task.target) * 100} className="flex-1"/>
                    <span className="text-sm font-semibold">{Math.min(task.progress, task.target)} / {task.target}</span>
                </div>
            </CardContent>
            <CardContent>
                 <Button className="w-full" disabled={!isCompleted || task.claimed || isClaiming} onClick={() => onClaim(task.id)}>
                    {isClaiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    {task.claimed ? <><CheckCircle2 className="mr-2 h-4 w-4"/>Claimed</> : isCompleted ? 'Claim Reward' : 'In Progress'}
                </Button>
            </CardContent>
        </Card>
    );
};

export default function TasksPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<TaskWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

    useEffect(() => {
        if (!firestore || !user) return;

        const tasksQuery = query(collection(firestore, 'tasks'));
        const unsubscribeTasks = onSnapshot(tasksQuery, async (snapshot) => {
            setLoading(true);
            const availableTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            
            const tasksWithProgress: TaskWithProgress[] = await Promise.all(
                availableTasks.map(async (task) => {
                    const progressRef = doc(firestore, `user_tasks/${user.uid}/tasks/${task.id}`);
                    const progressSnap = await getDoc(progressRef);
                    if (progressSnap.exists()) {
                        const progressData = progressSnap.data() as UserTaskProgress;
                        return { ...task, ...progressData };
                    }
                    return { ...task, progress: 0, completed: false, claimed: false };
                })
            );
            
            setTasks(tasksWithProgress);
            setLoading(false);
        });

        return () => unsubscribeTasks();
    }, [firestore, user]);
    
    const handleClaimReward = useCallback(async (taskId: string) => {
        setClaimingTaskId(taskId);
        try {
            const claimTaskReward = httpsCallable(functions, 'claimTaskReward');
            const result = await claimTaskReward({ taskId });
            const data = result.data as { success: boolean, message: string };
            if(data.success){
                toast({ title: "Reward Claimed!", description: data.message, className: 'bg-green-100 text-green-800' });
            } else {
                 toast({ title: "Claim Failed", description: data.message, variant: "destructive" });
            }
        } catch(error: any) {
            toast({ title: "Claim Failed", description: error.message, variant: "destructive" });
        } finally {
            setClaimingTaskId(null);
        }
    }, [toast]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Daily Missions</h1>
            {loading && <div className="flex justify-center items-center py-16"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
            {!loading && tasks.length === 0 && (
                 <Card className="text-center py-16">
                    <CardContent>
                        <p className="text-muted-foreground">No missions available right now. Check back later!</p>
                    </CardContent>
                </Card>
            )}
            {!loading && (
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} onClaim={handleClaimReward} isClaiming={claimingTaskId === task.id}/>
                    ))}
                </div>
            )}
        </div>
    );
}
