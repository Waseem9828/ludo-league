      importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
      importScripts(
        "https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js"
      );
      
      const firebaseConfig = {
        apiKey: "AIzaSyAHRqi6FiM0jjMIqX0j7Jwj91s0JLyAKak",
        authDomain: "studio-4431476254-c1156.firebaseapp.com",
        projectId: "studio-4431476254-c1156",
        storageBucket: "studio-4431476254-c1156.firebasestorage.app",
        messagingSenderId: "23513776021",
        appId: "1:23513776021:web:3e5b6870112641c0fac09c",
        vapidKey: "BIXjS9oNwInVq1WlAujFPotaRon45RYERsu3vwQH3NfmMXoAEb0llR9syGiimI-h7MeeN-sOdk45UHJQyMyVcG4"
      };
      
      firebase.initializeApp(firebaseConfig);
      
      const messaging = firebase.messaging();