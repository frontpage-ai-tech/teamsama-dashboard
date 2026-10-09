"use client";

import { Fragment, useState } from "react";
import { mandalKey } from "@/lib/mandals";
import type { ApplicationsData } from "./applications-view";

type DistrictVolunteers = {
  district: string;
  assigned: number;
  mandals: { mandal: string; volunteer: string; mobile: string }[];
};
export type VolunteersData = {
  districts: DistrictVolunteers[];
  total: number;
  assigned: number;
  fetchedAt: string;
};

// Applications and volunteers are matched on district and mandal name,
// ignoring case, spaces, punctuation and known mandal spelling variants.
const keyOf = (district: string, mandal: string) =>
  `${district.toLowerCase().replace(/[^a-z0-9]/g, "")}|${mandalKey(mandal)}`;

export default function VolunteersView({
  data,
  applications,
}: {
  data: VolunteersData;
  applications: ApplicationsData | null;
}) {
  const [openDistrict, setOpenDistrict] = useState<string | null>(null);

  const applicationCount = new Map<string, number>();
  for (const { district, mandals } of applications?.districts ?? []) {
    for (const { mandal, count } of mandals) {
      const key = keyOf(district, mandal);
      applicationCount.set(key, (applicationCount.get(key) ?? 0) + count);
    }
  }

  const listed = new Set<string>();
  const districts = data.districts
    .map((district) => {
      const mandals = district.mandals
        .map((mandal) => {
          const key = keyOf(district.district, mandal.mandal);
          // A mandal listed twice only gets its applications counted once.
          const count = listed.has(key) ? 0 : (applicationCount.get(key) ?? 0);
          listed.add(key);
          return { ...mandal, count };
        })
        .sort((a, b) => b.count - a.count || a.mandal.localeCompare(b.mandal));
      return {
        ...district,
        mandals,
        count: mandals.reduce((sum, mandal) => sum + mandal.count, 0),
      };
    })
    .sort((a, b) => b.count - a.count || a.district.localeCompare(b.district));
  const total = districts.reduce((sum, district) => sum + district.count, 0);

  const unlisted = (applications?.districts ?? []).flatMap(
    ({ district, mandals }) =>
      mandals
        .filter(({ mandal }) => !listed.has(keyOf(district, mandal)))
        .map(({ mandal, count }) => ({ district, mandal, count })),
  );
  const unlistedTotal = unlisted.reduce((sum, { count }) => sum + count, 0);

  if (data.total === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No mandals in the Mandal Volunteers tab.
      </p>
    );
  }

  return (
    <div className="flex max-w-full flex-col items-start gap-4">
      <table className="border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 font-semibold">
              District / Mandal
            </th>
            <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-right font-semibold">
              Count
            </th>
            <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 font-semibold">
              Volunteer
            </th>
            <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 font-semibold">
              Mobile
            </th>
          </tr>
        </thead>
        <tbody>
          {districts.map(({ district, count, assigned, mandals }) => {
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
                  <td
                    colSpan={2}
                    className="border border-zinc-300 px-3 py-2 text-zinc-600"
                  >
                    {assigned} of {mandals.length} assigned
                  </td>
                </tr>
                {open &&
                  mandals.map((mandal, i) => (
                    <tr key={i} className="bg-zinc-50">
                      <td className="border border-zinc-300 py-2 pr-3 pl-10 text-zinc-700">
                        {mandal.mandal}
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right text-zinc-700 tabular-nums">
                        {mandal.count}
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-zinc-700">
                        {mandal.volunteer || "—"}
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-zinc-700 tabular-nums">
                        {mandal.mobile || "—"}
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
              {total}
            </td>
            <td
              colSpan={2}
              className="border border-zinc-300 bg-zinc-100 px-3 py-2 font-semibold"
            >
              {data.assigned} of {data.total} assigned
            </td>
          </tr>
        </tfoot>
      </table>

      {unlistedTotal > 0 && (
        <p className="max-w-xl text-sm text-zinc-600">
          Applications in mandals not listed in this tab ({unlistedTotal}):{" "}
          {unlisted
            .map((u) => `${u.mandal || "(blank)"}, ${u.district} (${u.count})`)
            .join("; ")}
        </p>
      )}
    </div>
  );
}
