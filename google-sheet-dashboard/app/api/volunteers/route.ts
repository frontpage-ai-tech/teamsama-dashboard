import { connection } from "next/server";
import { sheetResponse } from "@/lib/sheet";

const SHEET_TAB = "Mandal Volunteers";

export async function GET() {
  await connection();

  return sheetResponse(
    SHEET_TAB,
    ["District", "Mandal", "Volunteer", "Yesterday", "Today", "Total"],
    (allRows, column) => {
      const rows = allRows.filter((row) => (row[column.Mandal] ?? "").trim());
      const number = (value: string | undefined) => Number(value) || 0;

      type Counts = { yesterday: number; today: number; total: number };
      type Mandal = Counts & { mandal: string; volunteer: string };
      type District = Counts & {
        district: string;
        assigned: number;
        mandals: Mandal[];
      };

      // Group case-insensitively, keeping the first spelling seen as the label.
      const districts = new Map<string, District>();
      const totals = { yesterday: 0, today: 0, total: 0, assigned: 0 };
      for (const row of rows) {
        const name = (row[column.District] ?? "").trim() || "(blank)";
        const key = name.toLowerCase();
        let district = districts.get(key);
        if (!district) {
          district = {
            district: name,
            yesterday: 0,
            today: 0,
            total: 0,
            assigned: 0,
            mandals: [],
          };
          districts.set(key, district);
        }

        const mandal = {
          mandal: row[column.Mandal].trim(),
          volunteer: (row[column.Volunteer] ?? "").trim(),
          yesterday: number(row[column.Yesterday]),
          today: number(row[column.Today]),
          total: number(row[column.Total]),
        };
        district.mandals.push(mandal);
        for (const group of [district, totals]) {
          group.yesterday += mandal.yesterday;
          group.today += mandal.today;
          group.total += mandal.total;
          if (mandal.volunteer) group.assigned += 1;
        }
      }

      const byTotal = <T extends Counts>(nameOf: (item: T) => string) =>
        (a: T, b: T) =>
          b.total - a.total || nameOf(a).localeCompare(nameOf(b));

      return {
        districts: [...districts.values()]
          .map((district) => ({
            ...district,
            mandals: district.mandals.sort(byTotal((m) => m.mandal)),
          }))
          .sort(byTotal((d) => d.district)),
        mandalCount: rows.length,
        ...totals,
      };
    },
    { cache: false },
  );
}
