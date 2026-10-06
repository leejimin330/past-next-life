"use client";

import { memo, useMemo } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "@/data/world-110m.json";
import type { LatLng } from "@/lib/types";
import styles from "./WorldMap.module.css";

const WIDTH = 960;
const HEIGHT = 468;

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const countries = feature(topo, topo.objects.countries).features;
const projection = geoEqualEarth().fitExtent(
  [
    [4, 4],
    [WIDTH - 4, HEIGHT - 4],
  ],
  { type: "Sphere" },
);
const path = geoPath(projection);
const spherePath = path({ type: "Sphere" }) ?? "";

// 경로 문자열은 한 번만 계산한다.
const SHAPES = countries.map((f, i) => ({ key: `${f.id ?? "x"}-${i}`, iso3: f.id as string | undefined, d: path(f) ?? "" }));
export const MAP_ISO3 = [...new Set(SHAPES.map((s) => s.iso3).filter(Boolean))] as string[];

const Land = memo(function Land({
  strong,
  soft,
  flash,
}: {
  strong: ReadonlySet<string>;
  soft: ReadonlySet<string>;
  flash: ReadonlySet<string>;
}) {
  return (
    <g>
      {SHAPES.map((s) => {
        const cls = s.iso3
          ? flash.has(s.iso3)
            ? styles.flash
            : strong.has(s.iso3)
              ? styles.strong
              : soft.has(s.iso3)
                ? styles.soft
                : styles.land
          : styles.land;
        return <path key={s.key} d={s.d} className={cls} />;
      })}
    </g>
  );
});

export interface WorldMapProps {
  strong?: string[];
  soft?: string[];
  flash?: string[];
  pin?: LatLng | null;
  pinLabel?: string;
  variant?: "human" | "animal";
  className?: string;
}

const EMPTY: string[] = [];

export function WorldMap({
  strong = EMPTY,
  soft = EMPTY,
  flash = EMPTY,
  pin,
  pinLabel,
  variant = "human",
  className,
}: WorldMapProps) {
  const point = pin ? projection([pin[1], pin[0]]) : null;
  const labelLeft = point ? point[0] > WIDTH * 0.72 : false;
  const strongSet = useMemo(() => new Set(strong), [strong]);
  const softSet = useMemo(() => new Set(soft), [soft]);
  const flashSet = useMemo(() => new Set(flash), [flash]);

  return (
    <>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={`${styles.map} ${styles[variant]} ${className ?? ""}`}
        role="img"
        aria-label={pinLabel ? `세계지도: ${pinLabel}` : "세계지도"}
      >
        <path d={spherePath} className={styles.sphere} />
        <Land strong={strongSet} soft={softSet} flash={flashSet} />
        {point && (
          <g transform={`translate(${point[0]} ${point[1]})`} className={styles.pin}>
            <circle r="22" className={styles.pulse} />
            <circle r="9" className={styles.dot} />
            {pinLabel && (
              <text
                x={labelLeft ? -14 : 14}
                y="5"
                textAnchor={labelLeft ? "end" : "start"}
                className={styles.label}
              >
                {pinLabel}
              </text>
            )}
          </g>
        )}
      </svg>
      {point && pinLabel && <p className={styles.caption}>📍 {pinLabel}</p>}
    </>
  );
}
