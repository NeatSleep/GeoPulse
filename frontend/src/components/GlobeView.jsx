import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { CATEGORY_COLORS } from '../services/api';
import { reverseGeocode } from '../utils/geoUtils';

export default function GlobeView({ events, onEventClick, onCountryClick, selectedEvent }) {
  const globeRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.3;
      globeRef.current.pointOfView({ altitude: 2.5 }, 0);
    }
  }, []);

  useEffect(() => {
    if (selectedEvent && selectedEvent.location && typeof selectedEvent.location.lat === 'number' && globeRef.current) {
      // Temporarily pause autorotate to zoom in
      const controls = globeRef.current.controls();
      const prevRotate = controls.autoRotate;
      controls.autoRotate = false;
      
      globeRef.current.pointOfView({ 
        lat: selectedEvent.location.lat, 
        lng: selectedEvent.location.lng, 
        altitude: 0.8 
      }, 1000);

      // Optionally resume after animation...
      setTimeout(() => {
        if (controls) controls.autoRotate = prevRotate;
      }, 3000);
    }
  }, [selectedEvent]);

  const pointsData = useMemo(() => {
    return events
      .filter(e => e.location && typeof e.location.lat === 'number' && typeof e.location.lng === 'number')
      .map(e => ({
        lat: e.location.lat,
        lng: e.location.lng,
        size: Math.max(0.15, (e.intensity || 5) * 0.06),
        color: CATEGORY_COLORS[e.category] || '#3B82F6',
        label: e.title,
        event: e,
      }));
  }, [events]);

  const ringsData = useMemo(() => {
    return events
      .filter(e => e.location && typeof e.location.lat === 'number' && typeof e.location.lng === 'number' && (e.intensity || 0) >= 4)
      .map(e => ({
        lat: e.location.lat,
        lng: e.location.lng,
        maxR: 3,
        propagationSpeed: 2,
        repeatPeriod: 1200,
        color: () => CATEGORY_COLORS[e.category] || '#3B82F6',
      }));
  }, [events]);

  const handlePointClick = useCallback((point) => {
    if (point && point.event) {
      if (onEventClick) {
        onEventClick(point.event);
      }
      // Also trigger country click to show location news modal
      if (onCountryClick && point.event.country) {
        onCountryClick(point.event.country);
      }
    }
  }, [onEventClick, onCountryClick]);

  const handleGlobeClick = useCallback(async (lat, lng) => {
    // Use reverse geocoding to get the location name
    if (typeof lat === 'number' && typeof lng === 'number') {
      console.log('Reverse geocoding for:', { lat, lng });
      const location = await reverseGeocode(lat, lng);
      console.log('Geocoding result:', location);
      if (location && location !== 'Unknown Location' && onCountryClick) {
        onCountryClick(location);
      if (location && location.displayName !== 'Unknown Location' && onCountryClick) {
        onCountryClick({ name: location.country || location.displayName, lat, lng, city: location.city, state: location.state, country: location.country, displayName: location.displayName });
      }
    }
  }, [onCountryClick]);

  useEffect(() => {
    if (!globeRef.current || !containerRef.current) return;

    const handleCanvasClick = async (event) => {
      // Get canvas from DOM container
      const canvas = containerRef.current.querySelector('canvas');
      if (!canvas) {
        console.warn('Canvas not available');
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Get globe instance
      const globe = globeRef.current;

      try {
        // Get camera and raycaster from three.js scene
        const scene = globe.scene();
        const camera = globe.camera();

        if (!scene || !camera) {
          console.warn('Scene or camera not available');
          return;
        }

        // Create raycaster for intersection detection
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Normalize mouse coordinates to [-1, 1] range
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;
        mouse.x = (x / canvasWidth) * 2 - 1;
        mouse.y = -(y / canvasHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Get all objects in scene
        const point = new THREE.Vector3();
        point.setFromMatrixPosition(scene.matrixWorld);

        // Find the globe object (usually a mesh)
        let globeObject = null;
        scene.traverse((obj) => {
          if (obj.isMesh && obj.name === '' && !obj.parent?.name?.includes('points')) {
            globeObject = obj;
          }
        });

        if (!globeObject) {
          // Fallback: use first mesh that's likely the globe
          scene.traverse((obj) => {
            if (obj.isMesh && !globeObject && obj.geometry) {
              globeObject = obj;
            }
          });
        }

        if (globeObject) {
          const intersects = raycaster.intersectObject(globeObject, true);
          if (intersects.length > 0) {
            const intersection = intersects[0];
            const point = intersection.point.normalize();

            // Convert 3D point to lat/lng
            const lat = Math.asin(point.y) * (180 / Math.PI);
            const lng = Math.atan2(point.x, point.z) * (180 / Math.PI);

            console.log('Globe clicked at:', { lat, lng });
            await handleGlobeClick(lat, lng);
          }
        }
      } catch (err) {
        console.warn('Globe click detection error:', err);
      }
    };

    // Add click listener to canvas
    const canvas = containerRef.current.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      return () => {
        canvas.removeEventListener('click', handleCanvasClick);
      };
    }
  }, [handleGlobeClick]);

  return (
    <div ref={containerRef} data-testid="globe-container" className="absolute inset-0 z-0" style={{ background: '#0A0B0E' }}>
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl=""
        backgroundColor="#0A0B0E"
        atmosphereColor="#3B82F6"
        atmosphereAltitude={0.15}
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude="size"
        pointRadius={0.4}
        pointsMerge={false}
        onPointClick={handlePointClick}
        pointLabel={(d) => `
          <div style="background:rgba(10,11,14,0.95);backdrop-filter:blur(12px);color:#fff;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);font-family:'IBM Plex Sans',sans-serif;width:max-content;max-width:380px;word-wrap:break-word;white-space:normal;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:${d.color};margin-bottom:4px;">${d.event.category}</div>
            <div style="font-size:12px;font-weight:500;line-height:1.4;">${d.label}</div>
            <div style="font-size:10px;color:#94A3B8;margin-top:6px;">${d.event.country}</div>
          </div>
        `}
        ringsData={ringsData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        width={window.innerWidth}
        height={window.innerHeight}
      />
      {/* Transparent overlay to capture clicks */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{
          zIndex: 1,
          pointerEvents: 'none',
        }}
        id="globe-click-overlay"
      />
    </div>
  );
}
