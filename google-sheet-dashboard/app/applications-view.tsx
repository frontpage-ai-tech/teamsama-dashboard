"use client";

import { Fragment, useEffect, useState } from "react";
import DistrictMap, { hasOutline } from "./district-map";

const CACHE_MS = 5 * 60 * 1000;

type DistrictCount = {
  district: string;
  count: number;
  mandals: { mandal: string; count: number }[];
};
export type ApplicationsData = {
  districts: DistrictCount[];
  total: number;
  fetchedAt: string;
};

export default function ApplicationsView({ data }: { data: ApplicationsData }) {
  const [openDistrict, setOpenDistrict] = useState<string | null>(null);
  const toggle = (district: string) =>
    setOpenDistrict(openDistrict === district ? null : district);

  // The "as of" note only applies while the server still has the data cached.
  const [showCacheNote, setShowCacheNote] = useState(false);
  const { fetchedAt } = data;
  useEffect(() => {
    const remaining = new Date(fetchedAt).getTime() + CACHE_MS - Date.now();
    const show = setTimeout(() => setShowCacheNote(remaining > 0));
    const hide = setTimeout(() => setShowCacheNote(false), remaining);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [fetchedAt]);

  const offMap = data.districts.filter((d) => !hasOutline(d.district));

  return (
    <div className="flex max-w-full flex-col items-start gap-4">
      {showCacheNote && (
        <p className="text-sm text-zinc-600">
          Sheet data as of {new Date(fetchedAt).toLocaleTimeString()} (cached
          for 5 minutes)
        </p>
      )}

      {data.total === 0 ? (
        <p className="text-sm text-zinc-600">
          No eligible, submitted rows in the sheet.
        </p>
      ) : (
        <div className="flex max-w-full flex-wrap items-start gap-8">
          <table className="border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 font-semibold">
                  District / Mandal
                </th>
                <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-right font-semibold">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {data.districts.map(({ district, count, mandals }) => {
                const open = openDistrict === district;
                return (
                  <Fragment key={district}>
                    <tr
                      onClick={() => toggle(district)}
                      className="cursor-pointer hover:bg-zinc-50"
                    >
                      <td className="border border-zinc-300 px-3 py-2 font-medium">
                        <button
                          type="button"
                          aria-expanded={open}
                          className="flex w-full items-center gap-2 text-left"
                        >
                          <span aria-hidden className="w-3 text-zinc-500">
                            {open ? "▾" : "▸"}
                          </span>
                          {district}
                        </button>
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right font-medium tabular-nums">
                        {count}
                      </td>
                    </tr>
                    {open &&
                      mandals.map((mandal) => (
                        <tr key={mandal.mandal} className="bg-zinc-50">
                          <td className="border border-zinc-300 py-2 pr-3 pl-10 text-zinc-700">
                            {mandal.mandal}
                          </td>
                          <td className="border border-zinc-300 px-3 py-2 text-right text-zinc-700 tabular-nums">
                            {mandal.count}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="border border-zinc-300 bg-zinc-100 px-3 py-2 font-semibold">
                  Total
                </td>
                <td className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-right font-semibold tabular-nums">
                  {data.total}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="flex w-[39.6rem] max-w-full flex-col gap-2">
            <DistrictMap
              districts={data.districts}
              selected={openDistrict}
              onSelect={toggle}
            />
            {offMap.length > 0 && (
              <p className="text-sm text-zinc-600">
                Not on the map:{" "}
                {offMap.map((d) => `${d.district} (${d.count})`).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
