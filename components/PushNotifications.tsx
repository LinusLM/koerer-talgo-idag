"use client";

import { useEffect, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// Helper functions to get/set cookies
function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie =
    name +
    "=" +
    encodeURIComponent(value) +
    "; expires=" +
    expires +
    "; path=/";
}

function getCookie(name: string) {
  return document.cookie.split("; ").reduce((r, v) => {
    const [key, val] = v.split("=");
    return key === name ? decodeURIComponent(val) : r;
  }, "");
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const sendNotification = useAction(api.push.sendNotification);
  const subscribeUser = useMutation(api.subscriptions.subscribeUser);
  const unsubscribeUser = useMutation(api.subscriptions.unsubscribeUser);

  // Ensure a userId cookie exists
  function getUserId() {
    let userId = getCookie("userId");
    if (!userId) {
      userId = crypto.randomUUID();
      setCookie("userId", userId);
    }
    return userId;
  }

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker().catch((err) => {
        console.error("Failed to register service worker:", err);
      });
    }
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (err) {
      console.error("Service worker registration failed:", err);
      throw err;
    }
  }
  async function subscribeToPush() {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "denied"
    ) {
      setMessage(
        "Please allow notifications in your browser settings to subscribe.",
      );
      setPermission("denied");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      ),
    });
    setSubscription(sub);
    if (typeof Notification !== "undefined")
      setPermission(Notification.permission);

    const serializedSub = JSON.parse(JSON.stringify(sub));
    await subscribeUser({
      userId: getUserId(),
      subscription: serializedSub,
    });
  }

  async function unsubscribeFromPush() {
    const userId = getUserId();
    if (!subscription || !userId) return;

    await subscription.unsubscribe();
    setSubscription(null);
    await unsubscribeUser({ userId });
  }

  if (!isSupported) {
    return <p>Push notifications are not supported in this browser.</p>;
  }

  return (
    <div>
      <h3>Push Notifications</h3>
      {message ? (
        <p className="muted">{message}</p>
      ) : permission === "denied" ? (
        <p style={{ color: "var(--danger)" }}>
          Please allow notifications in your browser settings to receive alerts.
        </p>
      ) : null}
      {subscription ? (
        <>
          <p className="muted">You are subscribed.</p>
          <div className="row" style={{ marginTop: ".45rem" }}>
            <button
              onClick={unsubscribeFromPush}
              style={{
                background: "transparent",
                color: "var(--muted)",
                padding: ".4rem .7rem",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              Unsubscribe
            </button>
          </div>
        </>
      ) : (
        <>
          {!(message || permission === "denied") && (
            <p className="muted">You are not subscribed.</p>
          )}
          <div style={{ marginTop: ".5rem" }}>
            <button onClick={subscribeToPush}>Subscribe</button>
          </div>
        </>
      )}
    </div>
  );
}
