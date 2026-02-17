# Budget Buddy - Complete Rebuild Plan

This document outlines the step-by-step plan to rebuild the **Budget Buddy** application from scratch, covering the complete frontend architecture, backend services, styling approach, and data layer.

## 1. Technology Stack
* **Frontend Framework**: React Native with Expo (Expo Router for file-based routing)
* **Styling**: NativeWind (Tailwind CSS for React Native) + `StyleSheet` for complex/animated properties.
* **Animations & UI Hook**: React Native Reanimated, Expo Linear Gradient, React Native Gesture Handler.
* **Charting**: `react-native-gifted-charts` for analytics data visualization.
* **Backend & Validation**: Supabase (PostgreSQL Database, Authentication).
* **Data Fetching Layer**: Custom API client (`utils/api.ts`) abstracting standard HTTP fetches with Bearer tokens.

---

## 2. Backend & Data Architecture Setup

### 2.1 Supabase Configuration
1. Initialize a new Supabase project.
2. Enable Email/Password authentication.
3. Setup `ExpoStorage` using `@react-native-async-storage/async-storage` for persisting the Supabase session on mobile devices.

### 2.2 Database Schema Plan
The backend requires the following core tables/models:
* **Users**: `id` (UUID), `supabaseId` (String), `email` (String), `name` (String, nullable), `currency` (String, default: USD).
* **Accounts**: `id` (UUID), `name` (String, e.g., 'Main Wallet'), `type` (String, e.g., 'cash'), `userId` (FK to Users).
* **Transactions**: `id` (UUID), `type` (Enum: 'income', 'expense'), `category` (String or FK to Categories), `amount` (Decimal), `description/note` (Text), `occurredAt/date` (Timestamp), `accountId` (FK to Accounts).
* **Categories**: `id` (UUID), `name` (String), `icon` (String - mapping to SF Symbols/Vector Icons), `color` (Hex string).

### 2.3 API Service Abstraction
Instead of directly calling Supabase clients in components, implement a centralized API handler (`utils/api.ts`) that appends the Supabase `access_token` to `Authorization: Bearer <token>` headers for secure routing. 

---

## 3. Frontend Architecture & Layouts

### 3.1 Core Styling & Theming System
* **Colors Configuration** (`constants/theme.ts`): Define `light` and `dark` objects containing structural colors (tint, background, tabIconDefault).
* **Global Background** (`app/_layout.tsx`): Implement a root layout enclosed in an `<LinearGradient>`:
  * *Dark Mode*: Deep Space (`['#0f0c29', '#302b63', '#24243e']`)
  * *Light Mode*: Sky Blue (`['#E0F2FE', '#F0F9FF', '#FFF7ED']`)

### 3.2 Global UI Components (`components/ui`)
Rebuild these foundational components first:
1. **GlassView**: A reusable translucent container using `expo-blur` or absolute positioned semi-transparent backgrounds with borders to create a glassmorphism effect.
2. **IconSymbol**: A unified icon wrapper addressing iOS (`SFSymbols`) and Android (`@expo/vector-icons`).
3. **DateNavigator**: A component for swiping or toggling between months/weeks in the Analytics view.
4. **SegmentedControl**: Custom animated toggle switch for alternating datasets (e.g., Income vs. Expense).
5. **CustomAlert**: Global alert/toast mechanism for handling API errors gracefully.

### 3.3 Application Navigation (Expo Router)
The routing tree structure:
```text
app/
 ├── _layout.tsx (Root Stack + Auth Guard)
 ├── index.tsx (Splash / Redirector)
 ├── login.tsx & signup.tsx (Auth flow)
 ├── forgot-password.tsx & complete-profile.tsx 
 └── (tabs)/
      ├── _layout.tsx (Custom Tab Bar Stack)
      ├── dashboard.tsx (Home - Summary & Recent)
      ├── transactions.tsx (List & Filter)
      ├── add.tsx (Create Transaction Form)
      ├── budget.tsx (Analytics & Charts)
      └── profile.tsx (Settings)
```

### 3.4 Custom Tab Bar Design
In `app/(tabs)/_layout.tsx`, override the default `bottom-tabs`:
* Hide default header and labels.
* Style the bounding box as a floating pill (absolute position, bottom 25, borderRadius 40).
* Use `GlassView` as the `tabBarBackground`.
* **Add Button Special Styling**: The center "Add" button should be elevated, circular, with a solid `#38BDF8` background and drop shadow to pop out from the glass bar.

---

## 4. Step-by-Step Implementation Roadmap

### Phase 1: Skeleton & Auth Foundation
1. `npx create-expo-app@latest -t tabs` and configure NativeWind.
2. Establish the `_layout.tsx` wrapper with ThemeProviders, LinearGradients, and Supabase init listener.
3. Build the Auth screens (`login`, `signup`) and implement the routing redirect logic (Deep linking + session validation).

### Phase 2: Core Layouts & Components
1. Recreate the Glassmorphism theme tokens.
2. Implement the floating Tab Bar geometry in `(tabs)/_layout.tsx`.
3. Build the core UI primitives (`GlassView`, `IconSymbol`).

### Phase 3: Data Integration & Forms
1. Build `utils/api.ts` and `utils/dataService.ts` wrappers.
2. Implement the `Add Transaction` screen consisting of amount inputs, category selectors, and date pickers. Wire to `dataService.addTransaction()`.
3. Implement `Transactions` screen: fetch and render a FlatList of grouped transactional data.

### Phase 4: Dashboard & Analytics
1. **Dashboard**: Combine data fetching to render high-level summary cards (Total Balance, Monthly Income/Expense) and a short list of recent transactions.
2. **Budget/Analytics**: Implement `react-native-gifted-charts`. Combine the `DateNavigator` and `SegmentedControl` to re-fetch and filter transaction data logically, feeding it into interactive Donut and Bar charts.

### Phase 5: Polish & Edge Cases
1. Integrate `expo-haptics` across all button presses and tab switches.
2. Add pull-to-refresh (`RefreshControl`) to all primary lists.
3. Refine Keyboard avoidance handling for forms (`react-native-keyboard-aware-scroll-view` or `KeyboardAvoidingView`).
4. Ensure dark mode contrast compliance across all text nodes and inputs.
