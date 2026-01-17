
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
import { Loader2, PlusCircle, Trash2, Edit, Newspaper, Save } from 'lucide-react';
import type { News } from '@/lib/types';
import { useUser } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from '@/components/ui/dialog';

const NewsItemCard = ({ news, onEdit, onDelete }: { news: News, onEdit: (news: News) => void, onDelete: (id: string) => void}) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg">{news.title}</CardTitle>
            <CardDescription>
                By {news.authorName} on {news.createdAt?.toDate().toLocaleDateString()}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">{news.content}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(news)}><Edit className="h-4 w-4 mr-2"/>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(news.id)}><Trash2 className="h-4 w-4 mr-2"/>Delete</Button>
        </CardFooter>
    </Card>
)


export default function NewsManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<Partial<News>>({ title: '', content: '' });
  const [editingNews, setEditingNews] = useState<News | null>(null);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const q = query(collection(firestore, 'news'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as News)
      );
      setNewsItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !formState.title || !formState.content) {
      toast({ title: 'Title and content are required.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, 'news'), {
        ...formState,
        authorId: user.uid,
        authorName: user.displayName,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'News Item Created Successfully', className: 'bg-green-100 text-green-800' });
      setFormState({ title: '', content: '' });
    } catch (error: any) {
      toast({ title: 'Failed to create news item', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'news', id));
      toast({ title: 'News Item Deleted', variant: 'destructive' });
    } catch (error: any) {
      toast({ title: 'Failed to delete item', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleEdit = (news: News) => {
    setEditingNews(news);
  };
  
  const handleUpdate = async () => {
    if(!firestore || !editingNews) return;
    try {
      const newsRef = doc(firestore, 'news', editingNews.id);
      await updateDoc(newsRef, {
        title: editingNews.title,
        content: editingNews.content,
      });
      toast({ title: "News item updated!", className: "bg-green-100 text-green-800"});
      setEditingNews(null);
    } catch(error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Newspaper className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                News Management
            </h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
            <div className="lg:col-span-1">
                <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="h-6 w-6 text-primary" />
                    Create News Item
                    </CardTitle>
                    <CardDescription>Add a new announcement to the news ticker.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" name="title" value={formState.title || ''} onChange={handleInputChange} placeholder="e.g., New Tournament!" required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea id="content" name="content" value={formState.content || ''} onChange={handleInputChange} placeholder="Describe the news in detail..." required rows={5} />
                    </div>
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Add News Item
                    </Button>
                    </CardFooter>
                </form>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <Newspaper className="h-6 w-6 text-primary" />
                    Existing News Items
                    </CardTitle>
                    <CardDescription>View, edit, or delete current news items.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && <div className="text-center py-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></div>}
                    {!loading && newsItems.length === 0 && <div className="text-center py-8 text-muted-foreground">No news items found.</div>}
                    {!loading && <div className="space-y-4">
                        {newsItems.map(item => (
                            <NewsItemCard key={item.id} news={item} onEdit={handleEdit} onDelete={handleDelete} />
                        ))}
                    </div>}
                </CardContent>
                </Card>
            </div>
        </div>
      
      {editingNews && (
        <Dialog open={!!editingNews} onOpenChange={() => setEditingNews(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit News Item</DialogTitle>
              <DialogDescription>Make changes to the news item below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={editingNews.title} onChange={(e) => setEditingNews({...editingNews, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea id="edit-content" value={editingNews.content} onChange={(e) => setEditingNews({...editingNews, content: e.target.value})} rows={5} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleUpdate}><Save className="mr-2 h-4 w-4"/>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
