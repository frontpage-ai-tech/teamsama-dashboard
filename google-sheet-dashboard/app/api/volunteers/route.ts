import { connection } from "next/server";
import { sheetResponse } from "@/lib/sheet";

const SHEET_TAB = "Mandal Volunteers";

export async function GET() {
  await connection();

  return sheetResponse(
    SHEET_TAB,
    ["District", "Mandal", "Volunteer Name", "Volunteer Mobile"],
    (allRows, column) => {
      const rows = allRows.filter((row) => (row[column.Mandal] ?? "").trim());

      type Mandal = { mandal: string; volunteer: string; mobile: string };
      type District = { district: string; assigned: number; mandals: Mandal[] };

      // Group case-insensitively, keeping the first spelling seen as the label.
      const districts = new Map<string, District>();
      for (const row of rows) {
        const name = (row[column.District] ?? "").trim() || "(blank)";
        const key = name.toLowerCase();
        let district = districts.get(key);
        if (!district) {
          districts.set(key, (district = { district: name, assigned: 0, mandals: [] }));
        }
        const volunteer = (row[column["Volunteer Name"]] ?? "").trim();
        if (volunteer) district.assigned += 1;
        district.mandals.push({
          mandal: row[column.Mandal].trim(),
          volunteer,
          mobile: (row[column["Volunteer Mobile"]] ?? "").trim(),
        });
      }

      const list = [...districts.values()]
        .map((district) => ({
          ...district,
          count: district.mandals.length,
          mandals: district.mandals.sort((a, b) =>
            a.mandal.localeCompare(b.mandal),
          ),
        }))
        .sort(
          (a, b) => b.count - a.count || a.district.localeCompare(b.district),
        );

      return {
        districts: list,
        total: rows.length,
        assigned: list.reduce((sum, district) => sum + district.assigned, 0),
      };
    },
    { cache: false },
  );
}
