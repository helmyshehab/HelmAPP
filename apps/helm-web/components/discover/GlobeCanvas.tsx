"use client";

import Globe, { type GlobeMethods, type GlobeProps } from "react-globe.gl";

type GlobeCanvasProps = GlobeProps & {
  globeRef?: React.MutableRefObject<GlobeMethods | undefined>;
};

/** Client-only wrapper so Next can dynamic-import with `ssr: false`. */
export default function GlobeCanvas({ globeRef, ...props }: GlobeCanvasProps) {
  // react-globe.gl types refs as MutableRefObject, not React.Ref.
  return <Globe ref={globeRef} {...props} />;
}
