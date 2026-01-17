
"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Send, ArrowLeft, UserCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  senderName: string;
  senderAvatar: string;
}

function getInitials(name: string) {
    if(!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export default function SupportChatPage() {
  const { user: adminUser } = useUser();
  const firestore = useFirestore();
  useAdminOnly();
  const params = useParams();
  const userId = params ? params.userId as string : '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(!firestore || !userId) return;

    const fetchUserData = async () => {
      const userDocRef = doc(firestore, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUserProfile(userDocSnap.data() as UserProfile);
      } else {
        console.error("User not found");
      }
    };

    fetchUserData();

    const messagesQuery = query(
      collection(firestore, `supportChats/${userId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages: Message[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as Message;
      });
      setMessages(fetchedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !adminUser || !firestore) return;

    setIsSending(true);
    const messagesColRef = collection(firestore, `supportChats/${userId}/messages`);

    try {
      await addDoc(messagesColRef, {
        text: newMessage,
        senderId: adminUser.uid,
        senderName: adminUser.displayName,
        senderAvatar: adminUser.photoURL, // Admin avatar can be set here
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };
  
    const time = (createdAt: any) => createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '';


  return (
    <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      <Card className="md:col-span-1 h-fit">
        <CardHeader className='flex flex-row items-center gap-4'>
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile?.photoURL || undefined} />
              <AvatarFallback>{userProfile ? getInitials(userProfile.displayName || '') : 'U'}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle>{userProfile?.displayName}</CardTitle>
                <CardDescription>{userProfile?.email}</CardDescription>
            </div>
        </CardHeader>
        <CardContent className='space-y-4'>
            <div className="flex justify-between items-center">
                <span className='text-sm font-medium text-muted-foreground'>KYC Status</span>
                 <Badge
                    variant={userProfile?.kycStatus === 'approved' ? 'default' : 'destructive'}
                    className={cn({
                        'bg-green-100 text-green-800': userProfile?.kycStatus === 'approved',
                        'bg-red-100 text-red-800': userProfile?.kycStatus === 'rejected',
                        'bg-yellow-100 text-yellow-800': userProfile?.kycStatus === 'pending',
                    })}
                >
                    {userProfile?.kycStatus?.toUpperCase() || 'N/A'}
                </Badge>
            </div>
             <div className="flex justify-between items-center">
                <span className='text-sm font-medium text-muted-foreground'>Wallet Balance</span>
                <span className='font-bold'>₹{userProfile?.walletBalance?.toFixed(2) || '0.00'}</span>
            </div>
            <Button asChild className='w-full'>
                <Link href={`/admin/users/${userId}`}>
                    <UserCircle className="mr-2 h-4 w-4"/> View Full Profile
                </Link>
            </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 flex flex-col h-full">
        <CardHeader className='flex-shrink-0'>
            <div className='flex items-center gap-4'>
                <Button asChild variant='outline' size='icon'>
                     <Link href="/admin/support"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <CardTitle>Chat with {userProfile?.displayName}</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4 space-y-4 bg-muted/20">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            messages.map((msg) => {
                const isCurrentUserAdmin = msg.senderId === adminUser?.uid;
                return (
                     <div key={msg.id} className={cn('flex items-end w-full', isCurrentUserAdmin ? 'justify-end' : 'justify-start')}>
                        <div className={cn("flex flex-col space-y-2 text-sm max-w-xs mx-2", isCurrentUserAdmin ? 'order-1 items-end' : 'order-2 items-start')}>
                            <div>
                                <span className={cn(
                                    "px-4 py-2 rounded-lg inline-block",
                                    isCurrentUserAdmin ? "rounded-br-none bg-primary text-primary-foreground" : "rounded-bl-none bg-background shadow-sm"
                                )}>
                                    {msg.text}
                                    <span className="block text-xs text-right mt-1 opacity-70">{time(msg.createdAt)}</span>
                                </span>
                            </div>
                        </div>
                         {!isCurrentUserAdmin && (
                            <Avatar className='h-8 w-8 order-1'>
                                <AvatarImage src={userProfile?.photoURL || undefined} />
                                <AvatarFallback>{userProfile ? getInitials(userProfile.displayName || '') : 'U'}</AvatarFallback>
                            </Avatar>
                        )}
                         {isCurrentUserAdmin && (
                            <Avatar className='h-8 w-8 order-2'>
                                <AvatarImage src={adminUser?.photoURL || undefined} />
                                <AvatarFallback><ShieldCheck className='h-5 w-5'/></AvatarFallback>
                            </Avatar>
                        )}\
                    </div>
                )
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <CardFooter className="p-4 border-t flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              autoComplete="off"
            />
            <Button type="submit" disabled={isSending}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
