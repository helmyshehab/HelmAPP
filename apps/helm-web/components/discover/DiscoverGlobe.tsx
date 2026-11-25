"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import {
  fetchAllGlobeDestinations,
  type GlobeDestination,
} from "@/lib/destinations/globe-destinations";

const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="globe-canvas-fallback" aria-hidden="true">
      Loading globe…
    </div>
  ),
});

type DiscoverGlobeProps = {
  locale?: string;
};

type LoadState = "loading" | "ready" | "empty" | "unavailable";

const EARTH_TEXTURE = "/globe/earth-blue-marble.jpg";
const POINT_COLOR = "#177F83";
const POINT_SELECTED_COLOR = "#F1A38D";
const LABEL_COLOR = "#F7F5F0";
const ATMOSPHERE = "#177F83";
const POINT_ALTITUDE = 0.06;
const POINT_ALTITUDE_SELECTED = 0.1;
const POINT_RADIUS = 0.8;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function destinationHref(destination: GlobeDestination): string {
  return `/destinations/${encodeURIComponent(destination.slug)}`;
}

export function DiscoverGlobe({ locale: _locale = "en" }: DiscoverGlobeProps) {
  const router = useRouter();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [destinations, setDestinations] = useState<GlobeDestination[]>([]);
  const [size, setSize] = useState({ width: 640, height: 420 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [globeFailed, setGlobeFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoRotatePaused, setAutoRotatePaused] = useState(false);

  const openDestination = useCallback(
    (destination: GlobeDestination) => {
      router.push(destinationHref(destination));
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    setReduceMotion(prefersReducedMotion());

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => setReduceMotion(media.matches);
    media.addEventListener("change", onMotionChange);

    void (async () => {
      try {
        const items = await fetchAllGlobeDestinations();
        if (cancelled) return;
        setDestinations(items);
        setLoadState(items.length === 0 ? "empty" : "ready");
      } catch {
        if (cancelled) return;
        setLoadState("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      media.removeEventListener("change", onMotionChange);
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const width = Math.max(280, Math.floor(node.clientWidth));
      const height = Math.min(520, Math.max(300, Math.round(width * 0.62)));
      setSize({ width, height });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadState]);

  const configureControls = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    try {
      const controls = globe.controls();
      // Keep page scroll usable; rotate via drag only.
      controls.enableZoom = false;
      controls.autoRotate = !reduceMotion && !autoRotatePaused;
      controls.autoRotateSpeed = 0.35;
    } catch {
      setGlobeFailed(true);
    }
  }, [reduceMotion, autoRotatePaused]);

  useEffect(() => {
    configureControls();
  }, [configureControls, size]);

  const handleGlobeReady = useCallback(() => {
    configureControls();
    const first = destinations[0];
    const globe = globeRef.current;
    if (!first || !globe) return;
    globe.pointOfView(
      { lat: first.latitude, lng: first.longitude, altitude: 2 },
      0,
    );
  }, [configureControls, destinations]);

  const focusDestination = useCallback(
    (destination: GlobeDestination) => {
      setSelectedId(destination.id);
      setAutoRotatePaused(true);
      const globe = globeRef.current;
      if (!globe) return;
      try {
        globe.controls().autoRotate = false;
      } catch {
        // Controls may be unavailable; POV still runs below.
      }
      globe.pointOfView(
        {
          lat: destination.latitude,
          lng: destination.longitude,
          altitude: 2,
        },
        reduceMotion ? 0 : 1000,
      );
    },
    [reduceMotion],
  );

  if (loadState === "unavailable" || globeFailed) {
    return (
      <section
        className="discover-globe-section"
        aria-labelledby="discover-globe-heading"
      >
        <h2 id="discover-globe-heading" className="section-label">
          Interactive globe
        </h2>
        <p className="globe-status" role="status">
          The interactive globe is unavailable right now. Search and browsing
          below still work.
        </p>
      </section>
    );
  }

  if (loadState === "empty") {
    return null;
  }

  if (loadState === "loading") {
    return (
      <section
        className="discover-globe-section"
        aria-labelledby="discover-globe-heading"
      >
        <h2 id="discover-globe-heading" className="section-label">
          Interactive globe
        </h2>
        <p className="globe-status" role="status">
          Loading destinations for the globe…
        </p>
      </section>
    );
  }

  return (
    <section
      className="discover-globe-section"
      aria-labelledby="discover-globe-heading"
    >
      <h2 id="discover-globe-heading" className="section-label">
        Interactive globe
      </h2>
      <p className="globe-lede">
        Explore published destinations on the globe. Use the list below if the
        globe is hard to use.
      </p>

      <label className="globe-a11y-picker">
        <span className="globe-a11y-picker-label">Select a destination</span>
        <select
          className="globe-a11y-select"
          value={selectedId ?? ""}
          onChange={(event) => {
            const next = destinations.find(
              (item) => item.id === event.target.value,
            );
            if (!next) return;
            focusDestination(next);
          }}
        >
          <option value="">Choose a destination…</option>
          {destinations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nameEn}
            </option>
          ))}
        </select>
      </label>

      <div className="globe-stage" ref={containerRef}>
        {/*
          Zoom stays disabled via configureControls so wheel can scroll the page
          while the pointer is over the globe. Do not stopPropagation on wheel.
        */}
        <div className="globe-canvas-shell">
          <GlobeCanvas
            globeRef={globeRef}
            width={size.width}
            height={size.height}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl={EARTH_TEXTURE}
            atmosphereColor={ATMOSPHERE}
            atmosphereAltitude={0.18}
            animateIn={!reduceMotion}
            pointsData={destinations}
            pointLat="latitude"
            pointLng="longitude"
            pointAltitude={(point) =>
              (point as GlobeDestination).id === selectedId
                ? POINT_ALTITUDE_SELECTED
                : POINT_ALTITUDE
            }
            pointRadius={POINT_RADIUS}
            pointColor={(point) =>
              (point as GlobeDestination).id === selectedId
                ? POINT_SELECTED_COLOR
                : POINT_COLOR
            }
            onPointClick={(point) => {
              openDestination(point as GlobeDestination);
            }}
            labelsData={destinations}
            labelLat="latitude"
            labelLng="longitude"
            labelText="nameEn"
            labelColor={() => LABEL_COLOR}
            labelAltitude={0.018}
            labelSize={1.4}
            labelIncludeDot={false}
            onLabelClick={(label) => {
              openDestination(label as GlobeDestination);
            }}
            onGlobeReady={handleGlobeReady}
          />
        </div>
      </div>
    </section>
  );
}
