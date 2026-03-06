import type { CellRendererProps } from "../types";

export function DateRenderer({ value, column }: CellRendererProps) {
	if (value === null || value === undefined) {
		return <span className="text-muted-foreground">—</span>;
	}

	const rawValue = String(value);
	const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawValue);
	const date =
		value instanceof Date
			? value
			: new Date(isDateOnly ? `${rawValue}T00:00:00` : rawValue);
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
		const diff = now - date.getTime();
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 30) {
			formatted = new Intl.DateTimeFormat(locale, {
				dateStyle: "medium",
			}).format(date);
		} else if (days > 0) {
			formatted = relative.format(-days, "day");
		} else if (hours > 0) {
			formatted = relative.format(-hours, "hour");
		} else if (minutes > 0) {
			formatted = relative.format(-minutes, "minute");
		} else {
			formatted = relative.format(0, "second");
		}
	} else {
		// Default: date only
		formatted = new Intl.DateTimeFormat(locale, {
			dateStyle: "medium",
		}).format(date);
	}

	return <span>{formatted}</span>;
}
