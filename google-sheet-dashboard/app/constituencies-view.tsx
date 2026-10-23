"use client";

import { useState } from "react";
import ConstituencyMap, { hasConstituencyOutline } from "./constituency-map";

export type ConstituenciesData = {
  constituencies: { constituency: string; count: number }[];
  total: number;
  note: string;
  fetchedAt: string;
};

const headerCell = "border border-zinc-300 bg-zinc-100 px-3 py-2 font-semibold";

export default function ConstituenciesView({
  data,
}: {
  data: ConstituenciesData;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const toggle = (constituency: string) =>
    setSelected(selected === constituency ? null : constituency);

  const offMap = data.constituencies.filter(
    (c) => !hasConstituencyOutline(c.constituency),
  );

  if (data.constituencies.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No constituencies in the By Constituency tab.
      </p>
    );
  }

  return (
    <div className="flex max-w-full flex-wrap items-start gap-8">
      <div className="flex w-fit max-w-full flex-col items-start gap-4">
        <table className="border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className={headerCell}>Constituency</th>
              <th className={`${headerCell} text-right`}>Count</th>
            </tr>
          </thead>
          <tbody>
            {data.constituencies.map(({ constituency, count }) => (
              <tr
                key={constituency}
                onClick={() => toggle(constituency)}
                className={`cursor-pointer hover:bg-zinc-50 ${selected === constituency ? "bg-zinc-100" : ""}`}
              >
                <td className="border border-zinc-300 px-3 py-2 font-medium">
                  {constituency}
                </td>
                <td className="border border-zinc-300 px-3 py-2 text-right font-medium tabular-nums">
                  {count}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className={headerCell}>Total</td>
              <td className={`${headerCell} text-right tabular-nums`}>
                {data.total}
              </td>
            </tr>
          </tfoot>
        </table>
        {/* The note wraps to the table's width instead of widening the column. */}
        {data.note && (
          <p className="w-0 min-w-full text-sm text-zinc-600">{data.note}</p>
        )}
      </div>
      <div className="flex w-[53rem] max-w-full flex-col gap-2">
        <ConstituencyMap
          constituencies={data.constituencies}
          selected={selected}
          onSelect={toggle}
        />
        {offMap.length > 0 && (
          <p className="text-sm text-zinc-600">
            Not on the map:{" "}
            {offMap.map((c) => `${c.constituency} (${c.count})`).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
