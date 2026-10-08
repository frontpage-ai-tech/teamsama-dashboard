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

// Districts too small for a label inside the shape: the label is placed at
// this point (map units), to the east of both, with a line back to the district.
const CALLOUTS: Record<string, { x: number; y: number }> = {
  medchalmalkajgiri: { x: 850, y: 1050 },
  hyderabad: { x: 850, y: 1150 },
};
const CALLOUT_WIDTH = 240;

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
  // Keep callout labels inside the viewBox.
  for (const { district } of shown) {
    const callout = CALLOUTS[normalize(district)];
    if (callout) {
      xs.push(callout.x + CALLOUT_WIDTH);
      ys.push(callout.y - 40, callout.y + 40);
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
        const callout = CALLOUTS[normalize(district)];
        if (callout) {
          return (
            <g key={district} pointerEvents="none" aria-hidden>
              <line
                x1={callout.x - 10}
                y1={callout.y}
                x2={outline.cx}
                y2={outline.cy}
                stroke="#111"
                strokeWidth={1.5}
              />
              <circle cx={outline.cx} cy={outline.cy} r={5} fill="#111" />
              <text fontSize={fontSize} fill="#111">
                <tspan x={callout.x} y={callout.y - 6}>
                  {district}
                </tspan>
                <tspan
                  x={callout.x}
                  y={callout.y - 6 + countSize}
                  fontSize={countSize}
                  fontWeight={600}
                >
                  {count}
                </tspan>
              </text>
            </g>
          );
        }
        const top =
          outline.cy -
          (words.length * lineHeight + countSize) / 2 +
          fontSize * 0.8;
        return (
          <text
            key={district}
            textAnchor="middle"
            fontSize={fontSize}
            fill="#111"
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
