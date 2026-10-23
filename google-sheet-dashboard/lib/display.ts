import type { ApplicationsData } from "@/app/applications-view";
import type { ConstituenciesData } from "@/app/constituencies-view";
import type { VolunteersData } from "@/app/volunteers-view";

// Every application count on the dashboard is shown multiplied by this.
export const COUNT_MULTIPLIER = 1;

const scale = (count: number) => count * COUNT_MULTIPLIER;

export function scaleApplications(data: ApplicationsData): ApplicationsData {
  return {
    ...data,
    total: scale(data.total),
    districts: data.districts.map((district) => ({
      ...district,
      count: scale(district.count),
      mandals: district.mandals.map((mandal) => ({
        ...mandal,
        count: scale(mandal.count),
      })),
    })),
  };
}

// Volunteer assignments ("x of y assigned") count mandals, not
// applications, so they are left as they are.
export function scaleVolunteers(data: VolunteersData): VolunteersData {
  const counts = <T extends { yesterday: number; today: number; total: number }>(
    item: T,
  ): T => ({
    ...item,
    yesterday: scale(item.yesterday),
    today: scale(item.today),
    total: scale(item.total),
  });
  return {
    ...counts(data),
    districts: data.districts.map((district) => ({
      ...counts(district),
      mandals: district.mandals.map(counts),
    })),
  };
}

export function scaleConstituencies(
  data: ConstituenciesData,
): ConstituenciesData {
  return {
    ...data,
    total: scale(data.total),
    constituencies: data.constituencies.map((item) => ({
      ...item,
      count: scale(item.count),
    })),
  };
}
