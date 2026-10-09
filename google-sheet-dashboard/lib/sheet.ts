import { google } from "googleapis";
import { cacheLife } from "next/cache";

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

async function fetchSheetValues(tab: string) {
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
    range: `'${tab.replace(/'/g, "''")}'`,
  });

  return {
    values: (values.data.values ?? []) as string[][],
    fetchedAt: new Date().toISOString(),
  };
}

// Cached for 5 minutes per tab. `expire` has to be longer than `revalidate`;
// keeping them a second apart means a request after 5 minutes waits for fresh
// data instead of being served the stale copy. Errors throw, so they aren't cached.
async function getCachedSheetValues(tab: string) {
  "use cache";
  cacheLife({ revalidate: 300, expire: 301 });

  return fetchSheetValues(tab);
}

// Reads a tab, locates the named columns in its header row and returns
// whatever `build` makes of the data rows, plus when the tab was fetched.
export async function sheetResponse<Column extends string>(
  tab: string,
  columns: readonly Column[],
  build: (rows: string[][], index: Record<Column, number>) => object,
  { cache = true }: { cache?: boolean } = {},
) {
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
    const { values, fetchedAt } = await (cache
      ? getCachedSheetValues(tab)
      : fetchSheetValues(tab));
    const [header = [], ...rows] = values;

    const index = {} as Record<Column, number>;
    for (const column of columns) {
      index[column] = header.findIndex((name) => name.trim() === column);
    }
    const missing = columns.filter((column) => index[column] === -1);
    if (missing.length > 0) {
      return Response.json(
        { error: `No "${missing.join('", "')}" column in the "${tab}" tab` },
        { status: 502 },
      );
    }

    return Response.json({ ...build(rows, index), fetchedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Google Sheets request failed: ${message}` },
      { status: 502 },
    );
  }
}
