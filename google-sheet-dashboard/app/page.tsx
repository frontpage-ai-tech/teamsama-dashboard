"use client";

import { useState } from "react";
import ApplicationsView, { type ApplicationsData } from "./applications-view";
import VolunteersView, { type VolunteersData } from "./volunteers-view";

const TABS = [
  { id: "applications", label: "Applications" },
  { id: "volunteers", label: "Mandal Volunteers" },
];

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [applications, setApplications] = useState<ApplicationsData | null>(null);
  const [volunteers, setVolunteers] = useState<VolunteersData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function refreshData() {
    setLoading(true);
    setErrors([]);
    const [applicationsResult, volunteersResult] = await Promise.allSettled([
      fetchJson<ApplicationsData>("/api/sheet"),
      fetchJson<VolunteersData>("/api/volunteers"),
    ]);
    if (applicationsResult.status === "fulfilled") {
      setApplications(applicationsResult.value);
    }
    if (volunteersResult.status === "fulfilled") {
      setVolunteers(volunteersResult.value);
    }
    const failures = [applicationsResult, volunteersResult].flatMap((result) =>
      result.status === "rejected"
        ? [
            result.reason instanceof Error
              ? result.reason.message
              : "Failed to load data",
          ]
        : [],
    );
    setErrors([...new Set(failures)]);
    setLoading(false);
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-4 bg-white p-4 font-sans text-black">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div role="tablist" className="flex gap-1 border-b border-zinc-300">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={activeTab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setActiveTab(id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                activeTab === id
                  ? "border-black text-black"
                  : "border-transparent text-zinc-500 hover:text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Fixed width so the label change doesn't move the tabs. */}
        <button
          type="button"
          onClick={refreshData}
          disabled={loading}
          className="w-32 rounded-md bg-black py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh data"}
        </button>
      </div>

      {errors.map((error) => (
        <p key={error} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ))}

      {/* Both panels stay mounted so each keeps its open district when switching tabs. */}
      <div
        role="tabpanel"
        id="panel-applications"
        aria-labelledby="tab-applications"
        hidden={activeTab !== "applications"}
        className="max-w-full"
      >
        {applications && <ApplicationsView data={applications} />}
      </div>
      <div
        role="tabpanel"
        id="panel-volunteers"
        aria-labelledby="tab-volunteers"
        hidden={activeTab !== "volunteers"}
        className="max-w-full"
      >
        {volunteers && (
          <VolunteersView data={volunteers} applications={applications} />
        )}
      </div>
    </main>
  );
}
