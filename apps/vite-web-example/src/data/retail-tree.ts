export interface RetailNode extends Record<string, unknown> {
  id: string;
  name: string;
  type: "Region" | "Store" | "Product";
  totalSales: number;
  revenue: number;
  stores: number | null;
  avgRating: number | null;
  breadcrumb?: string | null;
  children?: RetailNode[];
}

export const RETAIL_TREE: RetailNode[] = [
  {
    id: "r1",
    name: "North America",
    type: "Region",
    totalSales: 48200,
    revenue: 1240000,
    stores: 12,
    avgRating: 4.5,
    children: [
      {
        id: "s1",
        name: "NYC Flagship",
        type: "Store",
        totalSales: 18500,
        revenue: 520000,
        stores: null,
        avgRating: 4.7,
        children: [
          { id: "p1", name: "Wireless Headphones", type: "Product", totalSales: 6400, revenue: 192000, stores: null, avgRating: 4.8 },
          { id: "p2", name: "Laptop Stand",        type: "Product", totalSales: 4200, revenue: 126000, stores: null, avgRating: 4.6 },
          { id: "p3", name: "USB-C Hub",           type: "Product", totalSales: 7900, revenue: 202000, stores: null, avgRating: 4.7 },
        ],
      },
      {
        id: "s2",
        name: "Chicago Downtown",
        type: "Store",
        totalSales: 14800,
        revenue: 360000,
        stores: null,
        avgRating: 4.4,
        children: [
          { id: "p4", name: "Mechanical Keyboard", type: "Product", totalSales: 5100, revenue: 153000, stores: null, avgRating: 4.5 },
          { id: "p5", name: "Webcam 4K",           type: "Product", totalSales: 3400, revenue: 102000, stores: null, avgRating: 4.3 },
          { id: "p6", name: "Desk Mat XL",         type: "Product", totalSales: 6300, revenue: 105000, stores: null, avgRating: 4.4 },
        ],
      },
      {
        id: "s3",
        name: "LA Beverly",
        type: "Store",
        totalSales: 14900,
        revenue: 360000,
        stores: null,
        avgRating: 4.4,
        children: [
          { id: "p7",  name: "Monitor 27\"",    type: "Product", totalSales: 4800, revenue: 192000, stores: null, avgRating: 4.6 },
          { id: "p8",  name: "Smart Speaker",   type: "Product", totalSales: 5200, revenue: 104000, stores: null, avgRating: 4.2 },
          { id: "p9",  name: "Cable Organizer", type: "Product", totalSales: 4900, revenue: 64000,  stores: null, avgRating: 4.4 },
        ],
      },
    ],
  },
  {
    id: "r2",
    name: "Europe",
    type: "Region",
    totalSales: 32400,
    revenue: 890000,
    stores: 8,
    avgRating: 4.3,
    children: [
      {
        id: "s4",
        name: "London Oxford St.",
        type: "Store",
        totalSales: 17200,
        revenue: 510000,
        stores: null,
        avgRating: 4.5,
        children: [
          { id: "p10", name: "Noise-Cancel Earbuds", type: "Product", totalSales: 7800, revenue: 234000, stores: null, avgRating: 4.6 },
          { id: "p11", name: "Portable Charger",     type: "Product", totalSales: 5400, revenue: 162000, stores: null, avgRating: 4.4 },
          { id: "p12", name: "Phone Stand",          type: "Product", totalSales: 4000, revenue: 114000, stores: null, avgRating: 4.5 },
        ],
      },
      {
        id: "s5",
        name: "Berlin Mitte",
        type: "Store",
        totalSales: 15200,
        revenue: 380000,
        stores: null,
        avgRating: 4.1,
        children: [
          { id: "p13", name: "LED Desk Lamp",    type: "Product", totalSales: 5600, revenue: 140000, stores: null, avgRating: 4.2 },
          { id: "p14", name: "Ergonomic Mouse",  type: "Product", totalSales: 4900, revenue: 122500, stores: null, avgRating: 4.0 },
          { id: "p15", name: "Monitor Light Bar", type: "Product", totalSales: 4700, revenue: 117500, stores: null, avgRating: 4.1 },
        ],
      },
    ],
  },
  {
    id: "r3",
    name: "Asia Pacific",
    type: "Region",
    totalSales: 29600,
    revenue: 760000,
    stores: 7,
    avgRating: 4.4,
    children: [
      {
        id: "s6",
        name: "Tokyo Shibuya",
        type: "Store",
        totalSales: 16400,
        revenue: 430000,
        stores: null,
        avgRating: 4.6,
        children: [
          { id: "p16", name: "Smart Watch",       type: "Product", totalSales: 6200, revenue: 186000, stores: null, avgRating: 4.7 },
          { id: "p17", name: "Laptop Sleeve",     type: "Product", totalSales: 5300, revenue: 106000, stores: null, avgRating: 4.5 },
          { id: "p18", name: "Mini Projector",    type: "Product", totalSales: 4900, revenue: 138000, stores: null, avgRating: 4.6 },
        ],
      },
      {
        id: "s7",
        name: "Singapore CBD",
        type: "Store",
        totalSales: 13200,
        revenue: 330000,
        stores: null,
        avgRating: 4.2,
        children: [
          { id: "p19", name: "Wireless Charger",  type: "Product", totalSales: 4800, revenue: 120000, stores: null, avgRating: 4.3 },
          { id: "p20", name: "Cable Clip Pack",   type: "Product", totalSales: 4200, revenue: 84000,  stores: null, avgRating: 4.1 },
          { id: "p21", name: "Screen Protector",  type: "Product", totalSales: 4200, revenue: 126000, stores: null, avgRating: 4.2 },
        ],
      },
    ],
  },
];
