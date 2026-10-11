"use client";

import { Fragment, useState } from "react";

type Counts = { yesterday: number; today: number; total: number };
type DistrictVolunteers = Counts & {
  district: string;
  assigned: number;
  mandals: (Counts & { mandal: string; volunteer: string })[];
};
export type VolunteersData = Counts & {
  districts: DistrictVolunteers[];
  mandalCount: number;
  assigned: number;
  fetchedAt: string;
};

const headerCell = "border border-zinc-300 bg-zinc-100 px-3 py-2 font-semibold";
const numberCell = "border border-zinc-300 px-3 py-2 text-right tabular-nums";

export default function VolunteersView({ data }: { data: VolunteersData }) {
  const [openDistrict, setOpenDistrict] = useState<string | null>(null);

  if (data.mandalCount === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No mandals in the Mandal Volunteers tab.
      </p>
    );
  }

  return (
    <table className="border-collapse text-left text-sm">
      <thead>
        <tr>
          <th className={headerCell}>District / Mandal</th>
          <th className={`${headerCell} text-right`}>Yesterday</th>
          <th className={`${headerCell} text-right`}>Today</th>
          <th className={`${headerCell} text-right`}>Total</th>
          <th className={headerCell}>Volunteer</th>
        </tr>
      </thead>
      <tbody>
        {data.districts.map((district) => {
          const open = openDistrict === district.district;
          return (
            <Fragment key={district.district}>
              <tr
                onClick={() => setOpenDistrict(open ? null : district.district)}
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
                    {district.district}
                  </button>
                </td>
                <td className={`${numberCell} font-medium`}>
                  {district.yesterday}
                </td>
                <td className={`${numberCell} font-medium`}>{district.today}</td>
                <td className={`${numberCell} font-medium`}>{district.total}</td>
                <td className="border border-zinc-300 px-3 py-2 text-zinc-600">
                  {district.assigned} of {district.mandals.length} assigned
                </td>
              </tr>
              {open &&
                district.mandals.map((mandal, i) => (
                  <tr key={i} className="bg-zinc-50 align-top text-zinc-700">
                    <td className="border border-zinc-300 py-2 pr-3 pl-10">
                      {mandal.mandal}
                    </td>
                    <td className={numberCell}>{mandal.yesterday}</td>
                    <td className={numberCell}>{mandal.today}</td>
                    <td className={numberCell}>{mandal.total}</td>
                    {/* A cell can list several volunteers, one per line. */}
                    <td className="border border-zinc-300 px-3 py-2 whitespace-pre-line">
                      {mandal.volunteer || "—"}
                    </td>
                  </tr>
                ))}
            </Fragment>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td className={headerCell}>Total</td>
          <td className={`${headerCell} text-right tabular-nums`}>
            {data.yesterday}
          </td>
          <td className={`${headerCell} text-right tabular-nums`}>
            {data.today}
          </td>
          <td className={`${headerCell} text-right tabular-nums`}>
            {data.total}
          </td>
          <td className={headerCell}>
            {data.assigned} of {data.mandalCount} assigned
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
