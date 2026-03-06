"use client";

import { useEffect, useState, useRef } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import PushNotifications from "@/components/PushNotifications";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { STATIONS } from "@/lib/stationNames";

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name: string) {
  return document.cookie.split("; ").reduce((r, v) => {
    const [key, val] = v.split("=");
    return key === name ? decodeURIComponent(val) : r;
  }, "");
}

export default function Page() {
  const [stations, setStations] = useState("");
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [trains, setTrains] = useState("");
  const [selectedTrains, setSelectedTrains] = useState<string[]>([]);
  const [trainsOpen, setTrainsOpen] = useState(false);
  const trainsRef = useRef<HTMLDivElement | null>(null);

  // Mock train data for the dropdown

  const [userId, setUserId] = useState<string | null>(null);
  const setUserTargets = useMutation(api.subscriptions.setUserTargets);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const userSub = useQuery(
    api.subscriptions.getByUserId,
    userId ? { userId } : (undefined as any),
  );

  useEffect(() => {
    let id = getCookie("userId");
    if (!id) {
      id = crypto.randomUUID();
      setCookie("userId", id);
    }
    setUserId(id);
  }, []);

  async function saveTargets() {
    if (!userId) return;
    setSaving(true);
    const stationList = selectedStations.length
      ? selectedStations
      : stations
          .split(/,|\n/)
          .map((s) => s.trim())
          .filter(Boolean);
    const trainList = selectedTrains.length
      ? selectedTrains
      : trains
          .split(/,|\n/)
          .map((s) => s.trim())
          .filter(Boolean);
    await setUserTargets({ userId, stations: stationList, trains: trainList });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  // When the user's subscription document is available, populate UI
  useEffect(() => {
    if (userSub) {
      const serverStations = userSub.stations || [];
      setSelectedStations(Array.isArray(serverStations) ? serverStations : []);
      setStations(
        Array.isArray(serverStations) ? serverStations.join(", ") : "",
      );
    }
  }, [userSub]);

  // Click-away to close trains dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!trainsRef.current) return;
      const target = e.target as Node;
      if (trainsOpen && !trainsRef.current.contains(target)) {
        setTrainsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [trainsOpen]);

  return (
    <main>
      <div className="card">
        <h1>Talgo Tracker</h1>

        <div className="spacer" />

        <PushNotifications />

        <div className="spacer" />

        <h3>Notification Targets</h3>

        <div style={{ marginTop: "0.6rem" }}>
          <label>Stations</label>
          <div
            style={{
              marginTop: "0.4rem",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: ".4rem",
            }}
          >
            {STATIONS.map((st) => (
              <label
                key={st.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".5rem",
                  background: "rgba(255,255,255,0.02)",
                  padding: ".35rem",
                  borderRadius: "6px",
                }}
              >
                <input
                  type="checkbox"
                  className="bg-[#1c2433]"
                  checked={selectedStations.includes(st.value)}
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedStations((s) => [...s, st.value]);
                    else
                      setSelectedStations((s) =>
                        s.filter((v) => v !== st.value),
                      );
                  }}
                />
                <span style={{ color: "var(--muted)", fontSize: ".95rem" }}>
                  {st.label}
                </span>
                <small className="muted" style={{ marginLeft: "auto" }}>
                  {st.value}
                </small>
              </label>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: "0.8rem",
            textAlign: "right",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-end",
            flexDirection: "column",
          }}
        >
          <button onClick={saveTargets}>Save Targets</button>
          {saved && (
            <div style={{ marginTop: "0.45rem", textAlign: "center" }}>
              <span style={{ color: "var(--success)", fontWeight: 600 }}>
                Saved
              </span>
            </div>
          )}
        </div>

        <div className="spacer" />
        <InstallPrompt />
      </div>
    </main>
  );
}
