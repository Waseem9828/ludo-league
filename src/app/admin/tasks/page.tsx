
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Edit, ClipboardCheck, Save } from 'lucide-react';
import type { Task } from '@/lib/types';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const TaskItem = ({ task, onEdit, onDelete, onToggle, isProcessing }: { task: Task, onEdit: (task: Task) => void, onDelete: (id: string) => void, onToggle: (id: string, status: boolean) => void, isProcessing: boolean }) => (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div>
            <p className="font-bold text-card-foreground">{task.title}</p>
            <p className="text-sm text-muted-foreground">{task.description}</p>
             <p className="text-xs text-amber-600 font-semibold mt-1">Reward: ₹{task.reward}</p>
        </div>
        <div className="flex items-center gap-4">
            <Switch
                checked={task.enabled}
                onCheckedChange={(checked) => onToggle(task.id, checked)}
                disabled={isProcessing}
            />
             <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(task)} disabled={isProcessing}>
                <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(task.id)} disabled={isProcessing}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    </div>
);


export default function TasksAdminPage() {
  useAdminOnly();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const q = query(collection(firestore, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumber = ['target', 'reward'].includes(name);
    setEditingTask(prev => ({ ...prev, [name]: isNumber ? Number(value) : value }));
  };

  const handleSelectChange = (value: string) => {
      setEditingTask(prev => ({ ...prev, type: value as Task['type']}));
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingTask || !editingTask.title || !editingTask.type || !editingTask.target || !editingTask.reward) {
      toast({ title: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    try {
        if(editingTask.id) { // Update
            const taskRef = doc(firestore, 'tasks', editingTask.id);
            await updateDoc(taskRef, editingTask);
            toast({ title: 'Task Updated!', className: 'bg-green-100 text-green-800' });
        } else { // Create
            await addDoc(collection(firestore, 'tasks'), {
                ...editingTask,
                enabled: true,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Task Created!', className: 'bg-green-100 text-green-800' });
        }
        setEditingTask(null);
    } catch (error: any) {
        toast({ title: 'Save Failed', description: error.message, variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(firestore, 'tasks', id));
      toast({ title: 'Task Deleted', variant: 'destructive' });
    } catch (error: any) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleToggle = async (id: string, status: boolean) => {
    if(!firestore) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(firestore, 'tasks', id);
      await updateDoc(docRef, { enabled: status });
      toast({ title: "Status updated!" });
    } catch(error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <ClipboardCheck className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                Task Management
            </h2>
            <Button onClick={() => setEditingTask({})}>
                <PlusCircle className="mr-2 h-4 w-4"/> Create New Task
            </Button>
        </div>
        
        {editingTask && (
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    {editingTask.id ? <Edit className="h-6 w-6 text-primary" /> : <PlusCircle className="h-6 w-6 text-primary" />}
                    {editingTask.id ? 'Edit Task' : 'Create New Task'}
                    </CardTitle>
                </CardHeader>
                <form onSubmit={handleSave}>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" name="title" value={editingTask.title || ''} onChange={handleInputChange} required/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Task Type</Label>
                                <Select value={editingTask.type} onValueChange={handleSelectChange} required>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PLAY_COUNT">Play Count</SelectItem>
                                        <SelectItem value="WIN_BASED">Win Count</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" value={editingTask.description || ''} onChange={handleInputChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="target">Target Count</Label>
                                <Input id="target" name="target" type="number" value={editingTask.target || ''} onChange={handleInputChange} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="reward">Reward (₹)</Label>
                                <Input id="reward" name="reward" type="number" value={editingTask.reward || ''} onChange={handleInputChange} required/>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Save Task
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        )}

        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Existing Tasks</CardTitle>
                <CardDescription>View, edit, or delete current tasks.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading && <div className="text-center py-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></div>}
                {!loading && tasks.length === 0 && <div className="text-center py-8 text-muted-foreground">No tasks found.</div>}
                {!loading && <div className="space-y-4">
                    {tasks.map(item => (
                        <TaskItem key={item.id} task={item} onEdit={setEditingTask} onDelete={handleDelete} onToggle={handleToggle} isProcessing={isSubmitting} />
                    ))}
                </div>}
            </CardContent>
        </Card>
    </div>
  );
}
