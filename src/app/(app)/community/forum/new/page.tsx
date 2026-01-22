
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const postSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title cannot be more than 100 characters."),
  content: z.string().min(10, "Content must be at least 10 characters."),
});

type PostFormData = z.infer<typeof postSchema>;

export default function NewPostPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: { title: '', content: '' },
  });

  const onSubmit = async (data: PostFormData) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    try {
      const newPostRef = await addDoc(collection(firestore, 'forumPosts'), {
        title: data.title,
        content: data.content,
        authorId: user.uid,
        authorName: user.displayName,
        authorAvatar: user.photoURL,
        createdAt: serverTimestamp(),
        lastReplyAt: serverTimestamp(),
        replyCount: 0,
      });

      toast({ title: "Post created successfully!", className: 'bg-green-100 text-green-800' });
      router.push(`/community/forum/${newPostRef.id}`);

    } catch (error: any) {
      toast({ title: "Failed to create post", description: error.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/community/forum"><ArrowLeft className="h-4 w-4"/></Link>
            </Button>
            <h1 className="text-2xl font-bold">Create a New Post</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>New Discussion</CardTitle>
            <CardDescription>Share your thoughts with the community.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="Enter a descriptive title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl><Textarea placeholder="Explain your topic in detail..." rows={8} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Post
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

    