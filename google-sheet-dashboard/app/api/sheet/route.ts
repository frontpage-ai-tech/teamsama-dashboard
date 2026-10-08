import { google } from "googleapis";
import { cacheLife } from "next/cache";
import { connection } from "next/server";

const SHEET_TAB = "Applications";
const DISTRICT_COLUMN = "District";
const MANDAL_COLUMN = "Mandal";
const ELIGIBILITY_COLUMN = "Eligibility";
const ELIGIBLE_VALUE = "eligible";
const STATUS_COLUMN = "Status";
const SUBMITTED_VALUE = "submitted";

function readCredentials() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  // Tolerate a value pasted straight from the service-account JSON:
  // surrounding quotes, a trailing comma and escaped newlines.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim()
    .replace(/,$/, "")
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) return null;
  return { clientEmail, privateKey, spreadsheetId };
}

// Cached for 5 minutes. `expire` has to be longer than `revalidate`; keeping
// them a second apart means a request after 5 minutes waits for fresh data
// instead of being served the stale copy. Errors throw, so they aren't cached.
async function getSheetValues() {
  "use cache";
  cacheLife({ revalidate: 300, expire: 301 });

  const credentials = readCredentials();
  if (!credentials) throw new Error("Missing Google credentials");

  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const values = await sheets.spreadsheets.values.get({
    spreadsheetId: credentials.spreadsheetId,
    range: `'${SHEET_TAB.replace(/'/g, "''")}'`,
  });

  return {
    values: (values.data.values ?? []) as string[][],
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET() {
  await connection();

  if (!readCredentials()) {
    return Response.json(
      {
        error:
          "Missing GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY or GOOGLE_SHEET_ID in .env.local",
      },
      { status: 500 },
    );
  }

  try {
    const { values, fetchedAt } = await getSheetValues();

    const [header = [], ...allRows] = values;
    const column = header.findIndex((name) => name.trim() === MANDAL_COLUMN);
    const eligibilityColumn = header.findIndex(
      (name) => name.trim() === ELIGIBILITY_COLUMN,
    );
    const districtColumn = header.findIndex(
      (name) => name.trim() === DISTRICT_COLUMN,
    );
    const statusColumn = header.findIndex(
      (name) => name.trim() === STATUS_COLUMN,
    );
    const missing = [
      districtColumn === -1 && DISTRICT_COLUMN,
      column === -1 && MANDAL_COLUMN,
      eligibilityColumn === -1 && ELIGIBILITY_COLUMN,
      statusColumn === -1 && STATUS_COLUMN,
    ].filter(Boolean);
    if (missing.length > 0) {
      return Response.json(
        { error: `No "${missing.join('", "')}" column in the "${SHEET_TAB}" tab` },
        { status: 502 },
      );
    }

    const rows = allRows.filter(
      (row) =>
        (row[eligibilityColumn] ?? "").trim().toLowerCase() === ELIGIBLE_VALUE &&
        (row[statusColumn] ?? "").trim().toLowerCase() === SUBMITTED_VALUE,
    );

    // Group case-insensitively, keeping the first spelling seen as the label.
    type Group = { name: string; count: number; children: Map<string, Group> };
    const tally = (groups: Map<string, Group>, value: string | undefined) => {
      const name = (value ?? "").trim() || "(blank)";
      const key = name.toLowerCase();
      let group = groups.get(key);
      if (!group) groups.set(key, (group = { name, count: 0, children: new Map() }));
      group.count += 1;
      return group;
    };
    const sorted = (groups: Map<string, Group>) =>
      [...groups.values()].sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name),
      );

    const districts = new Map<string, Group>();
    for (const row of rows) {
      const district = tally(districts, row[districtColumn]);
      tally(district.children, row[column]);
    }

    return Response.json({
      districts: sorted(districts).map((district) => ({
        district: district.name,
        count: district.count,
        mandals: sorted(district.children).map((mandal) => ({
          mandal: mandal.name,
          count: mandal.count,
        })),
      })),
      total: rows.length,
      fetchedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Google Sheets request failed: ${message}` },
      { status: 502 },
    );
  }
}
