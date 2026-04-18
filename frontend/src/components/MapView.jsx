import React, { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CATEGORY_COLORS } from '../services/api';
import { reverseGeocode } from '../utils/geoUtils';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createMarkerIcon = (category, intensity) => {
  const color = CATEGORY_COLORS[category] || '#3B82F6';
  const size = Math.max(10, Math.min(24, 8 + intensity * 1.6));
  const pulseSize = size * 2.5;

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${pulseSize}px;height:${pulseSize}px;display:flex;align-items:center;justify-content:center;">
        <div style="
          position:absolute;
          width:${pulseSize}px;height:${pulseSize}px;
          border-radius:50%;
          background:${color};
          opacity:0.2;
          animation:marker-ping 2s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
        <div style="
          position:absolute;
          width:${size}px;height:${size}px;
          border-radius:50%;
          background:${color};
          box-shadow:0 0 12px ${color}aa, 0 0 4px ${color}60;
          cursor:pointer;
          z-index:2;
          transition:transform 0.2s;
        " onmouseover="this.style.transform='scale(1.4)'" onmouseout="this.style.transform='scale(1)'"></div>
      </div>
    `,
    iconSize: [pulseSize, pulseSize],
    iconAnchor: [pulseSize / 2, pulseSize / 2],
  });
};

const markersLayerRef = { current: null };

const EventMarkers = ({ events, onEventClick, onCountryClick }) => {
  const map = useMap();

  const handleMarkerClick = useCallback((event) => {
    onEventClick(event);
  }, [onEventClick]);

  useEffect(() => {
    // Remove old layer group
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
    }

    // Create a new layer group
    const layerGroup = L.layerGroup();

    events.forEach((event) => {
      if (!event.location || typeof event.location.lat !== 'number' || typeof event.location.lng !== 'number') return;

      const icon = createMarkerIcon(event.category, event.intensity);
      const marker = L.marker([event.location.lat, event.location.lng], { icon });

      marker.on('click', () => handleMarkerClick(event));

      const color = CATEGORY_COLORS[event.category] || '#3B82F6';
      marker.bindTooltip(
        `<div style="background:#101217;color:#fff;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);font-family:'IBM Plex Sans',sans-serif;width:max-content;max-width:380px;word-wrap:break-word;white-space:normal;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:${color};margin-bottom:4px;">${event.category}</div>
          <div style="font-size:12px;font-weight:500;line-height:1.4;">${event.title}</div>
          <div style="font-size:10px;color:#94A3B8;margin-top:6px;">${event.country}</div>
        </div>`,
        {
          direction: 'top',
          offset: [0, -10],
          className: 'custom-tooltip',
          opacity: 1,
        }
      );

      layerGroup.addLayer(marker);
    });

    layerGroup.addTo(map);
    markersLayerRef.current = layerGroup;

    return () => {
      if (markersLayerRef.current) {
        map.removeLayer(markersLayerRef.current);
      }
    };
  }, [events, map, handleMarkerClick]);

  return null;
};

const MapClickHandler = ({ onCountryClick }) => {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = async (e) => {
      const { lat, lng } = e.latlng;
      // Try async reverse geocoding first
      const location = await reverseGeocode(lat, lng);
      if (location && location.displayName !== 'Unknown Location' && onCountryClick) {
        onCountryClick({ name: location.country || location.displayName, lat, lng, city: location.city, state: location.state, country: location.country, displayName: location.displayName });
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onCountryClick]);

  return null;
};

const MapController = ({ selectedEvent }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedEvent && selectedEvent.location && typeof selectedEvent.location.lat === 'number') {
      map.flyTo([selectedEvent.location.lat, selectedEvent.location.lng], 5, {
        duration: 1.5,
      });
    }
  }, [selectedEvent, map]);
  return null;
};

export default function MapView({ events, onEventClick, onCountryClick, selectedEvent }) {
  return (
    <div data-testid="map-container" className="absolute inset-0 z-0">
      <style>{`
        @keyframes marker-ping {
          0% { transform: scale(0.5); opacity: 0.3; }
          70% { transform: scale(1); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .custom-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-tooltip .leaflet-tooltip-arrow { display: none; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
      <MapContainer
        center={[20, 10]}
        zoom={2}
        minZoom={2}
        maxZoom={10}
        style={{ height: '100vh', width: '100vw' }}
        zoomControl={false}
        attributionControl={false}
        worldCopyJump={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution=""
          pane="overlayPane"
        />
        <MapController selectedEvent={selectedEvent} />
        <MapClickHandler onCountryClick={onCountryClick} />
        <EventMarkers events={events} onEventClick={onEventClick} onCountryClick={onCountryClick} />
      </MapContainer>
    </div>
  );
}