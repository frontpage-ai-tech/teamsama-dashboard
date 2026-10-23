import { connection } from "next/server";
import { sheetResponse } from "@/lib/sheet";

const SHEET_TAB = "By Constituency";
const NAME_COLUMN = "AC";
const COUNT_COLUMN = "Filed (Submitted) count";

export async function GET() {
  await connection();

  return sheetResponse(
    SHEET_TAB,
    [NAME_COLUMN, COUNT_COLUMN],
    (rows, column) => {
      const constituencies = rows
        .map((row) => ({
          constituency: (row[column[NAME_COLUMN]] ?? "").trim(),
          count: Number(row[column[COUNT_COLUMN]]),
        }))
        // The tab has its own TOTAL row; the page adds the total up itself.
        .filter(
          ({ constituency, count }) =>
            constituency &&
            constituency.toLowerCase() !== "total" &&
            Number.isFinite(count),
        )
        .sort(
          (a, b) => b.count - a.count || a.constituency.localeCompare(b.constituency),
        );

      // The tab ends with a one-cell "Last updated …" row explaining the counts.
      const note =
        rows
          .map((row) => (row[0] ?? "").trim())
          .find((cell) => /^last updated/i.test(cell)) ?? "";

      return {
        constituencies,
        total: constituencies.reduce((sum, { count }) => sum + count, 0),
        note,
      };
    },
    { cache: false },
  );
}
