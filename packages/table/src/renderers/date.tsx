import type { CellRendererProps } from "../types";

function resolveLocale(value: unknown): string {
	try {
		return typeof value === "string" &&
			value.trim() !== "" &&
			Intl.DateTimeFormat.supportedLocalesOf([value]).length > 0
			? value
			: "en-US";
	} catch {
		return "en-US";
	}
}

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
	const locale = resolveLocale(column.meta?.locale);

	try {
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
			const isFuture = diff > 0;
			const absDiff = Math.abs(diff);

			const seconds = Math.round(absDiff / 1000);
			const minutes = Math.round(absDiff / 60_000);
			const hours = Math.round(absDiff / 3_600_000);
			const days = Math.round(absDiff / 86_400_000);

			if (days > 30) {
				formatted = new Intl.DateTimeFormat(locale, {
					dateStyle: "medium",
				}).format(date);
			} else if (days >= 1) {
				formatted = relative.format(isFuture ? days : -days, "day");
			} else if (hours >= 1) {
				formatted = relative.format(isFuture ? hours : -hours, "hour");
			} else if (minutes >= 1) {
				formatted = relative.format(isFuture ? minutes : -minutes, "minute");
			} else {
				formatted = relative.format(isFuture ? seconds : -seconds, "second");
			}
		} else {
			// Default: date only
			formatted = new Intl.DateTimeFormat(locale, {
				dateStyle: "medium",
			}).format(date);
		}
	} catch {
		// Fallback to basic string if Intl formatting fails
		formatted = date.toLocaleString("en-US");
	}

	return <span>{formatted}</span>;
}
