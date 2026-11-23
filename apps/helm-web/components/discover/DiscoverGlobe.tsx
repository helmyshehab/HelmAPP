"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GlobeMethods } from "react-globe.gl";
import {
  fetchAllGlobeDestinations,
  type GlobeDestination,
} from "@/lib/destinations/globe-destinations";
import { GlobePreview } from "./GlobePreview";

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
const ATMOSPHERE = "#177F83";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DiscoverGlobe({ locale = "en" }: DiscoverGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [destinations, setDestinations] = useState<GlobeDestination[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState({ width: 640, height: 420 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [globeFailed, setGlobeFailed] = useState(false);

  const selected = useMemo(
    () => destinations.find((item) => item.id === selectedId) ?? null,
    [destinations, selectedId],
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
      controls.autoRotate = !reduceMotion;
      controls.autoRotateSpeed = 0.35;
    } catch {
      setGlobeFailed(true);
    }
  }, [reduceMotion]);

  useEffect(() => {
    configureControls();
  }, [configureControls, size]);

  const selectDestination = useCallback(
    (destination: GlobeDestination, keepExpanded: boolean) => {
      setSelectedId(destination.id);
      setExpanded(keepExpanded);
      const globe = globeRef.current;
      if (!globe) return;
      const duration = reduceMotion ? 0 : 800;
      try {
        globe.pointOfView(
          {
            lat: destination.latitude,
            lng: destination.longitude,
            altitude: 1.85,
          },
          duration,
        );
      } catch {
        // Point-of-view is progressive enhancement.
      }
    },
    [reduceMotion],
  );

  const closePreview = useCallback(() => {
    setSelectedId(null);
    setExpanded(false);
  }, []);

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
            if (!next) {
              closePreview();
              return;
            }
            selectDestination(next, expanded);
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
            pointAltitude={0.012}
            pointRadius={0.45}
            pointColor={() => POINT_COLOR}
            pointLabel={(point) => (point as GlobeDestination).nameEn}
            onGlobeReady={configureControls}
            onPointClick={(point) => {
              selectDestination(point as GlobeDestination, expanded);
            }}
          />
        </div>

        {selected ? (
          <GlobePreview
            destination={selected}
            expanded={expanded}
            locale={locale}
            onExpand={() => setExpanded(true)}
            onCollapse={() => setExpanded(false)}
            onClose={closePreview}
          />
        ) : null}
      </div>
    </section>
  );
}
