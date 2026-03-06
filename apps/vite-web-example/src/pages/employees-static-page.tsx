// ** import core packages

// ** import table
import {
	createStaticAdapter,
	DataTable,
	DataTableColumnHeader,
} from "@tablecraft/table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

// ** import ui
import { Badge } from "@/components/ui/badge";

// ─── Row type ────────────────────────────────────────────────────────────────

interface Employee extends Record<string, unknown> {
	id: number;
	name: string;
	department: string;
	role: string;
	salary: number;
	location: string;
	status: "active" | "inactive" | "on-leave";
	joinedAt: string;
}

// ─── Static dataset ───────────────────────────────────────────────────────────

const EMPLOYEES: Employee[] = [
	{
		id: 1,
		name: "Alice Johnson",
		department: "Engineering",
		role: "Senior Engineer",
		salary: 145000,
		location: "San Francisco",
		status: "active",
		joinedAt: "2020-03-15",
	},
	{
		id: 2,
		name: "Bob Martinez",
		department: "Design",
		role: "UX Designer",
		salary: 115000,
		location: "New York",
		status: "active",
		joinedAt: "2021-07-01",
	},
	{
		id: 3,
		name: "Carol Wang",
		department: "Engineering",
		role: "Staff Engineer",
		salary: 195000,
		location: "Seattle",
		status: "active",
		joinedAt: "2019-01-20",
	},
	{
		id: 4,
		name: "David Kim",
		department: "Product",
		role: "Product Manager",
		salary: 155000,
		location: "Austin",
		status: "on-leave",
		joinedAt: "2020-09-10",
	},
	{
		id: 5,
		name: "Emma Davis",
		department: "Engineering",
		role: "Frontend Engineer",
		salary: 130000,
		location: "Remote",
		status: "active",
		joinedAt: "2022-02-14",
	},
	{
		id: 6,
		name: "Frank Chen",
		department: "Sales",
		role: "Account Executive",
		salary: 98000,
		location: "Chicago",
		status: "active",
		joinedAt: "2021-11-03",
	},
	{
		id: 7,
		name: "Grace Lee",
		department: "HR",
		role: "HR Manager",
		salary: 105000,
		location: "New York",
		status: "active",
		joinedAt: "2020-05-22",
	},
	{
		id: 8,
		name: "Henry Brown",
		department: "Engineering",
		role: "DevOps Engineer",
		salary: 138000,
		location: "Remote",
		status: "inactive",
		joinedAt: "2021-04-17",
	},
	{
		id: 9,
		name: "Iris Patel",
		department: "Design",
		role: "Product Designer",
		salary: 120000,
		location: "San Francisco",
		status: "active",
		joinedAt: "2022-08-08",
	},
	{
		id: 10,
		name: "James Wilson",
		department: "Sales",
		role: "Sales Manager",
		salary: 130000,
		location: "Dallas",
		status: "active",
		joinedAt: "2019-06-30",
	},
	{
		id: 11,
		name: "Kate Thompson",
		department: "Engineering",
		role: "Backend Engineer",
		salary: 135000,
		location: "Seattle",
		status: "active",
		joinedAt: "2021-09-12",
	},
	{
		id: 12,
		name: "Leo Garcia",
		department: "Product",
		role: "Product Analyst",
		salary: 110000,
		location: "Austin",
		status: "active",
		joinedAt: "2022-01-05",
	},
	{
		id: 13,
		name: "Mia Robinson",
		department: "Engineering",
		role: "ML Engineer",
		salary: 165000,
		location: "San Francisco",
		status: "active",
		joinedAt: "2020-11-19",
	},
	{
		id: 14,
		name: "Nathan Clark",
		department: "Finance",
		role: "Financial Analyst",
		salary: 105000,
		location: "New York",
		status: "on-leave",
		joinedAt: "2021-03-08",
	},
	{
		id: 15,
		name: "Olivia Scott",
		department: "Marketing",
		role: "Marketing Manager",
		salary: 118000,
		location: "Chicago",
		status: "active",
		joinedAt: "2020-07-14",
	},
	{
		id: 16,
		name: "Paul Adams",
		department: "Engineering",
		role: "Principal Engineer",
		salary: 210000,
		location: "Remote",
		status: "active",
		joinedAt: "2018-10-01",
	},
	{
		id: 17,
		name: "Quinn Nelson",
		department: "Design",
		role: "Design Lead",
		salary: 140000,
		location: "New York",
		status: "active",
		joinedAt: "2019-04-25",
	},
	{
		id: 18,
		name: "Rachel Hall",
		department: "HR",
		role: "Recruiter",
		salary: 88000,
		location: "Austin",
		status: "inactive",
		joinedAt: "2022-06-20",
	},
	{
		id: 19,
		name: "Sam Young",
		department: "Engineering",
		role: "Security Engineer",
		salary: 150000,
		location: "Seattle",
		status: "active",
		joinedAt: "2021-12-01",
	},
	{
		id: 20,
		name: "Tina Rodriguez",
		department: "Marketing",
		role: "Content Strategist",
		salary: 95000,
		location: "Remote",
		status: "active",
		joinedAt: "2022-03-29",
	},
	{
		id: 21,
		name: "Uma Flores",
		department: "Finance",
		role: "CFO",
		salary: 280000,
		location: "New York",
		status: "active",
		joinedAt: "2017-08-15",
	},
	{
		id: 22,
		name: "Victor Perez",
		department: "Engineering",
		role: "Engineering Manager",
		salary: 195000,
		location: "San Francisco",
		status: "active",
		joinedAt: "2019-09-03",
	},
	{
		id: 23,
		name: "Wendy Turner",
		department: "Product",
		role: "VP of Product",
		salary: 230000,
		location: "San Francisco",
		status: "active",
		joinedAt: "2018-02-11",
	},
	{
		id: 24,
		name: "Xavier Hill",
		department: "Sales",
		role: "SDR",
		salary: 72000,
		location: "Chicago",
		status: "active",
		joinedAt: "2023-01-16",
	},
	{
		id: 25,
		name: "Yara Sanchez",
		department: "Engineering",
		role: "QA Engineer",
		salary: 112000,
		location: "Austin",
		status: "active",
		joinedAt: "2022-10-10",
	},
];

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<Employee["status"], string> = {
	active:
		"bg-green-100 text-green-700  dark:bg-green-900/30  dark:text-green-400",
	inactive:
		"bg-gray-100  text-gray-600   dark:bg-gray-800      dark:text-gray-400",
	"on-leave":
		"bg-amber-100 text-amber-700  dark:bg-amber-900/30  dark:text-amber-400",
};

