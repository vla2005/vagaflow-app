import { apiRequest } from './api.js';

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bytes = window.atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export function supportsPushNotifications() {
  return window.isSecureContext
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function isInstalledPwa() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
}

export async function currentPushSubscription() {
  if (!supportsPushNotifications()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function notificationStatus() {
  const [{ data }, subscription] = await Promise.all([
    apiRequest('/api/push-subscriptions'),
    currentPushSubscription(),
  ]);

  return { ...data, subscribed: Boolean(subscription), permission: Notification.permission };
}

export async function enablePushNotifications() {
  const { data: configuration } = await apiRequest('/api/push-subscriptions');
  if (!configuration.available || !configuration.public_key) {
    throw new Error('As chaves de notificação ainda não foram configuradas na API.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Autorize as notificações nos ajustes do dispositivo para continuar.');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(configuration.public_key),
  });
  const serialized = subscription.toJSON();
  const contentEncoding = window.PushManager.supportedContentEncodings?.[0] || 'aes128gcm';

  await apiRequest('/api/push-subscriptions', {
    method: 'POST',
    body: { ...serialized, content_encoding: contentEncoding },
  });

  return notificationStatus();
}

export async function disablePushNotifications() {
  const subscription = await currentPushSubscription();

  if (subscription) {
    await apiRequest('/api/push-subscriptions', {
      method: 'DELETE',
      body: { endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
  }

  await syncAppBadge(0);
  return notificationStatus();
}

export async function syncAppBadge(count) {
  if (!('setAppBadge' in navigator)) return;
  if (Number(count) > 0) await navigator.setAppBadge(Number(count));
  else if ('clearAppBadge' in navigator) await navigator.clearAppBadge();
}
