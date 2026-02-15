# TableCraft Fixes & Improvements

## 🚨 Critical UI Fixes (Vite Example)
- [x] **Navigation Refactor**: Move Sidebar to Top Navigation Menu in `App.tsx`.
- [x] **Full Width Layout**: Remove `container` constraints from page layouts to allow tables to take full width.
- [x] **Cleanup**: Remove "About This Demo" cards from all pages.

## 🛠️ Package Fixes (@tablecraft/table)
- [x] **Export Menu Styling**: Fix the `DataTableExport` component. Currently, it renders a custom `div` that might look broken. Replace with `DropdownMenu` or fix Tailwind classes for better visuals and z-indexing.
- [x] **View Options Fix**: Investigate why "No columns found" appears in `DataTableViewOptions`. Ensure it correctly filters and displays toggleable columns.
- [x] **Column Widths**: Ensure default column widths are reasonable and resizing works without visual glitches.
- [x] **Header UI**: Fix resize handle positioning and table header background/layout.

## 📦 Build & Verify
- [x] Run `typecheck` on the package.
- [x] Build the package.
- [ ] Verify changes in `vite-web-example`.