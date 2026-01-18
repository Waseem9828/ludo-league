importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const firebaseConfig = {
    apiKey: "AIzaSyAHRqi6FiM0jjMIqX0j7Jwj91s0JLyAKak",
    authDomain: "studio-4431476254-c1156.firebaseapp.com",
    projectId: "studio-4431476254-c1156",
    storageBucket: "studio-4431476254-c1156.firebasestorage.app",
    messagingSenderId: "23513776021",
    appId: "1:23513776021:web:3e5b6870112641c0fac09c"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192x192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// This empty fetch listener is required for the app to be considered a PWA and be "installable".
self.addEventListener('fetch', (event) => {
  // Intentionally left empty.
});
