"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface MapLead {
  id: number;
  name: string;
  lat: number | null;
  lon: number | null;
  score: number | null;
  stage: string;
}

function FitTo({ center }: { center: [number, number] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!done.current) {
      map.setView(center, 14);
      done.current = true;
    }
  }, [center, map]);
  return null;
}

/** Leads drop onto the map one by one (a short stagger as each new lead arrives). */
export default function LeadMap({
  center,
  leads,
  selected,
  onSelect,
}: {
  center: [number, number];
  leads: MapLead[];
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  const [shown, setShown] = useState<Set<number>>(new Set());
  useEffect(() => {
    const pending = leads.filter((l) => !shown.has(l.id) && l.lat !== null);
    if (!pending.length) return;
    const t = setTimeout(() => setShown((s) => new Set(s).add(pending[0].id)), 120);
    return () => clearTimeout(t);
  }, [leads, shown]);

  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full rounded-xl" attributionControl>
      <FitTo center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {leads
        .filter((l) => shown.has(l.id) && l.lat !== null && l.lon !== null)
        .map((l) => {
          const active = l.id === selected;
          const color = l.stage === "interested" ? "#2f7d4f" : "#d9381e";
          return (
            <CircleMarker
              key={l.id}
              center={[l.lat!, l.lon!]}
              radius={active ? 11 : 7}
              pathOptions={{ color: active ? "#14110f" : color, weight: active ? 3 : 1.5, fillColor: color, fillOpacity: 0.85 }}
              eventHandlers={{ click: () => onSelect(l.id) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {l.name} · {l.score ?? "–"}
              </Tooltip>
            </CircleMarker>
          );
        })}
    </MapContainer>
  );
}
