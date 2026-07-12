import { db } from './index';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

let randomState = 0x5eed1234;

/** Deterministic PRNG so repeated destructive seeds produce identical data. */
function random(): number {
  randomState = (1664525 * randomState + 1013904223) >>> 0;
  return randomState / 0x100000000;
}

// ── Regions (60) ─────────────────────────────────────────────────────────────
const regions = [
  { id: 'r01', name: 'Northeast US',       totalSales: 52400, revenue: 1380000, stores: 14, avgRating: 4.5 },
  { id: 'r02', name: 'Southeast US',       totalSales: 44200, revenue: 1140000, stores: 11, avgRating: 4.3 },
  { id: 'r03', name: 'Midwest US',         totalSales: 38600, revenue:  980000, stores: 10, avgRating: 4.2 },
  { id: 'r04', name: 'Southwest US',       totalSales: 41800, revenue: 1060000, stores: 11, avgRating: 4.4 },
  { id: 'r05', name: 'West Coast US',      totalSales: 57300, revenue: 1520000, stores: 15, avgRating: 4.6 },
  { id: 'r06', name: 'Pacific Northwest',  totalSales: 33200, revenue:  860000, stores:  8, avgRating: 4.5 },
  { id: 'r07', name: 'Mountain West',      totalSales: 29800, revenue:  740000, stores:  7, avgRating: 4.3 },
  { id: 'r08', name: 'Great Plains',       totalSales: 24100, revenue:  610000, stores:  6, avgRating: 4.1 },
  { id: 'r09', name: 'New England',        totalSales: 31400, revenue:  820000, stores:  8, avgRating: 4.4 },
  { id: 'r10', name: 'Mid-Atlantic',       totalSales: 48900, revenue: 1260000, stores: 13, avgRating: 4.5 },
  { id: 'r11', name: 'Western Canada',     totalSales: 27600, revenue:  710000, stores:  7, avgRating: 4.3 },
  { id: 'r12', name: 'Eastern Canada',     totalSales: 22400, revenue:  570000, stores:  6, avgRating: 4.2 },
  { id: 'r13', name: 'Central Canada',     totalSales: 18900, revenue:  470000, stores:  5, avgRating: 4.0 },
  { id: 'r14', name: 'Mexico',             totalSales: 21300, revenue:  530000, stores:  6, avgRating: 4.1 },
  { id: 'r15', name: 'Central America',   totalSales: 14700, revenue:  360000, stores:  4, avgRating: 3.9 },
  { id: 'r16', name: 'UK & Ireland',       totalSales: 45800, revenue: 1190000, stores: 12, avgRating: 4.4 },
  { id: 'r17', name: 'France',             totalSales: 38200, revenue:  980000, stores: 10, avgRating: 4.3 },
  { id: 'r18', name: 'Germany',            totalSales: 43600, revenue: 1120000, stores: 11, avgRating: 4.4 },
  { id: 'r19', name: 'Benelux',            totalSales: 29100, revenue:  740000, stores:  7, avgRating: 4.3 },
  { id: 'r20', name: 'Nordics',            totalSales: 33700, revenue:  870000, stores:  9, avgRating: 4.5 },
  { id: 'r21', name: 'Iberia',             totalSales: 26400, revenue:  670000, stores:  7, avgRating: 4.2 },
  { id: 'r22', name: 'Italy',              totalSales: 31800, revenue:  810000, stores:  8, avgRating: 4.3 },
  { id: 'r23', name: 'Eastern Europe',     totalSales: 22600, revenue:  560000, stores:  6, avgRating: 4.0 },
  { id: 'r24', name: 'DACH Extended',      totalSales: 19400, revenue:  490000, stores:  5, avgRating: 4.1 },
  { id: 'r25', name: 'Baltics',            totalSales: 11200, revenue:  280000, stores:  3, avgRating: 3.9 },
  { id: 'r26', name: 'Japan',              totalSales: 49200, revenue: 1280000, stores: 13, avgRating: 4.7 },
  { id: 'r27', name: 'South Korea',        totalSales: 38700, revenue: 1000000, stores: 10, avgRating: 4.5 },
  { id: 'r28', name: 'Greater China',      totalSales: 62100, revenue: 1640000, stores: 16, avgRating: 4.4 },
  { id: 'r29', name: 'Southeast Asia',     totalSales: 44300, revenue: 1130000, stores: 11, avgRating: 4.3 },
  { id: 'r30', name: 'India',              totalSales: 36800, revenue:  940000, stores:  9, avgRating: 4.2 },
  { id: 'r31', name: 'Australia',          totalSales: 31200, revenue:  810000, stores:  8, avgRating: 4.4 },
  { id: 'r32', name: 'New Zealand',        totalSales: 14800, revenue:  380000, stores:  4, avgRating: 4.3 },
  { id: 'r33', name: 'Middle East',        totalSales: 28400, revenue:  730000, stores:  7, avgRating: 4.2 },
  { id: 'r34', name: 'North Africa',       totalSales: 16200, revenue:  410000, stores:  4, avgRating: 3.9 },
  { id: 'r35', name: 'Sub-Saharan Africa', totalSales: 12900, revenue:  320000, stores:  3, avgRating: 3.8 },
  { id: 'r36', name: 'Brazil',             totalSales: 33600, revenue:  870000, stores:  9, avgRating: 4.1 },
  { id: 'r37', name: 'Argentina',          totalSales: 19200, revenue:  490000, stores:  5, avgRating: 4.0 },
  { id: 'r38', name: 'Colombia',           totalSales: 16400, revenue:  410000, stores:  4, avgRating: 3.9 },
  { id: 'r39', name: 'Chile',              totalSales: 14100, revenue:  360000, stores:  4, avgRating: 4.0 },
  { id: 'r40', name: 'Peru',               totalSales: 11800, revenue:  290000, stores:  3, avgRating: 3.8 },
  { id: 'r41', name: 'Taiwan',             totalSales: 22600, revenue:  580000, stores:  6, avgRating: 4.4 },
  { id: 'r42', name: 'Hong Kong',          totalSales: 24100, revenue:  630000, stores:  6, avgRating: 4.5 },
  { id: 'r43', name: 'Philippines',        totalSales: 18300, revenue:  460000, stores:  5, avgRating: 4.1 },
  { id: 'r44', name: 'Indonesia',          totalSales: 21700, revenue:  550000, stores:  6, avgRating: 4.0 },
  { id: 'r45', name: 'Malaysia',           totalSales: 17400, revenue:  440000, stores:  5, avgRating: 4.2 },
  { id: 'r46', name: 'Thailand',           totalSales: 19800, revenue:  500000, stores:  5, avgRating: 4.1 },
  { id: 'r47', name: 'Vietnam',            totalSales: 15200, revenue:  380000, stores:  4, avgRating: 4.0 },
  { id: 'r48', name: 'Pakistan',           totalSales: 11600, revenue:  290000, stores:  3, avgRating: 3.8 },
  { id: 'r49', name: 'Bangladesh',         totalSales:  9800, revenue:  240000, stores:  3, avgRating: 3.7 },
  { id: 'r50', name: 'Sri Lanka',          totalSales:  8400, revenue:  210000, stores:  2, avgRating: 3.9 },
  { id: 'r51', name: 'UAE',                totalSales: 26800, revenue:  690000, stores:  7, avgRating: 4.4 },
  { id: 'r52', name: 'Saudi Arabia',       totalSales: 23400, revenue:  600000, stores:  6, avgRating: 4.1 },
  { id: 'r53', name: 'Israel',             totalSales: 17200, revenue:  440000, stores:  5, avgRating: 4.3 },
  { id: 'r54', name: 'Turkey',             totalSales: 19600, revenue:  500000, stores:  5, avgRating: 4.0 },
  { id: 'r55', name: 'Poland',             totalSales: 18100, revenue:  460000, stores:  5, avgRating: 4.1 },
  { id: 'r56', name: 'Czech Republic',     totalSales: 14600, revenue:  370000, stores:  4, avgRating: 4.0 },
  { id: 'r57', name: 'Romania',            totalSales: 12300, revenue:  310000, stores:  3, avgRating: 3.9 },
  { id: 'r58', name: 'Greece',             totalSales: 11800, revenue:  300000, stores:  3, avgRating: 4.0 },
  { id: 'r59', name: 'Portugal',           totalSales: 13200, revenue:  340000, stores:  4, avgRating: 4.1 },
  { id: 'r60', name: 'Hungary',            totalSales: 10900, revenue:  270000, stores:  3, avgRating: 3.9 },
];

