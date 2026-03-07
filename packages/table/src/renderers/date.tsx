import type { CellRendererProps } from "../types";

export function DateRenderer({ value, column }: CellRendererProps) {
	if (value === null || value === undefined) {
		return <span className="text-muted-foreground">—</span>;
	}

	const rawValue = String(value);
	const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawValue);

	let date: Date;
	if (value instanceof Date) {
		date = value;
	} else if (isDateOnly) {
		const [year, month, day] = rawValue.split("-").map(Number);
		date = new Date(year, month - 1, day);
	} else {
		date = new Date(rawValue);
	}

	if (Number.isNaN(date.getTime())) {
		return <span>{String(value)}</span>;
	}

	const format = column.format;

	let formatted: string;
	const locale = (column.meta?.locale as string) || "en-US";

	if (format === "datetime") {
		formatted = new Intl.DateTimeFormat(locale, {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		}).format(date);
	} else if (format === "time") {
		formatted = new Intl.DateTimeFormat(locale, {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		}).format(date);
	} else if (format === "relative") {
		const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
		const now = Date.now();
		const diff = date.getTime() - now;
		const seconds = Math.round(diff / 1000);
		const minutes = Math.round(diff / 60_000);
		const hours = Math.round(diff / 3_600_000);
		const days = Math.round(diff / 86_400_000);

		if (Math.abs(days) > 30) {
			formatted = new Intl.DateTimeFormat(locale, {
				dateStyle: "medium",
			}).format(date);
		} else if (Math.abs(days) >= 1) {
			formatted = relative.format(days, "day");
		} else if (Math.abs(hours) >= 1) {
			formatted = relative.format(hours, "hour");
		} else if (Math.abs(minutes) >= 1) {
			formatted = relative.format(minutes, "minute");
		} else {
			formatted = relative.format(seconds, "second");
		}
	} else {
		// Default: date only
		formatted = new Intl.DateTimeFormat(locale, {
			dateStyle: "medium",
		}).format(date);
	}

	return <span>{formatted}</span>;
}
