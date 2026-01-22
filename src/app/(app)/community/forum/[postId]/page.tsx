
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { doc, onSnapshot, collection, query, orderBy, addDoc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ForumPost, ForumReply } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const replySchema = z.object({
  content: z.string().min(1, "Reply cannot be empty."),
});
type ReplyFormData = z.infer<typeof replySchema>;


const PostContent = ({ post }: { post: ForumPost }) => {
    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle>{post.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={post.authorAvatar} />
                        <AvatarFallback>{post.authorName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>By {post.authorName}</span>
                    <span>&bull;</span>
                    <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : ''}</span>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <p className="whitespace-pre-wrap">{post.content}</p>
            </CardContent>
        </Card>
    )
}

const ReplyItem = ({ reply }: { reply: ForumReply }) => {
    return (
        <div className="flex gap-4 py-4">
            <Avatar>
                <AvatarImage src={reply.authorAvatar} />
                <AvatarFallback>{reply.authorName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{reply.authorName}</span>
                    <span className="text-muted-foreground">&bull;</span>
                    <span className="text-muted-foreground">{reply.createdAt ? formatDistanceToNow(reply.createdAt.toDate(), { addSuffix: true }) : ''}</span>
                </div>
                <p className="mt-1">{reply.content}</p>
            </div>
        </div>
    )
}

export default function PostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  
  const form = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
    defaultValues: { content: '' },
  });

  useEffect(() => {
    if (!firestore || !postId) return;
    setLoading(true);

    const postRef = doc(firestore, 'forumPosts', postId);
    const repliesQuery = query(collection(firestore, `forumPosts/${postId}/replies`), orderBy('createdAt', 'asc'));

    const unsubPost = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        setPost({ id: doc.id, ...doc.data() } as ForumPost);
      } else {
        toast({ title: "Post not found.", variant: 'destructive'});
        router.push('/community/forum');
      }
    });

    const unsubReplies = onSnapshot(repliesQuery, (snapshot) => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ForumReply)));
      setLoading(false);
    });

    return () => {
      unsubPost();
      unsubReplies();
    };
  }, [firestore, postId, router, toast]);

  const onReplySubmit = async (data: ReplyFormData) => {
    if (!user || !firestore || !post) return;
    form.reset();

    const postRef = doc(firestore, 'forumPosts', post.id);
    const replyRef = doc(collection(firestore, `forumPosts/${post.id}/replies`));
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
              throw new Error("Post does not exist anymore.");
            }
            const currentPost = postDoc.data() as ForumPost;

            transaction.set(replyRef, {
                postId: post.id,
                content: data.content,
                authorId: user.uid,
                authorName: user.displayName,
                authorAvatar: user.photoURL,
                createdAt: serverTimestamp()
            });

            transaction.update(postRef, {
                replyCount: currentPost.replyCount + 1,
                lastReplyAt: serverTimestamp()
            });
        });
    } catch (error: any) {
        toast({ title: "Failed to post reply", description: error.message, variant: 'destructive'});
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!post) {
    return null; // Redirect is handled in useEffect
  }
  
  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/community/forum"><ArrowLeft className="h-4 w-4"/></Link>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold truncate">{post.title}</h1>
        </div>
      
      <PostContent post={post} />
      
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-semibold">{post.replyCount} Replies</h3>
        <div className="divide-y">
            {replies.map(reply => <ReplyItem key={reply.id} reply={reply} />)}
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Post a Reply</CardTitle>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onReplySubmit)}>
                <CardContent>
                    <FormField 
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl><Textarea placeholder="Share your thoughts..." {...field} rows={4} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                        Post Reply
                    </Button>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}

    