// ── Stores (3 per region for r01-r10 to demonstrate children, 2 per region for rest) ──────
function makeStores() {
  const stores: { id: string; regionId: string; name: string; totalSales: number; revenue: number; avgRating: number }[] = [];
  let idx = 1;
  const storeNames: Record<string, string[]> = {
    r01: ['NYC Flagship', 'Boston Commons', 'Philadelphia Center'],
    r02: ['Miami Beach', 'Atlanta Peachtree', 'Charlotte Uptown'],
    r03: ['Chicago Michigan Ave', 'Detroit Metro', 'Minneapolis Loop'],
    r04: ['Dallas Downtown', 'Phoenix Scottsdale', 'Las Vegas Strip'],
    r05: ['LA Beverly', 'San Francisco Union Sq', 'San Diego Gaslamp'],
    r06: ['Seattle Pike Place', 'Portland Pearl'],
    r07: ['Denver Cherry Creek', 'Salt Lake City'],
    r08: ['Kansas City Plaza', 'Omaha Old Market'],
    r09: ['Boston Newbury', 'Providence Downtown'],
    r10: ['NYC Times Square', 'Washington DC Georgetown', 'Baltimore Inner Harbor'],
    r11: ['Vancouver Pacific Centre', 'Calgary Stephen Ave'],
    r12: ['Toronto Eaton Centre', 'Montreal Sainte-Catherine'],
    r13: ['Winnipeg Portage', 'Regina Downtown'],
    r14: ['Mexico City Polanco', 'Guadalajara Centro'],
    r15: ['San José Downtown', 'Guatemala City'],
    r16: ['London Oxford St', 'Manchester Arndale', 'Dublin Grafton St'],
    r17: ['Paris Champs-Élysées', 'Lyon Bellecour', 'Marseille Canebière'],
    r18: ['Berlin Mitte', 'Munich Maximilianstr', 'Hamburg Jungfernstieg'],
    r19: ['Amsterdam Kalverstr', 'Brussels Grand Place'],
    r20: ['Stockholm Drottningg', 'Oslo Karl Johans', 'Helsinki Esplanadi'],
    r21: ['Madrid Gran Via', 'Barcelona Passeig de Gràcia'],
    r22: ['Milan Corso Buenos Aires', 'Rome Via Condotti', 'Florence Via Tornabuoni'],
    r23: ['Warsaw Nowy Świat', 'Prague Wenceslas Sq'],
    r24: ['Zurich Bahnhofstr', 'Vienna Mariahilfer'],
    r25: ['Tallinn Old Town', 'Riga Center'],
    r26: ['Tokyo Shibuya', 'Osaka Shinsaibashi', 'Kyoto Kawaramachi'],
    r27: ['Seoul Gangnam', 'Busan Seomyeon'],
    r28: ['Shanghai Nanjing Rd', 'Beijing Wangfujing', 'Guangzhou Beijing Rd', 'Shenzhen Luohu'],
    r29: ['Singapore CBD', 'Bangkok Siam', 'Kuala Lumpur KLCC'],
    r30: ['Mumbai Colaba', 'Delhi Connaught Pl', 'Bangalore MG Road'],
    r31: ['Sydney CBD', 'Melbourne Bourke St', 'Brisbane Queen St'],
    r32: ['Auckland Queen St', 'Wellington Lambton Quay'],
    r33: ['Dubai Mall', 'Riyadh Tahlia St'],
    r34: ['Cairo Zamalek', 'Casablanca Maarif'],
    r35: ['Lagos Victoria Island', 'Nairobi Westlands'],
    r36: ['São Paulo Paulista', 'Rio Ipanema', 'Brasília Asa Norte'],
    r37: ['Buenos Aires Palermo', 'Córdoba Nueva Córdoba'],
    r38: ['Bogotá Zona Rosa', 'Medellín El Poblado'],
    r39: ['Santiago Las Condes', 'Viña del Mar'],
    r40: ['Lima Miraflores', 'Arequipa Centro'],
    r41: ['Taipei Xinyi', 'Kaohsiung Zuoying'],
    r42: ['Hong Kong Central', 'Kowloon Mong Kok'],
    r43: ['Manila BGC', 'Cebu IT Park'],
    r44: ['Jakarta Sudirman', 'Bali Seminyak'],
    r45: ['Kuala Lumpur Pavilion', 'Penang Georgetown'],
    r46: ['Bangkok Asok', 'Chiang Mai Nimman'],
    r47: ['Ho Chi Minh City D1', 'Hanoi Hoan Kiem'],
    r48: ['Karachi Clifton', 'Lahore MM Alam Rd'],
    r49: ['Dhaka Gulshan', 'Chittagong Agrabad'],
    r50: ['Colombo Fort', 'Kandy City Centre'],
    r51: ['Dubai Marina', 'Abu Dhabi Corniche', 'Sharjah City Centre'],
    r52: ['Riyadh Kingdom Tower', 'Jeddah Corniche'],
    r53: ['Tel Aviv Dizengoff', 'Jerusalem Mamilla'],
    r54: ['Istanbul Istiklal', 'Ankara Tunalı'],
    r55: ['Warsaw Arkadia', 'Kraków Galeria'],
    r56: ['Prague Palladium', 'Brno Olympia'],
    r57: ['Bucharest AFI Palace', 'Cluj-Napoca'],
    r58: ['Athens Kolonaki', 'Thessaloniki Tsimiski'],
    r59: ['Lisbon Chiado', 'Porto Boavista'],
    r60: ['Budapest Váci Str', 'Debrecen Forum'],
  };

  for (const region of regions) {
    const names = storeNames[region.id] ?? [`${region.name} Store 1`, `${region.name} Store 2`];
    for (let i = 0; i < names.length; i++) {
      const sid = `s${String(idx).padStart(3, '0')}`;
      const share = 1 / names.length;
      stores.push({
        id: sid,
        regionId: region.id,
        name: names[i],
        totalSales: Math.round(region.totalSales * share * (0.85 + random() * 0.3)),
        revenue: Math.round(region.revenue * share * (0.85 + random() * 0.3)),
        avgRating: Math.round((region.avgRating + (random() * 0.4 - 0.2)) * 10) / 10,
      });
      idx++;
    }
  }
  return stores;
}

