// This file must be in the public folder.

importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// You can get this from the Firebase console.
const firebaseConfig = {
    apiKey: "AIzaSyAHRqi6FiM0jjMIqX0j7Jwj91s0JLyAKak",
    authDomain: "studio-4431476254-c1156.firebaseapp.com",
    projectId: "studio-4431476254-c1156",
    storageBucket: "studio-4431476254-c1156.appspot.com",
    messagingSenderId: "23513776021",
    appId: "1:23513776021:web:3e5b6870112641c0fac09c"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192x192.png", // Or your app's icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
