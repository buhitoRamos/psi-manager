export type BillingPeriod = {
  dueDate: string;
  firstDueDate: string;
  daysUntilDue: number;
};

function utcDay(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day);
}

function monthlyDate(year: number, month: number, anchorDay: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return utcDay(year, month, Math.min(anchorDay, lastDay));
}

function addMonth(date: number, anchorDay: number): number {
  const value = new Date(date);
  const monthIndex = value.getUTCFullYear() * 12 + value.getUTCMonth() + 1;
  return monthlyDate(
    Math.floor(monthIndex / 12),
    (monthIndex % 12) + 1,
    anchorDay,
  );
}

function dateString(date: number): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function calculateBillingPeriod(
  createdAt: string,
  today: string,
): BillingPeriod {
  const createdDate = Date.parse(`${createdAt.slice(0, 10)}T00:00:00Z`);
  const todayDate = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(createdDate) || !Number.isFinite(todayDate)) {
    throw new Error("Invalid account or current date.");
  }

  const anchorDay = new Date(createdDate).getUTCDate();
  const todayValue = new Date(todayDate);
  const firstDueDate = addMonth(createdDate, anchorDay);
  let dueDate = monthlyDate(
    todayValue.getUTCFullYear(),
    todayValue.getUTCMonth() + 1,
    anchorDay,
  );
  while (dueDate < firstDueDate || dueDate < todayDate) {
    dueDate = addMonth(dueDate, anchorDay);
  }

  return {
    dueDate: dateString(dueDate),
    firstDueDate: dateString(firstDueDate),
    daysUntilDue: Math.round((dueDate - todayDate) / 86_400_000),
  };
}