const PRODUCT_POOL = [
  'Wireless Headphones', 'Laptop Stand', 'USB-C Hub', 'Mechanical Keyboard',
  'Webcam 4K', 'Desk Mat XL', 'Monitor 27"', 'Smart Speaker', 'Cable Organizer',
  'Noise-Cancel Earbuds', 'Portable Charger', 'Phone Stand', 'LED Desk Lamp',
  'Ergonomic Mouse', 'Monitor Light Bar', 'Smart Watch', 'Laptop Sleeve',
  'Mini Projector', 'Wireless Charger', 'Cable Clip Pack', 'Screen Protector',
  'Drawing Tablet', 'Streaming Mic', 'RGB Keyboard Wrist Rest', 'USB Docking Station',
  'Laptop Cooling Pad', 'Mechanical Numpad', 'Smart Ring', 'AR Glasses',
  'Portable SSD 1TB',
];

function makeProducts(stores: ReturnType<typeof makeStores>) {
  const products: { id: string; storeId: string; name: string; totalSales: number; revenue: number; avgRating: number }[] = [];
  let idx = 1;
  for (const store of stores) {
    // 3 products per store
    const usedNames = new Set<string>();
    for (let i = 0; i < 3; i++) {
      let name: string;
      do { name = PRODUCT_POOL[Math.floor(random() * PRODUCT_POOL.length)]; } while (usedNames.has(name));
      usedNames.add(name);
      const pid = `p${String(idx).padStart(4, '0')}`;
      const sales = Math.round(store.totalSales * 0.33 * (0.8 + random() * 0.4));
      products.push({
        id: pid,
        storeId: store.id,
        name,
        totalSales: sales,
        revenue: Math.round(sales * (20 + random() * 30)),
        avgRating: Math.round((store.avgRating + (random() * 0.4 - 0.2)) * 10) / 10,
      });
      idx++;
    }
  }
  return products;
}

async function seed() {
  console.warn('DESTRUCTIVE: truncating and reseeding all retail demo tables.');

  randomState = 0x5eed1234;
  const stores = makeStores();
  const storeCounts = new Map<string, number>();
  for (const store of stores) {
    storeCounts.set(store.regionId, (storeCounts.get(store.regionId) ?? 0) + 1);
  }
  const coherentRegions = regions.map((region) => ({
    ...region,
    stores: storeCounts.get(region.id) ?? 0,
  }));

  await db.execute(sql`TRUNCATE retail_products, retail_stores, retail_regions RESTART IDENTITY CASCADE`);

  await db.insert(schema.retailRegions).values(coherentRegions);
  console.log(`  ✓ ${coherentRegions.length} regions`);

  await db.insert(schema.retailStores).values(stores);
  console.log(`  ✓ ${stores.length} stores`);

  const products = makeProducts(stores);
  await db.insert(schema.retailProducts).values(products);
  console.log(`  ✓ ${products.length} products`);

  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
