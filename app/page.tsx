"use client";

import { useEffect, useState, useRef } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import PushNotifications from "@/components/PushNotifications";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { STATIONS } from "@/stationNames";

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
  const MOCK_TRAINS = [
    { id: "TRN12", number: "EC393", destination: "Hamborg", status: "on-time" },
    { id: "TRN33", number: "33", destination: "Copenhagen", status: "delayed" },
    { id: "TRN7", number: "7", destination: "Aarhus", status: "on-time" },
    { id: "TRN101", number: "101", destination: "Aalborg", status: "delayed" },
  ];
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
      const serverTrains = userSub.trains || [];
      setSelectedStations(Array.isArray(serverStations) ? serverStations : []);
      setStations(
        Array.isArray(serverStations) ? serverStations.join(", ") : "",
      );
      setTrains(Array.isArray(serverTrains) ? serverTrains.join(", ") : "");
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
        <small className="help">Comma-separated IDs — e.g. STN123, TRN12</small>

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

        <div className="mt-3">
          <label className="mb-1 block text-sm text-(--muted)">Trains</label>

          <div className="relative" ref={trainsRef}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-transparent bg-[#0b1221] px-3 py-2 text-left hover:border-gray-700"
              onClick={() => setTrainsOpen((v) => !v)}
            >
              <div className="flex flex-wrap gap-2">
                {selectedTrains.length === 0 ? (
                  <span className="text-sm text-(--muted)">
                    Select trains...
                  </span>
                ) : (
                  selectedTrains.map((id) => {
                    const t = MOCK_TRAINS.find((x) => x.id === id);
                    return (
                      <span
                        key={id}
                        className="cursor-pointer rounded-full border border-gray-700 bg-[#0f1724] px-2 py-1 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrains((s) => s.filter((v) => v !== id));
                        }}
                      >
                        {t ? `${t.number} • ${t.destination}` : id}
                      </span>
                    );
                  })
                )}
              </div>
              <svg
                className="ml-2 h-4 w-4 text-(--muted)"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M6 8l4 4 4-4"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {trainsOpen && (
              <div className="absolute z-20 mt-2 max-h-48 w-full overflow-auto rounded-md border border-gray-700 bg-[#0f1724] shadow-lg">
                <ul>
                  {MOCK_TRAINS.map((t) => (
                    <li
                      key={t.id}
                      className="cursor-pointer px-3 py-2 hover:bg-gray-800"
                      onClick={() => {
                        setSelectedTrains((s) =>
                          s.includes(t.id)
                            ? s.filter((v) => v !== t.id)
                            : [...s, t.id],
                        );
                      }}
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">{t.number}</div>
                          <div className="text-sm text-(--muted)">
                            {t.destination}
                          </div>
                        </div>

                        <div className="text-sm">
                          {t.status === "delayed" ? (
                            <span className="font-medium text-yellow-400">
                              forsinket
                            </span>
                          ) : (
                            <span className="font-medium text-green-400">
                              til tiden
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
