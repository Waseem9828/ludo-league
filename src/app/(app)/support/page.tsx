
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, setDoc } from 'firebase/firestore';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { WhatsAppIcon, TelegramIcon } from '@/components/app/SocialIcons';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type Message = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  createdAt: Timestamp;
};

const bannerImage = PlaceHolderImages.find(img => img.id === 'support-banner');

const ChatMessage = ({ message, isCurrentUser }: { message: Message; isCurrentUser: boolean }) => {
    const time = message.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '';

    return (
        <div className={cn('flex items-end w-full', isCurrentUser ? 'justify-end' : 'justify-start')}>
            <div className={cn("flex flex-col space-y-2 text-sm max-w-xs mx-2", isCurrentUser ? 'order-1 items-end' : 'order-2 items-start')}>
                <div>
                    <span className={cn(
                        "px-4 py-2 rounded-lg inline-block",
                        isCurrentUser ? "rounded-br-none bg-gradient-primary text-primary-foreground" : "rounded-bl-none bg-background text-foreground shadow-sm"
                    )}>
                        {message.text}
                         <span className="block text-xs text-right mt-1 opacity-70">{time}</span>
                    </span>
                </div>
            </div>
            {!isCurrentUser && (
                 <Avatar className="h-8 w-8 order-1">
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>{message.senderName?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
            )}
        </div>
    );
};

const SocialContactCard = ({ href, icon: Icon, title, handle }: { href: string, icon: React.ElementType, title: string, handle: string }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer" className='block'>
        <Card className="shadow-md hover:shadow-lg transition-shadow hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
                <Icon className="h-12 w-12"/>
                <div>
                    <p className="font-semibold text-lg">{title}</p>
                    <p className="text-sm text-muted-foreground">{handle}</p>
                </div>
            </CardContent>
        </Card>
    </Link>
);


export default function SupportPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    if (!firestore || !user) return;

    setLoading(true);
    const messagesRef = collection(firestore, `supportChats/${user.uid}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching chat messages: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !newMessage.trim()) return;

    const messagesRef = collection(firestore, `supportChats/${user.uid}/messages`);
    const chatThreadRef = doc(firestore, 'supportChats', user.uid);
    
    await addDoc(messagesRef, {
      text: newMessage,
      senderId: user.uid,
      senderName: user.displayName,
      senderAvatar: user.photoURL,
      createdAt: serverTimestamp(),
    });

    await setDoc(chatThreadRef, {
        userId: user.uid,
        lastMessageText: newMessage,
        lastMessageAt: serverTimestamp(),
        isReadByAdmin: false,
    }, { merge: true });

    setNewMessage('');
  };

  return (
    <div className="space-y-6">
        {bannerImage &&
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6">
                <Image src={bannerImage.imageUrl} alt={bannerImage.description} fill className="object-cover" priority />
            </div>
        }
        <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
        <p className="text-lg text-muted-foreground">
            Have questions? Chat with our support team directly or connect with us on social media. We&apos;re here to help!
        </p>
     
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              Chat with Support
            </CardTitle>
             <CardDescription>Our team typically replies within a few hours.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[65vh]">
            <div className="flex-grow space-y-6 overflow-y-auto p-4 md:p-6 bg-muted/20">
                {loading && <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                {!loading && messages.length === 0 && <div className="flex flex-col justify-center items-center h-full text-center text-muted-foreground"><MessageSquare className="h-12 w-12 mb-4"/><p className='font-medium'>No messages yet. Send a message to start the conversation!</p></div>}
                {!loading && messages.map(msg => <ChatMessage key={msg.id} message={msg} isCurrentUser={msg.senderId === user?.uid} />)}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    autoComplete="off"
                    className="h-12 text-base rounded-full focus-visible:ring-primary/50"
                />
                <Button type="submit" size="icon" className="h-12 w-12 rounded-full flex-shrink-0" disabled={!newMessage.trim()}>
                    <Send className="h-5 w-5" />
                </Button>
                </form>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
             <SocialContactCard 
                href="https://wa.me/919351993756"
                icon={WhatsAppIcon}
                title="WhatsApp"
                handle="+91 93519 93756"
             />
             <SocialContactCard 
                href="https://t.me/ludoleague_support"
                icon={TelegramIcon}
                title="Telegram"
                handle="@ludoleague_support"
             />
        </div>
      </div>
    </div>
  );
}
