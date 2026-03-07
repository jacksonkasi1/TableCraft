// ** import core packages

import type { QueryParams, QueryResult } from "@tablecraft/table";
// ** import table
import {
	createRestAdapter,
	DataTable,
	DataTableColumnHeader,
} from "@tablecraft/table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

// ** import ui
import { Badge } from "@/components/ui/badge";

// ** import apis
import { API_BASE_URL } from "../api";

// ─── Row type ────────────────────────────────────────────────────────────────

interface OrderRow extends Record<string, unknown> {
	id: number;
	status: string;
	email: string;
	total: number;
	itemCount: number;
	createdAt: string | null;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
	confirmed:
		"bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
	shipped:
		"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
	delivered:
		"bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",
	cancelled:
		"bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
};

// ─── Manual column definitions ────────────────────────────────────────────────

const columns: ColumnDef<OrderRow, unknown>[] = [
	{
		accessorKey: "id",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="ID" />
		),
		cell: ({ getValue }) => (
			<span className="font-mono text-xs text-muted-foreground">
				#{String(getValue())}
			</span>
		),
		size: 72,
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Status" />
		),
		cell: ({ getValue }) => {
			const val = String(getValue());
			const cls = STATUS_COLORS[val] ?? "bg-gray-100 text-gray-700";
			return (
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
				>
					{val.charAt(0).toUpperCase() + val.slice(1)}
				</span>
			);
		},
		size: 110,
	},
	{
		accessorKey: "email",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Customer" />
		),
		cell: ({ getValue }) => (
			<span className="text-sm">{String(getValue())}</span>
		),
	},
	{
		accessorKey: "total",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Total" />
		),
		cell: ({ getValue }) => (
			<span className="font-mono font-semibold text-emerald-500">
				${(getValue() as number).toFixed(2)}
			</span>
		),
		size: 100,
	},
	{
		accessorKey: "itemCount",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Items" />
		),
		cell: ({ getValue }) => (
			<span className="tabular-nums">{String(getValue())}</span>
		),
		size: 72,
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Date" />
		),
		cell: ({ getValue }) => {
			const val = getValue();
			if (!val) return <span className="text-muted-foreground">—</span>;
			return (
				<span className="text-sm text-muted-foreground">
					{new Date(val as string).toLocaleDateString("en-US")}
				</span>
			);
		},
		size: 120,
	},
];

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchOrders(
	params: QueryParams,
): Promise<QueryResult<OrderRow>> {
	const url = new URL(`${API_BASE_URL}/orders`);

	url.searchParams.set("page", String(params.page));
	url.searchParams.set("pageSize", String(params.pageSize));

	if (params.sort) url.searchParams.set("sortBy", params.sort);
	if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);
	if (params.search) url.searchParams.set("search", params.search);
	if (params.filters)
		url.searchParams.set("filters", JSON.stringify(params.filters));
	if (params.dateRange)
		url.searchParams.set("dateRange", JSON.stringify(params.dateRange));

	let res: Response;
	try {
		res = await fetch(url.toString());
	} catch (err) {
		throw new Error(`Network error: unable to fetch orders. ${err}`);
	}
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ""}`);
	}

	const json = await res.json();

	return {
		data: json.data ?? [],
		meta: {
			total: json.meta?.total ?? 0,
			page: json.meta?.page ?? params.page,
			pageSize: json.meta?.pageSize ?? params.pageSize,
			totalPages: json.meta?.totalPages ?? 1,
		},
	};
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function OrdersRestPage() {
	const adapter = useMemo(
		() => createRestAdapter<OrderRow>({ queryFn: fetchOrders }),
		[],
	);

	return (
		<div className="p-8 space-y-4">
			<div className="flex items-center gap-2">
				<h1 className="text-2xl font-bold">Orders</h1>
				<Badge variant="secondary">REST Adapter + Manual Columns</Badge>
			</div>
			<p className="text-sm text-muted-foreground">
				Uses <code>createRestAdapter</code> with a plain <code>fetch</code>{" "}
				query function and hand-written <code>ColumnDef</code> definitions — no
				engine auto-columns.
			</p>

			<DataTable<OrderRow>
				adapter={adapter}
				columns={columns}
				config={{
					enableSearch: true,
					enableExport: true,
					enableColumnResizing: true,
					defaultPageSize: 10,
					pageSizeOptions: [5, 10, 20, 50],
					columnResizingTableId: "orders-rest",
				}}
			/>
		</div>
	);
}
