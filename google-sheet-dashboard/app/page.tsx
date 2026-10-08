"use client";

import { Fragment, useEffect, useState } from "react";

const CACHE_MS = 5 * 60 * 1000;

type MandalCount = { mandal: string; count: number };
type DistrictCount = {
  district: string;
  count: number;
  mandals: MandalCount[];
};

export default function Home() {
  const [data, setData] = useState<{
    districts: DistrictCount[];
    total: number;
    fetchedAt: string;
  } | null>(null);
  const [openDistrict, setOpenDistrict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The "as of" note only applies while the server still has the data cached.
  const [showCacheNote, setShowCacheNote] = useState(false);
  const fetchedAt = data?.fetchedAt;
  useEffect(() => {
    if (!fetchedAt) return;
    const remaining = new Date(fetchedAt).getTime() + CACHE_MS - Date.now();
    const show = setTimeout(() => setShowCacheNote(remaining > 0));
    const hide = setTimeout(() => setShowCacheNote(false), remaining);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [fetchedAt]);

  async function refreshData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheet");
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-start gap-4 bg-white p-4 font-sans text-black">
      <button
        type="button"
        onClick={refreshData}
        disabled={loading}
        className="self-end rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {loading ? "Loading…" : "Refresh data"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {data && showCacheNote && (
        <p className="text-sm text-zinc-600">
          Sheet data as of {new Date(data.fetchedAt).toLocaleTimeString()}{" "}
          (cached for 5 minutes)
        </p>
      )}

      {data && data.total === 0 && (
        <p className="text-sm text-zinc-600">No eligible rows in the sheet.</p>
      )}

      {data && data.total > 0 && (
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
                    onClick={() => setOpenDistrict(open ? null : district)}
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
      )}
    </main>
  );
}
