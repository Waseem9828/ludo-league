"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, orderBy, query, limit, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MessageSquare, ArrowRight, Inbox } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdminOnly } from '@/hooks/useAdminOnly';

interface ChatThread {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  userAvatar: string;
}

function getInitials(name: string) {
    if(!name) return "U";
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.toUpperCase();
}

// New component for mobile card view
const ThreadCard = ({ thread }: { thread: ChatThread }) => (
    <Card className="hover:bg-muted/50 transition-colors">
        <Link href={`/admin/support/${thread.userId}`} className="block">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={thread.userAvatar} alt={thread.userName} />
                      <AvatarFallback>{getInitials(thread.userName)}</AvatarFallback>
                    </Avatar>
                    <div className='w-full'>
                      <div className='flex justify-between items-start'>
                          <div>
                            <p className="font-semibold">{thread.userName}</p>
                            <p className="text-sm text-muted-foreground">{thread.userEmail}</p>
                          </div>
                          <p className='text-xs text-muted-foreground whitespace-nowrap'>{thread.lastMessageAt ? thread.lastMessageAt.toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <p className='text-sm text-muted-foreground truncate'>{thread.lastMessage}</p>
            </CardContent>
        </Link>
    </Card>
);


export default function SupportInboxPage() {
  const firestore = useFirestore();
  useAdminOnly();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if(!firestore) return;
    
    const fetchThreads = async () => {
      setLoading(true);
      setError(null);
      try {
        const chatsCollectionRef = collection(firestore, 'supportChats');
        const chatDocsSnapshot = await getDocs(chatsCollectionRef);

        if (chatDocsSnapshot.empty) {
          setThreads([]);
          setLoading(false);
          return;
        }
        
        const threadPromises = chatDocsSnapshot.docs.map(async (chatDoc) => {
          const userId = chatDoc.id;
          
          const userDocRef = doc(firestore, 'users', userId);
          const messagesQuery = query(
              collection(firestore, `supportChats/${userId}/messages`), 
              orderBy('createdAt', 'desc'), 
              limit(1)
            );

          const [userDoc, lastMessageSnapshot] = await Promise.all([
              getDoc(userDocRef),
              getDocs(messagesQuery)
          ]);
            
          const lastMessage = lastMessageSnapshot.docs.length > 0 ? lastMessageSnapshot.docs[0].data() : null;

          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              userId,
              userName: userData.displayName || 'N/A',
              userEmail: userData.email || 'N/A',
              userAvatar: userData.photoURL || '',
              lastMessage: lastMessage?.text || 'No messages yet.',
              lastMessageAt: lastMessage?.createdAt?.toDate(),
            };
          }
          return null;
        });

        const resolvedThreads = (await Promise.all(threadPromises)).filter(t => t !== null) as ChatThread[];
        
        resolvedThreads.sort((a, b) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0));

        setThreads(resolvedThreads);
      } catch (err: any) {
        console.error('Error fetching support threads:', err);
        setError(`Failed to load support threads: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();

    const unsubscribe = onSnapshot(collection(firestore, 'supportChats'), () => {
        fetchThreads();
    });

    return () => unsubscribe();
  }, [firestore]);

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
             <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                Support Inbox
            </h2>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>All active support conversations with users.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">
              <p>{error}</p>
            </div>
          ) : threads.length === 0 ? (
             <div className="text-center py-20">
                 <div className="mx-auto p-4 bg-muted rounded-full w-fit">
                    <Inbox className="h-10 w-10 text-muted-foreground"/>
                 </div>
                <h3 className="text-xl font-semibold mt-4">No Conversations</h3>
                <p className="text-muted-foreground mt-2">When a user starts a new chat, it will appear here.</p>
             </div>
          ) : (
            <div className="space-y-4">
                {threads.map((thread) => (
                    <ThreadCard key={thread.userId} thread={thread} />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
