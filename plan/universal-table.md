# Universal Table Component Plan

## 1. Overview & Vision
The "Universal Table" is a schema-driven, Shadcn-styled React component that serves as the frontend for the TableCraft ecosystem. It is designed to be:
- **Protocol-Agnostic:** Can work with any backend that adheres to the TableCraft protocol.
- **Hybrid Rendering:** Supports both Server-Side Rendering (SSR) for SEO/Performance and Client-Side Rendering (CSR) for interactivity.
- **Extensible:** Built on Shadcn UI and TanStack Table, allowing full customization via slots, custom renderers, and themes.

## 2. Architecture

### 2.1 Extensibility Model
The table is built to be extended, not just configured.

*   **Custom Renderers (Drop-in):**
    *   Developers can register custom cell types (e.g., `user-card`, `status-badge`, `sparkline`).
    *   The engine returns the `cellType` string, and the frontend maps it to a React component.
*   **Theme Overrides:**
    *   Uses CSS variables for deep theming without prop drilling.
    *   Compatible with Tailwind CSS and Shadcn theming system.
*   **Plugins:**
    *   Functionality like "Export to CSV", "Bulk Actions", or "Row Reordering" are implemented as plugins/hooks.

### 2.2 Rendering Strategy (SSR vs CSR)
The component automatically detects the environment and data availability.

*   **Server-Side Rendering (SSR):**
    *   **Use Case:** Large datasets, SEO requirements, initial load performance.
    *   **Mechanism:** `initialData` prop is passed from a Server Component (Next.js). The table renders immediately without a loading state.
    *   **Code Example:**
        ```tsx
        // Server Page
        async function Page() {
          const data = await fetch('/api/activities');
          return <AutoTable initialData={data} endpoint="/api/activities" />;
        }
        ```

*   **Client-Side Rendering (CSR):**
    *   **Use Case:** highly interactive dashboards, simple admin panels.
    *   **Mechanism:** No `initialData` provided. The component fetches data on mount using the `useTableData` hook.

*   **Hybrid Mode:**
    *   Loads with SSR data for FCP (First Contentful Paint).
    *   Hydrates and switches to Client-Side fetching for subsequent interactions (pagination, filtering) to avoid full page reloads.

### 2.3 Data Operations (Server vs Client)
The table supports both modes, controlled by the Adapter capabilities.

*   **Server-Side Operations (Preferred):**
    *   Pagination, Sorting, Filtering, and Search happen on the backend.
    *   Frontend sends parameters: `?page=2&sort=-createdAt&filter[status]=active`.
*   **Client-Side Operations (Fallback):**
    *   If the adapter indicates no server capability, the table fetches all data (or uses provided data) and handles slicing/sorting in the browser using TanStack Table's features.

### 2.4 Adapter Pattern
Adapters abstract the communication with the backend.

*   **Interface:** `buildUrl(endpoint, params)` and `parseResponse(response)`.
*   **Examples:**
    *   `NocoDBAdapter`: Maps TableCraft params to NocoDB API format.
    *   `SimpleRestAdapter`: Standard REST implementation.
    *   `TableCraftAdapter`: Native adapter for the Backend Engine.

## 3. Implementation Details

### 3.1 Core Component: `<AutoTable />`
The main entry point that wires everything together.

*   **Props:**
    *   `config`: The TableConfig object (columns, filters, etc.).
    *   `endpoint`: API URL.
    *   `initialData`: For SSR.
    *   `adapter`: Data fetching logic.
*   **State Management:**
    *   Uses `useUrlState` to sync filters/sort/page with the URL query parameters (shareable URLs).
    *   Manages internal state for "dirty" filters before applying.

### 3.2 Custom Hooks
*   `useTableData`: Handles data fetching, caching, and loading states. Supports aborting requests.
*   `useFilters`: Manages complex filter state (multi-select, ranges, dates).
*   `usePagination`: Handles page size, current page, and navigation logic.
*   `useSort`: Manages multi-column sorting state.

### 3.3 Cell Renderers
A registry of components mapping `cellType` to UI.

*   **Standard Types:** `text`, `number`, `date`, `boolean`, `link`, `image`.
*   **Rich Types:**
    *   `badge`: Status indicators with variant mapping.
    *   `avatar`: User avatars with fallbacks.
    *   `progress`: Visual progress bars.
    *   `tags`: Array of badges.
    *   `actions`: Row-level action buttons (Edit, Delete).

## 4. Development Roadmap (Frontend)

### Phase 4: Core Table Component (Weeks 8-10)
*   **Week 8:**
    *   Implement `<AutoTable />` shell.
    *   Integrate TanStack Table.
    *   Build `TablePagination` and `TableToolbar`.
*   **Week 9:**
    *   Implement `TableFilters` (Select, DateRange, etc.).
    *   Implement `TableSearch` with debounce.
    *   Create standard Cell Renderers.
*   **Week 10:**
    *   Add "Slot" system for custom headers/footers.
    *   Implement `ExportButton` (CSV/JSON).
    *   Finalize theming and polish.

### Phase 5: Visual Builder (Weeks 11-14)
A GUI to generate the Backend Engine Configuration.
*   **Features:**
    *   Drag-and-drop column reordering.
    *   Visual join builder.
    *   Filter configuration UI.
    *   Live preview using actual data.
*   **Output:** Generates the JSON/TypeScript config file for the backend.

### Phase 6: AI Integration (Weeks 15-16)
*   **"Generate Table from Prompt":** User describes "Bookings table with customer details", AI generates the full Config + Schema.
*   **"Explain Query":** Explains the generated Drizzle query in plain English.