const STATUS_LABEL: Record<Employee["status"], string> = {
	active: "Active",
	inactive: "Inactive",
	"on-leave": "On Leave",
};

// ─── Department colours ───────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
	Engineering:
		"bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
	Design:
		"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
	Product:
		"bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
	Sales:
		"bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400",
	HR: "bg-pink-100   text-pink-700   dark:bg-pink-900/30   dark:text-pink-400",
	Finance:
		"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
	Marketing:
		"bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-400",
};

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: ColumnDef<Employee, unknown>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Name" />
		),
		cell: ({ getValue }) => (
			<span className="font-medium">{String(getValue())}</span>
		),
	},
	{
		accessorKey: "department",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Department" />
		),
		cell: ({ getValue }) => {
			const dept = String(getValue());
			const cls = DEPT_COLORS[dept] ?? "bg-gray-100 text-gray-700";
			return (
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
				>
					{dept}
				</span>
			);
		},
		size: 140,
	},
	{
		accessorKey: "role",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Role" />
		),
		cell: ({ getValue }) => (
			<span className="text-sm text-muted-foreground">
				{String(getValue())}
			</span>
		),
	},
	{
		accessorKey: "salary",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Salary" />
		),
		cell: ({ getValue }) => (
			<span className="font-mono font-semibold text-emerald-500">
				${(getValue() as number).toLocaleString()}
			</span>
		),
		size: 120,
	},
	{
		accessorKey: "location",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Location" />
		),
		cell: ({ getValue }) => (
			<span className="text-sm">{String(getValue())}</span>
		),
		size: 130,
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Status" />
		),
		cell: ({ getValue }) => {
			const val = String(getValue()) as Employee["status"];
			const cls = STATUS_BADGE[val] ?? "bg-gray-100 text-gray-700";
			return (
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
				>
					{STATUS_LABEL[val] ?? val}
				</span>
			);
		},
		size: 100,
	},
	{
		accessorKey: "joinedAt",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Joined" />
		),
		cell: ({ getValue }) => (
			<span className="text-sm text-muted-foreground">
				{new Date(getValue() as string).toLocaleDateString("en-US")}
			</span>
		),
		size: 110,
	},
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function EmployeesStaticPage() {
	const adapter = useMemo(() => createStaticAdapter<Employee>(EMPLOYEES), []);

	return (
		<div className="p-8 space-y-4">
			<div className="flex items-center gap-2">
				<h1 className="text-2xl font-bold">Employees</h1>
				<Badge variant="secondary">Static Adapter</Badge>
			</div>
			<p className="text-sm text-muted-foreground">
				Uses <code>createStaticAdapter</code> with in-memory data — no backend
				required. Supports client-side search, sort, pagination, and export out
				of the box.
			</p>

			<DataTable<Employee>
				adapter={adapter}
				columns={columns}
				config={{
					enableSearch: true,
					enableExport: true,
					enableColumnResizing: true,
					defaultPageSize: 10,
					pageSizeOptions: [5, 10, 20, 50],
					columnResizingTableId: "employees-static",
				}}
			/>
		</div>
	);
}
