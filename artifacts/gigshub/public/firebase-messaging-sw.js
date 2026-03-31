importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBagB-PN8ZnNtII1U-fpViAfzeuDxVg3E0",
  authDomain: "turbogh-e500a.firebaseapp.com",
  projectId: "turbogh-e500a",
  storageBucket: "turbogh-e500a.firebasestorage.app",
  messagingSenderId: "968167867269",
  appId: "1:968167867269:web:a496914eb3b4d38fa13aec",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notificationTitle = payload.notification?.title || 'TurboGH';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: payload.data,
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
