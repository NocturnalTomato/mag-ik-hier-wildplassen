"use client";

import { useState } from "react";
import type { CheckResponse } from "./api/check/route";

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [manualInput, setManualInput] = useState("");

  async function checkLatLon(lat: number, lon: number) {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/check?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("Serverfout");
      const data: CheckResponse = await res.json();
      setResult(data);
      setStatus("done");
    } catch (e) {
      setErrorMsg("Kon geen antwoord ophalen. Probeer het nog eens.");
      setStatus("error");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setErrorMsg("Je browser ondersteunt geen locatiebepaling.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => checkLatLon(pos.coords.latitude, pos.coords.longitude),
      () => {
        setErrorMsg(
          "Kon je locatie niet ophalen. Geef toestemming, of typ je adres hieronder."
        );
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const geoRes = await fetch(
        `/api/geocode?q=${encodeURIComponent(manualInput)}`
      );
      if (!geoRes.ok) throw new Error("Adres niet gevonden");
      const geo = await geoRes.json();
      if (!geo?.lat || !geo?.lon) throw new Error("Adres niet gevonden");
      await checkLatLon(geo.lat, geo.lon);
    } catch {
      setErrorMsg("Kon dit adres niet vinden. Probeer een preciezer adres.");
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.25rem",
        textAlign: "center",
        gap: "2rem",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2rem, 9vw, 4.5rem)",
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        MAG IK HIER
        <br />
        WILDPLASSEN
      </h1>

      {status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", maxWidth: 380 }}>
          <button
            onClick={useMyLocation}
            style={{
              padding: "1rem 1.5rem",
              fontSize: "1.15rem",
              fontWeight: 700,
              borderRadius: 999,
              border: "none",
              background: "#f5f5f5",
              color: "#0b0b0c",
              cursor: "pointer",
            }}
          >
            📍 Gebruik mijn locatie
          </button>

          <form onSubmit={submitManual} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="of typ een adres / plaats"
              style={{
                flex: 1,
                padding: "0.85rem 1rem",
                borderRadius: 999,
                border: "1px solid #444",
                background: "transparent",
                color: "#f5f5f5",
                fontSize: "1rem",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0.85rem 1.25rem",
                borderRadius: 999,
                border: "1px solid #444",
                background: "transparent",
                color: "#f5f5f5",
                cursor: "pointer",
              }}
            >
              Check
            </button>
          </form>
        </div>
      )}

      {status === "loading" && <p style={{ opacity: 0.7 }}>Even checken…</p>}

      {status === "error" && (
        <div>
          <p style={{ color: "#ff8080" }}>{errorMsg}</p>
          <button onClick={reset} style={linkButtonStyle}>
            Opnieuw proberen
          </button>
        </div>
      )}

      {status === "done" && result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 420 }}>
          <div
            style={{
              fontSize: "clamp(3rem, 20vw, 6rem)",
              fontWeight: 900,
              color: result.magHet ? "#5ee68a" : "#ff5c5c",
            }}
          >
            {result.magHet ? "JA" : "NEE"}
          </div>
          <p style={{ fontSize: "1.05rem", opacity: 0.9, margin: 0 }}>
            {result.uitleg}
          </p>
          {result.gemeente && (
            <p style={{ fontSize: "0.85rem", opacity: 0.6, margin: 0 }}>
              📍 {result.plaatsnaam ?? result.gemeente}
              {result.zekerheid !== "hoog" && " · lage zekerheid"}
            </p>
          )}
          <button onClick={reset} style={linkButtonStyle}>
            Andere locatie checken
          </button>
        </div>
      )}

      <p style={{ fontSize: "0.75rem", opacity: 0.4, maxWidth: 380 }}>
        Geen juridisch advies. Gebaseerd op landelijke bebouwde-kom-data en
        een groeiende lijst gemeentelijke uitzonderingen — niet elke gemeente
        is (nog) geverifieerd.
      </p>
    </main>
  );
}

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#9fd8ff",
  textDecoration: "underline",
  cursor: "pointer",
  fontSize: "0.9rem",
};
