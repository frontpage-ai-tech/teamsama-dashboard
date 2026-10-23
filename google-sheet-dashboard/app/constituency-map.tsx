import outlines from "./telangana-constituencies.json";

// Outlines and names come from the constituency map on andhrajyothy.com.
// Sheet spellings that differ from the names used there.
const ALIASES: Record<string, string> = {
  lbnagar: "lalbahadurnagar",
  secunderabadcantt: "secunderabadcantonment",
  devarakadra: "devarkadra",
  mahabubnagar: "mahbubnagar",
  ghanpur: "ghanpurstation",
  huzuranagar: "huzurnagar",
};

const normalize = (name: string) => {
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  return ALIASES[key] ?? key;
};

const outlineByKey = new Map(
  outlines.map((outline) => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const point of outline.points.split(" ")) {
      const [x, y] = point.split(",").map(Number);
      xs.push(x);
      ys.push(y);
    }
    const box = {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
    return [normalize(outline.name), { ...outline, box }] as const;
  }),
);

export function hasConstituencyOutline(constituency: string) {
  return outlineByKey.has(normalize(constituency));
}

export default function ConstituencyMap({
  constituencies,
  selected,
  onSelect,
}: {
  constituencies: { constituency: string; count: number }[];
  selected: string | null;
  onSelect: (constituency: string) => void;
}) {
  const shown = constituencies
    .flatMap(({ constituency, count }) => {
      const outline = outlineByKey.get(normalize(constituency));
      return outline ? [{ constituency, count, outline }] : [];
    })
    // Draw the selected constituency last so its border sits on top.
    .sort(
      (a, b) => +(a.constituency === selected) - +(b.constituency === selected),
    );
  if (shown.length === 0) return null;

  const pad = 4;
  const minX = Math.min(...shown.map((s) => s.outline.box.minX)) - pad;
  const minY = Math.min(...shown.map((s) => s.outline.box.minY)) - pad;
  const width = Math.max(...shown.map((s) => s.outline.box.maxX)) + pad - minX;
  const height = Math.max(...shown.map((s) => s.outline.box.maxY)) + pad - minY;

  // Text scales with the visible area so labels keep a steady on-screen size.
  const fontSize = width / 48;
  const countSize = fontSize * 1.3;
  const maxCount = Math.max(...shown.map((s) => s.count));

  // Small shapes get just the count and the smallest no label; the tooltip and
  // the table always have both. Labels are placed largest count first and
  // skipped if they would overlap one already placed.
  type Box = { x0: number; y0: number; x1: number; y1: number };
  const placed: Box[] = [];
  const labels = new Map<string, { withName: boolean }>();
  for (const { constituency, count, outline } of [...shown].sort(
    (a, b) => b.count - a.count,
  )) {
    const boxWidth = (outline.box.maxX - outline.box.minX) * 0.9;
    const boxHeight = outline.box.maxY - outline.box.minY;
    const countWidth = String(count).length * countSize * 0.6;
    const nameWidth = constituency.length * fontSize * 0.55;
    if (countWidth > boxWidth || countSize > boxHeight * 0.8) continue;
    const withName =
      nameWidth <= boxWidth && fontSize + countSize <= boxHeight * 0.8;
    const halfWidth = Math.max(countWidth, withName ? nameWidth : 0) / 2;
    const box = {
      x0: outline.cx - halfWidth,
      x1: outline.cx + halfWidth,
      y0: outline.cy - (withName ? fontSize * 1.1 : countSize * 0.6),
      y1: outline.cy + (withName ? countSize * 1.1 : countSize * 0.6),
    };
    const overlaps = placed.some(
      (b) => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1,
    );
    if (overlaps) continue;
    placed.push(box);
    labels.set(constituency, { withName });
  }

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      role="group"
      aria-label="Constituency map"
      className="w-full"
    >
      {shown.map(({ constituency, count, outline }) => {
        // Square-root scale so small counts stay visible next to the largest.
        const strength = Math.sqrt(count / maxCount);
        const isSelected = selected === constituency;
        return (
          <g
            key={constituency}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${constituency}: ${count}`}
            onClick={() => onSelect(constituency)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(constituency);
              }
            }}
            className="cursor-pointer outline-none"
          >
            <title>{`${constituency}: ${count}`}</title>
            <polygon
              points={outline.points}
              fill="#2563eb"
              fillOpacity={0.15 + 0.75 * strength}
              stroke={isSelected ? "#000" : "#fff"}
              strokeWidth={isSelected ? width / 400 : width / 600}
              strokeLinejoin="round"
            />
          </g>
        );
      })}
      {/* Labels go in a second pass so neighbouring shapes can't cover them. */}
      {shown.map(({ constituency, count, outline }) => {
        const label = labels.get(constituency);
        if (!label) return null;
        return (
          <text
            key={constituency}
            textAnchor="middle"
            fontSize={fontSize}
            fill="#111"
            pointerEvents="none"
            aria-hidden
          >
            {label.withName && (
              <tspan x={outline.cx} y={outline.cy - fontSize * 0.2}>
                {constituency}
              </tspan>
            )}
            <tspan
              x={outline.cx}
              y={
                label.withName
                  ? outline.cy + countSize * 0.9
                  : outline.cy + countSize * 0.35
              }
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
