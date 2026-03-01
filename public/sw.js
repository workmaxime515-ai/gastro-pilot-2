// Service Worker for Push Notifications — CoffeeFlow

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: data.icon || "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "default",
      data: { url: data.url || "/" },
      vibrate: [200, 100, 200],
      requireInteraction: data.tag === "anomaly" || data.tag?.startsWith("temp-"),
    };

    event.waitUntil(self.registration.showNotification(data.title || "CoffeeFlow", options));
  } catch {
    event.waitUntil(
      self.registration.showNotification("CoffeeFlow", {
        body: event.data.text(),
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
