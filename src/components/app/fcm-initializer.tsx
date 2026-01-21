'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '@/firebase/config';
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/firebase/auth/use-user';
import { doc, setDoc } from 'firebase/firestore';

export function FcmInitializer() {
  const { toast } = useToast();
  const { user } = useUser();
  const notificationAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !messaging || !user) {
      return;
    }

    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
          if (currentToken) {
            console.log('FCM Token:', currentToken);
            // Save the token to the user's profile document
            const userProfileRef = doc(db, 'users', user.uid);
            await setDoc(userProfileRef, { fcmToken: currentToken }, { merge: true });

          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.log('Unable to get permission to notify.');
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    };

    requestPermissionAndGetToken();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      notificationAudioRef.current?.play().catch(error => console.error("Notification sound failed:", error));
      
      toast({
        title: payload.notification?.title || 'New Notification',
        description: payload.notification?.body || '',
      });
    });

    return () => {
      unsubscribe();
    };

  }, [user, toast]);

  return <audio ref={notificationAudioRef} src="/sounds/notification.mp3" preload="auto" />; 
}
