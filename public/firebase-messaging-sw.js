// This file needs to be in the public directory.
// It is used by the browser to handle background push notifications.
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";
import { onBackgroundMessage } from "firebase/messaging/sw";

const firebaseConfig = {
  apiKey: "AIzaSyAHRqi6FiM0jjMIqX0j7Jwj91s0JLyAKak",
  authDomain: "studio-4431476254-c1156.firebaseapp.com",
  projectId: "studio-4431476254-c1156",
  storageBucket: "studio-4431476254-c1156.firebasestorage.app",
  messagingSenderId: "23513776021",
  appId: "1:23513776021:web:3e5b6870112641c0fac09c",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Optional: Handle background messages
onBackgroundMessage(messaging, (payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-192x192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
