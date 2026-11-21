/* Background notifications. Must stay at the site root so the tab can be closed. */
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCQd1D6NbL4CUhEJiiIsDj31zLyZTCcy0U',
  authDomain: 'bubblehope-53b8f.firebaseapp.com',
  projectId: 'bubblehope-53b8f',
  storageBucket: 'bubblehope-53b8f.firebasestorage.app',
  messagingSenderId: '537902604580',
  appId: '1:537902604580:web:6052b8e7425c567c4613b1',
  measurementId: 'G-06SBVT1GRE'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // A notification payload is shown by the SDK. Data-only messages are not.
  if (payload.notification) return;

  const title = (payload.data && payload.data.title) || 'Bubble Hope';
  const body = (payload.data && payload.data.body) || '';
  self.registration.showNotification(title, {
    body: body,
    icon: '/favicon.ico',
    data: payload.data || {}
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
