import { connection } from "next/server";
import { mandalKey } from "@/lib/mandals";
import { sheetResponse } from "@/lib/sheet";

const SHEET_TAB = "Applications";
const ELIGIBLE_VALUE = "eligible";
const SUBMITTED_VALUE = "submitted";

export async function GET() {
  await connection();

  return sheetResponse(
    SHEET_TAB,
    ["District", "Mandal", "Eligibility", "Status"],
    (allRows, column) => {
      const rows = allRows.filter(
        (row) =>
          (row[column.Eligibility] ?? "").trim().toLowerCase() ===
            ELIGIBLE_VALUE &&
          (row[column.Status] ?? "").trim().toLowerCase() === SUBMITTED_VALUE,
      );

      // Group case-insensitively (mandals also by known spelling variants),
      // labelling each group with its most common spelling.
      type Group = {
        name: string;
        count: number;
        spellings: Map<string, number>;
        children: Map<string, Group>;
      };
      const tally = (
        groups: Map<string, Group>,
        value: string | undefined,
        keyOf = (name: string) => name.toLowerCase(),
      ) => {
        const name = (value ?? "").trim() || "(blank)";
        const key = keyOf(name);
        let group = groups.get(key);
        if (!group) {
          group = { name, count: 0, spellings: new Map(), children: new Map() };
          groups.set(key, group);
        }
        group.count += 1;
        const uses = (group.spellings.get(name) ?? 0) + 1;
        group.spellings.set(name, uses);
        if (uses > (group.spellings.get(group.name) ?? 0)) group.name = name;
        return group;
      };
      const sorted = (groups: Map<string, Group>) =>
        [...groups.values()].sort(
          (a, b) => b.count - a.count || a.name.localeCompare(b.name),
        );

      const districts = new Map<string, Group>();
      for (const row of rows) {
        const district = tally(districts, row[column.District]);
        tally(district.children, row[column.Mandal], mandalKey);
      }

      return {
        districts: sorted(districts).map((district) => ({
          district: district.name,
          count: district.count,
          mandals: sorted(district.children).map((mandal) => ({
            mandal: mandal.name,
            count: mandal.count,
          })),
        })),
        total: rows.length,
      };
    },
  );
}
