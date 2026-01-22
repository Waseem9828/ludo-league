
'use client';
import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquarePlus, MessageSquare, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { ForumPost } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

const PostItem = ({ post }: { post: ForumPost }) => {
  return (
    <Link href={`/community/forum/${post.id}`}>
      <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
        <Avatar>
          <AvatarImage src={post.authorAvatar} />
          <AvatarFallback>{post.authorName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <h3 className="font-semibold">{post.title}</h3>
          <p className="text-sm text-muted-foreground">
            By {post.authorName}
          </p>
        </div>
        <div className="flex-shrink-0 text-right text-sm text-muted-foreground hidden md:block">
           <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>{post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}</span>
           </div>
            <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4" />
                <span>{post.lastReplyAt ? formatDistanceToNow(post.lastReplyAt.toDate(), { addSuffix: true }) : 'No replies'}</span>
           </div>
        </div>
      </div>
    </Link>
  );
};


export default function ForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const postsQuery = query(collection(firestore, 'forumPosts'), orderBy('lastReplyAt', 'desc'));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ForumPost));
      setPosts(fetchedPosts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Community Forum</h1>
        <Button asChild>
          <Link href="/community/forum/new">
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Create Post
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Discussions</CardTitle>
          <CardDescription>Browse topics or start a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!loading && posts.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <p>No posts yet. Be the first to start a discussion!</p>
            </div>
          )}
          {!loading && posts.length > 0 && (
            <div className="divide-y">
              {posts.map(post => <PostItem key={post.id} post={post} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    