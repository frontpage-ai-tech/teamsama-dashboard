import outlines from "./telangana-districts.json";

// Outlines come from the hotspot map on telangana.gov.in/about/districts.
// Sheet spellings that differ from the names used there.
const ALIASES: Record<string, string> = {
  narayanpet: "naryanpet",
  yadadribhongiri: "yadadribhuvanagiri",
};

const normalize = (name: string) => {
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  return ALIASES[key] ?? key;
};

const outlineByKey = new Map(outlines.map((o) => [normalize(o.name), o]));

// Vertical label shifts (map units) that keep Hyderabad's label and its
// northern neighbour's from landing on each other.
const LABEL_NUDGE: Record<string, number> = {
  medchalmalkajgiri: -18,
  hyderabad: 10,
};

export function hasOutline(district: string) {
  return outlineByKey.has(normalize(district));
}

export default function DistrictMap({
  districts,
  selected,
  onSelect,
}: {
  districts: { district: string; count: number }[];
  selected: string | null;
  onSelect: (district: string) => void;
}) {
  const shown = districts
    .flatMap(({ district, count }) => {
      const outline = outlineByKey.get(normalize(district));
      return outline ? [{ district, count, outline }] : [];
    })
    // Draw the selected district last so its border sits on top.
    .sort((a, b) => +(a.district === selected) - +(b.district === selected));
  if (shown.length === 0) return null;

  const xs: number[] = [];
  const ys: number[] = [];
  for (const { outline } of shown) {
    for (const point of outline.points.split(" ")) {
      const [x, y] = point.split(",").map(Number);
      xs.push(x);
      ys.push(y);
    }
  }
  const pad = 20;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) + pad - minX;
  const height = Math.max(...ys) + pad - minY;

  const maxCount = Math.max(...shown.map((d) => d.count));

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      role="group"
      aria-label="Districts with submitted applications"
      className="w-full"
    >
      {shown.map(({ district, count, outline }) => {
        // Square-root scale so small districts stay visible next to the largest.
        const strength = Math.sqrt(count / maxCount);
        const isSelected = selected === district;
        return (
          <g
            key={district}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${district}: ${count}`}
            onClick={() => onSelect(district)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(district);
              }
            }}
            className="cursor-pointer outline-none"
          >
            <title>{`${district}: ${count}`}</title>
            <polygon
              points={outline.points}
              fill="#2563eb"
              fillOpacity={0.15 + 0.75 * strength}
              stroke={isSelected ? "#000" : "#fff"}
              strokeWidth={isSelected ? 1 : 3}
              strokeLinejoin="round"
            />
          </g>
        );
      })}
      {/* Labels go in a second pass so neighbouring districts can't cover them. */}
      {shown.map(({ district, count, outline }) => {
        const words = district.split(" ");
        const fontSize = 22;
        const lineHeight = fontSize * 1.1;
        const countSize = fontSize * 1.35;
        const top =
          outline.cy +
          (LABEL_NUDGE[normalize(district)] ?? 0) -
          (words.length * lineHeight + countSize) / 2 +
          fontSize * 0.8;
        return (
          // Dark text with a white halo stays readable on any shade, and
          // where it spills over a border.
          <text
            key={district}
            textAnchor="middle"
            fontSize={fontSize}
            fill="#111"
            stroke="#fff"
            strokeWidth={5}
            strokeLinejoin="round"
            paintOrder="stroke"
            pointerEvents="none"
            aria-hidden
          >
            {words.map((word, i) => (
              <tspan key={i} x={outline.cx} y={top + i * lineHeight}>
                {word}
              </tspan>
            ))}
            <tspan
              x={outline.cx}
              y={top + (words.length - 1) * lineHeight + countSize}
              fontSize={countSize}
              fontWeight={600}
            >
              {count}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
