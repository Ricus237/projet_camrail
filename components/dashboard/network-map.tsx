"use client";

import { MapContainer, Polyline, Popup, CircleMarker } from "react-leaflet";
import type { NetworkLink, Site } from "@/lib/local-db";

type NetworkMapProps = {
  sites: Site[];
  links: NetworkLink[];
  className?: string;
};

const statusColors = {
  Operational: "#16a34a",
  Maintenance: "#e11d48",
  Alert: "#f59e0b",
  Planned: "#64748b",
};

const linkColors = {
  Active: "#e30613",
  Alert: "#f59e0b",
  Planned: "#64748b",
  Maintenance: "#e11d48",
};

export function NetworkMap({ sites, links, className }: NetworkMapProps) {
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const center = sites.length
    ? averageCenter(sites)
    : ([4.0511, 9.7085] as [number, number]);

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={6}
        minZoom={5}
        maxZoom={10}
        attributionControl={false}
        className="h-full w-full camrail-map"
      >
        {links.map((link) => {
          const siteA = siteById.get(link.siteAId);
          const siteB = siteById.get(link.siteBId);

          if (!siteA || !siteB) {
            return null;
          }

          return (
            <Polyline
              key={link.id}
              positions={[
                [siteA.latitude, siteA.longitude],
                [siteB.latitude, siteB.longitude],
              ]}
              pathOptions={{
                color: linkColors[link.status],
                weight: 3,
                opacity: 0.78,
              }}
            >
              <Popup>
                <strong>{link.id}</strong>
                <br />
                {link.siteAName} - {link.siteBName}
                <br />
                {link.frequencyGhz} GHz | {link.rslDbm.toFixed(1)} dBm
              </Popup>
            </Polyline>
          );
        })}

        {sites.map((site) => (
          <CircleMarker
            key={site.id}
            center={[site.latitude, site.longitude]}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: statusColors[site.status],
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <strong>{site.name}</strong>
              <br />
              {site.region}
              <br />
              {site.towerType} | {site.towerHeightM}m
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

function averageCenter(sites: Site[]): [number, number] {
  const total = sites.reduce(
    (acc, site) => ({
      latitude: acc.latitude + site.latitude,
      longitude: acc.longitude + site.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return [total.latitude / sites.length, total.longitude / sites.length];
}
