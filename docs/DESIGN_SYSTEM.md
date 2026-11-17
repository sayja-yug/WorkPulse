# WorkPulse Monochrome Design System & Frontend Architecture

## 1. Overview & Principles
WorkPulse HRMS has been re-architected into an enterprise-grade, strict monochrome (black-and-white) design system. It is engineered for high trust, legibility, and responsiveness across mobile (down to 360px), tablet, and desktop viewports, with support for both Light and Dark modes.

### Absolute Boundaries Maintained
1. **Zero Backend Changes:** No API routes, serializers, views, models, migrations, or server business rules were altered.
2. **Stable API Contracts:** All payload shapes, HTTP methods, headers, and query parameters remain identical.
3. **Preserved Frontend Logic:** State machines, data-fetching flows, auth handlers, and role-based permissions were untouched.

---

## 2. Color Palette & Tokens
The application relies on a strict grayscale palette defined in `tailwind.config.js` and `frontend/src/styles/globals.css`.

| Token | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `mono-bg` / `background` | `#FFFFFF` | `#000000` | Main application background |
| `mono-surface` / `card` | `#FFFFFF` | `#0A0A0A` (`zinc-900`) | Card containers, modal shells, table surfaces |
| `mono-surface-muted` | `#F4F4F5` (`zinc-100`) | `#18181B` (`zinc-800`) | Header rows, metric chip backgrounds, hover states |
| `mono-border` | `#E4E4E7` (`zinc-200`) | `#27272A` (`zinc-800`) | Clean 1px structural dividers |
| `mono-border-muted` | `#F4F4F5` (`zinc-100`) | `#18181B` (`zinc-850`) | Subtle item dividers |
| `mono-text` / `foreground` | `#09090B` (`zinc-950`) | `#FAFAFA` (`zinc-50`) | Primary headings, titles, active numbers |
| `mono-text-muted` | `#71717A` (`zinc-500`) | `#A1A1AA` (`zinc-400`) | Secondary descriptions, timestamps, subtitles |
| `mono-text-subtle` | `#A1A1AA` (`zinc-400`) | `#71717A` (`zinc-500`) | Captions, breadcrumb separators |
| `mono-accent` | `#000000` (`zinc-950`) | `#FFFFFF` (`zinc-100`) | Primary buttons, active tabs, focused elements |

> **Note on Semantic States:** Success, error, warning, and info states are rendered via monochrome styling plus distinct SVG icons (`CheckCircle2`, `AlertCircle`, `Clock`, `Shield`), clear status labels (`ACTIVE`, `INACTIVE`, `DISBURSED`, `APPROVED`), and contrast borders.

---

## 3. Light & Dark Mode Architecture
- **Provider:** `frontend/src/context/ThemeContext.jsx`
- **Toggle Component:** `frontend/src/components/ui/ThemeToggle.jsx`
- **Class Implementation:** `darkMode: 'class'` in Tailwind.
- **Persistence:** LocalStorage key `'workpulse_theme'` ('light' | 'dark' | 'system'). Default syncs automatically with user's OS preference (`prefers-color-scheme`).

---

## 4. Navigation & Layout Shell
1. **Desktop:**
   - **Collapsible Sidebar (`Sidebar.jsx`):** Collapsible via keyboard shortcut `Ctrl+B` or top-bar toggle. Includes company workspace switcher, real-time unread notification indicator, and pinned bottom user profile with logout.
   - **Desktop Top Bar:** Houses workspace / role breadcrumb indicator, search trigger, theme toggle, and user profile dropdown.
2. **Mobile:**
   - **Slide-in Drawer Menu:** Accessible via the mobile top-bar hamburger button or bottom navigation "More" tab.
   - **Mobile Top Bar:** Displays compact WorkPulse emblem, user badge, theme toggle, and prominent **Logout** button.
   - **Fixed Bottom Navigation:** 5 large touch-friendly targets (`>= 44x44px`) with safe-area inset support (`pb-safe`):
     - `Home` (`/`)
     - `Punch` (`/attendance`)
     - `Employees` / `Payslips`
     - `Payroll` / `Advances`
     - `More` (opens drawer)

---

## 5. Reusable Component Kit (`frontend/src/components/ui/`)
All UI primitives adhere to the monochrome design system:
- `Button.jsx`: Variants (`primary`, `secondary`, `ghost`, `danger`, `outline`, `icon`), with loading spinner and disabled states.
- `Input.jsx` & `Textarea.jsx`: Minimum 16px font-size on mobile viewports to prevent unwanted iOS auto-zoom; high-contrast focus rings.
- `Select.jsx`: Styled native selects with custom monochrome chevron.
- `Switch.jsx`, `Checkbox.jsx`, `Radio.jsx`: Accessible toggle controls.
- `Card.jsx`: Surface card with subtle border and optional header/content/footer slots.
- `Table.jsx`: Sticky header support, zebra/divider rows, and hover highlights.
- `Modal.jsx`: Centered dialog on desktop with mobile full-width bottom sheet adaptation, ESC dismiss, and backdrop blur.
- `Badge.jsx`: Variants (`default`, `neutral`, `outline`, `active`, `inactive`). Special non-clickable `INACTIVE` / `ACTIVE` duty indicator prevents user interaction confusion.
- `Dropdown.jsx` & `Tooltip.jsx`: Keyboard and click-outside friendly overlays.
- `Skeleton.jsx` & `EmptyState.jsx`: Zero-layout-shift (CLS) placeholders.

---

## 6. Page-by-Page Summary
All 21 application pages have been converted to the monochrome design system:
1. `Login.jsx` & `BusinessSelection.jsx`
2. `Dashboard.jsx` & `PlatformDashboard.jsx`
3. `Employees.jsx` & `EmployeeProfile.jsx`
4. `Attendance.jsx` & `Shifts.jsx`
5. `Leaves.jsx` & `Payroll.jsx`
6. `Advances.jsx` & `Expenses.jsx`
7. `Cashbook.jsx` & `Organization.jsx`
8. `FieldManagement.jsx` & `Reports.jsx`
9. `Notifications.jsx` & `RolesPermissions.jsx`
10. `Subscription.jsx`, `Settings.jsx` & `TestingPanel.jsx`

