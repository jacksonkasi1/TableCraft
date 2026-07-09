export interface EmployeeRow extends Record<string, unknown> {
  id: string;
  name: string;
  department: string;
  team: string;
  role: string;
  salary: number;
  location: string;
  startDate: string;
}

export const EMPLOYEES_DATA: EmployeeRow[] = [
  { id: "1",  name: "Alice Chen",      department: "Engineering", team: "Frontend",  role: "Senior Engineer",    salary: 130000, location: "San Francisco", startDate: "2021-03-01" },
  { id: "2",  name: "Bob Martinez",    department: "Engineering", team: "Frontend",  role: "Junior Engineer",    salary: 85000,  location: "New York",      startDate: "2023-06-15" },
  { id: "3",  name: "Carol Kim",       department: "Engineering", team: "Backend",   role: "Staff Engineer",     salary: 155000, location: "Remote",        startDate: "2019-11-20" },
  { id: "4",  name: "David Park",      department: "Engineering", team: "Backend",   role: "Senior Engineer",    salary: 135000, location: "San Francisco", startDate: "2020-07-10" },
  { id: "5",  name: "Eva Rossi",       department: "Design",      team: "UX",        role: "Lead Designer",      salary: 120000, location: "New York",      startDate: "2020-02-14" },
  { id: "6",  name: "Frank Nguyen",    department: "Design",      team: "UX",        role: "Designer",           salary: 95000,  location: "San Francisco", startDate: "2022-09-01" },
  { id: "7",  name: "Grace Liu",       department: "Design",      team: "Brand",     role: "Senior Designer",    salary: 110000, location: "Remote",        startDate: "2021-05-17" },
  { id: "8",  name: "Hiro Tanaka",     department: "Product",     team: "Growth",    role: "PM",                 salary: 140000, location: "San Francisco", startDate: "2020-01-06" },
  { id: "9",  name: "Isla Scott",      department: "Product",     team: "Core",      role: "Senior PM",          salary: 160000, location: "New York",      startDate: "2018-08-22" },
  { id: "10", name: "James O'Brien",   department: "Product",     team: "Growth",    role: "APM",                salary: 90000,  location: "Remote",        startDate: "2023-01-10" },
  { id: "11", name: "Karen White",     department: "Engineering", team: "Platform",  role: "Principal Engineer", salary: 180000, location: "San Francisco", startDate: "2017-04-03" },
  { id: "12", name: "Leo Santos",      department: "Engineering", team: "Platform",  role: "Senior Engineer",    salary: 145000, location: "Remote",        startDate: "2021-08-19" },
  { id: "13", name: "Maya Patel",      department: "Design",      team: "Brand",     role: "Designer",           salary: 90000,  location: "New York",      startDate: "2022-11-07" },
  { id: "14", name: "Nate Johnson",    department: "Product",     team: "Core",      role: "PM",                 salary: 135000, location: "San Francisco", startDate: "2019-09-14" },
  { id: "15", name: "Olivia Brown",    department: "Engineering", team: "Frontend",  role: "Senior Engineer",    salary: 140000, location: "New York",      startDate: "2020-12-01" },
];
