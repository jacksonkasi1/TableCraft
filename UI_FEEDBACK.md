# UI Feedback & Issues

## User Reported Issues

1.  **Date Input Alignment**
    -   **Issue:** The date input should be positioned immediately next to the search input. Currently, they might be separated or wrapped incorrectly depending on screen size.
    -   **Location:** `packages/table/src/toolbar.tsx`
    -   **Action:** Verify the flex container behavior and order of elements. Ensure they stay on the same line if space permits.

2.  **Search Input Styling**
    -   **Issue:** The placeholder text in the search input lacks proper left spacing/padding. It likely looks cramped or is missing a search icon which usually provides this spacing.
    -   **Location:** `packages/table/src/toolbar.tsx`
    -   **Action:** Increase `px` (padding-left) or add a `Search` icon from `lucide-react` inside the input wrapper to provide visual balance.

3.  **Checkbox Alignment**
    -   **Issue:** The header checkbox is not aligned with the row checkboxes.
    -   **Location:** `packages/table/src/data-table.tsx`
    -   **Root Cause:** `th` has `px-2` while `td` has `px-4`.
    -   **Action:** Unify horizontal padding for checkbox cells in both header and body (e.g., use `px-4` for both).

4.  **Row Spacing & Padding**
    -   **Issue:** Padding or spacing on hover/click is not optimal.
    -   **Location:** `packages/table/src/data-table.tsx`
    -   **Action:** Review `td` padding (`p-2 px-4 py-2`). The `p-2` class might be conflicting with `px-4 py-2` or causing double padding. Simplify to a single padding strategy.

5.  **Column Drag/Grab Icon**
    -   **Issue:** No grab icon appears when hovering over columns to reorder them.
    -   **Location:** `packages/table/src/column-header.tsx`
    -   **Action:** Implement column reordering via drag-and-drop on the headers and show a `GripVertical` or similar cursor/icon on hover.

6.  **Header Height**
    -   **Issue:** Table header height is too small.
    -   **Location:** `packages/table/src/data-table.tsx`
    -   **Action:** Increase `th` height from `h-10` to `h-12` (48px) or user preference.

7.  **Row Actions (Three Dots)**
    -   **Issue:** Missing "Actions" menu (three dots) on rows.
    -   **Location:** `packages/table/src/data-table.tsx` / `packages/table/src/auto/auto-columns.tsx`
    -   **Action:** Add a default "actions" column definition that renders a dropdown menu with common actions (Edit, Delete, etc.) or allows injection of custom actions.

8.  **Metadata Column**
    -   **Issue:** "Metadata" column is showing but should be hidden.
    -   **Location:** `packages/table/src/auto/auto-columns.tsx`
    -   **Action:** Filter out columns with key/name "metadata" by default, or ensure the backend metadata marks it as `hidden: true`.

9.  **Settings Button**
    -   **Issue:** The settings icon button in the top right is small and not a perfect square.
    -   **Location:** `packages/table/src/toolbar.tsx`
    -   **Action:** Check `getButtonSizeClass`. Ensure `w` and `h` are equal and `p-0` is applied for icon-only buttons. Verify `box-sizing` or border interactions.

## Additional Observations & Improvements

1.  **Padding Inconsistency in `data-table.tsx`**
    -   Table cells (`td`) have `className="p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] px-4 py-2 truncate max-w-0 text-left"`.
    -   **Observation:** `p-2` applies 0.5rem padding to all sides, but then `px-4 py-2` overrides it. This is redundant and potentially confusing. `max-w-0` with `truncate` might be too aggressive for some columns if they don't have a specific width set.

2.  **Date Input Interaction**
    -   **Observation:** The date input is a read-only text input (`type="text"`) that relies on an `onClick` handler (currently empty comment `// This will be handled by an external date picker component`).
    -   **Action:** It needs a real DatePicker component (like shadcn/ui Calendar + Popover) to be functional.

3.  **Search Input Icon**
    -   **Observation:** Standard search inputs usually include a magnifying glass icon. The current implementation is just a raw input.
    -   **Action:** Wrap the input in a relative div and position a `Search` icon absolute-left.

4.  **Empty State Styling**
    -   **Observation:** The "No results" row is basic (`h-24 text-center`).
    -   **Action:** Enhance with an icon or better typography to improve user experience.

5.  **Loading Skeleton**
    -   **Observation:** The loading state renders a simple `animate-pulse` div.
    -   **Action:** Consider matching the skeleton height to the actual row height to prevent layout shift, or use a more polished skeleton component.

6.  **Toolbar Responsive Behavior**
    -   **Observation:** The toolbar uses `flex-wrap`. On smaller screens, the layout might break awkwardly.
    -   **Action:** Verify responsive behavior and maybe stack filters vertically on mobile.

## Knowledge Transfer (KT) & Current Status

### Goal
Align the `TableCraft` UI with the user's design requirements, specifically focusing on the Toolbar and Table Header aesthetics and layout.

### Accomplished Fixes
1.  **Toolbar Layout**:
    -   Implemented `startToolbarContent` prop in `DataTable` to allow injecting content (like the Date Picker) directly into the toolbar's left section.
    -   Grouped Search and Date inputs in a flex container to ensure they stay side-by-side.
    -   **File(s):** `packages/table/src/toolbar.tsx`, `packages/table/src/data-table.tsx`, `packages/table/src/types.ts`

2.  **Search Input**:
    -   Added `Search` icon from `lucide-react` inside the input wrapper.
    -   Increased input left padding to `pl-12` (48px) to prevent text overlap with the icon.
    -   **File(s):** `packages/table/src/toolbar.tsx`

3.  **Table Headers**:
    -   Increased header height to `h-12` (48px).
    -   Increased column header button size to `h-9` (36px) with `px-4` padding for better hover states.
    -   Unified horizontal padding to `px-4` for both headers and cells to align checkboxes and content.
    -   **File(s):** `packages/table/src/data-table.tsx`, `packages/table/src/column-header.tsx`

### Pending / Next Steps
1.  **Column Drag/Grab**: Implement drag-and-drop reordering directly on column headers.
2.  **Row Actions**: Add default "Three Dots" menu for row actions.
3.  **Metadata Column**: Hide "metadata" column by default.
4.  **Settings Button**: Verify square aspect ratio for the settings icon button.
5.  **Empty State**: Improve "No results" visualization.