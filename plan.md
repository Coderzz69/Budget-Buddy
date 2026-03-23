# Budget Buddy - Native Android (Kotlin) Migration Plan

This document outlines the complete architectural roadmap and step-by-step plan to rebuild the **Budget Buddy** application from React Native (Expo) into a fully native Android application using **Android Studio**, **Kotlin**, and **Jetpack Compose**.

---

## 1. Environment Variables & Sensitive Information

To successfully connect your new Android Studio project to your existing backend and Supabase instance, you must port over your environment variables. 

In Android Studio, these are typically stored in `local.properties` (to keep them out of version control) and exposed to the app via the `BuildConfig` field or a dedicated `Secrets Gradle Plugin`.

### Required Variables:

```properties
# Add these to your local.properties file in the root of the Android Studio project

# Supabase Credentials
SUPABASE_URL="https://ojrhotaxanegfonsqieu.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_VuMc1KqFXMMp_2GVGF-PSA_Z-adBNdn"

# Backend API URL 
# Note: If testing on an Android Emulator targeting a local PC server, 
# you typically use http://10.0.2.2:3000. 
# For a physical device on the same Wi-Fi, use your machine's exact local IP (e.g. 10.5.x.x).
BACKEND_API_URL="http://10.5.0.255:3000" 
```

**Google OAuth Web Client ID:**
For native Google Sign-In via Credential Manager, you will need the Web Client ID from your Google Cloud Console.
```properties
GOOGLE_WEB_CLIENT_ID="<YOUR_GOOGLE_CLOUD_WEB_CLIENT_ID>.apps.googleusercontent.com"
```

---

## 2. Technology Stack & Replacements

| Feature | Expo / React Native | Native Android (Android Studio) |
| :--- | :--- | :--- |
| **Language** | TypeScript / JavaScript | Kotlin |
| **UI Framework** | React Native (JSX) | Jetpack Compose |
| **Styling** | NativeWind (Tailwind) | Compose Modifiers & Material 3 |
| **Navigation** | Expo Router | Jetpack Navigation Compose |
| **Database/Auth** | `@supabase/supabase-js` | **Supabase Kotlin SDK** (`gotrue-kt`, `postgrest-kt`) |
| **Google Auth** | `expo-auth-session` / WebBrowser | **Google Credential Manager API** |
| **API Client** | `fetch` (utils/api.ts) | **Retrofit2 + OkHttp3** |
| **Local Storage** | `AsyncStorage` / SecureStore | **Jetpack DataStore** (Preferences) |
| **Charts** | `react-native-gifted-charts` | **Vico** (Compose charting library) |
| **Architecture** | Component State / Hooks | **MVVM** (ViewModel + StateFlow) + **Hilt** (Dependency Injection) |

---

## 3. Project Setup & Architecture Setup

### 3.1 Initialize the Project
1. Open Android Studio -> New Project -> **Empty Activity (Jetpack Compose)**.
2. Naming: `Budget Buddy`
3. Package Name: `com.anujdangi.budgetbuddy` (Must match your current Google Cloud Console / Firebase config).
4. Minimum SDK: API 26 (Android 8.0) or higher recommended.

### 3.2 Add Dependencies (`build.gradle.kts` - app level)
You will need to import the required libraries:
* **Supabase:** `io.github.jan-tennert.supabase:gotrue-kt`, `postgrest-kt`, `ktor-client-android`
* **Networking:** `com.squareup.retrofit2:retrofit`, `converter-gson`
* **Dependency Injection:** `com.google.dagger:hilt-android`
* **UI/Navigation:** `androidx.navigation:navigation-compose`, `androidx.lifecycle:lifecycle-viewmodel-compose`
* **Charts:** `com.patrykandpatrick.vico:compose-m3`

---

## 4. Implementation Step-by-Step

### Phase 1: Core Architecture & Dependency Injection
1. Setup Hilt for Dependency Injection. Create a `BaseApplication` class annotated with `@HiltAndroidApp`.
2. Create `AppModule.kt` to provide singletons for your `SupabaseClient` and `Retrofit` API interface.
3. Configure `Retrofit` to read `BACKEND_API_URL` from `BuildConfig`.

### Phase 2: Supabase Data Layer & API Abstraction
1. Initialize the `SupabaseClient` in Kotlin, passing `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. Replicate `utils/api.ts` by creating an `ApiService` interface in Retrofit. 
3. Create an `AuthInterceptor` via OkHttp that automatically intercepts outbound Retrofit requests and attaches:
   `Authorization: Bearer <Supabase_Access_Token>`
4. Replicate your database models using Kotlin Data Classes (e.g., `data class Transaction(...)`).

### Phase 3: Authentication (Native Google Sign-In)
1. Since we drop Expo, we drop `expo-auth-session`. Instead, use modern Android auth.
2. Implement **Google Credential Manager** for a seamless, bottom-sheet 1-tap Google login.
3. Once Credential Manager returns a Google ID Token, pass that token directly to Supabase via `supabase.auth.signInWith(IDToken)`.
4. Store the resulting Supabase session securely using encrypted Jetpack DataStore.

### Phase 4: UI Development (Jetpack Compose)
Replace Expo Router with a `NavHost` containing your routes:
1. **Theme Setup:** Recreate your Deep Space / Sky Blue gradients using `Brush.linearGradient()` in a custom Compose `Modifier.background()`. Map out Material 3 Typography and Color schemes.
2. **Tab Navigation:** Implement a `Scaffold` with a custom `BottomAppBar`. Cut out the middle for a floating Action Button (FAB) to replicate your "Add Transaction" button.
3. **Glassmorphism:** To replace `expo-blur`, use accompanist blur modifiers or render a translucent surface with `.graphicsLayer { renderEffect = BlurEffect(...) }` (API 31+).
4. **Screens:**
   * `DashboardScreen.kt`: Summary cards and recent items using `LazyColumn`.
   * `TransactionsScreen.kt`: Filtering and lists.
   * `AddTransactionScreen.kt`: Jetpack Compose Data/Time pickers, DropdownMenus for categories. 
   * `BudgetAnalyticsScreen.kt`: Implement Donut and Bar charts using the **Vico** compose library.

### Phase 5: State Management (MVVM)
1. For each screen, create a lifecycle-aware `ViewModel` (e.g., `DashboardViewModel`).
2. Fetch data from Supabase/Node backend inside `viewModelScope.launch`.
3. Expose state to Compose via `StateFlow` (e.g., `val uiState by viewModel.state.collectAsState()`). This replaces React `useState` and `useEffect`.

---

## 5. Required Action Items Before Migrating

1. **Google Cloud Console Update:** Ensure your Android SHA-1 fingerprint (from Android Studio's keystore) is registered under your existing Google Cloud OAuth Client ID, or create a brand new Android Client ID specifically for this native app.
2. **Supabase Redirects:** With native Google Credential Manager (ID Token approach), you do not strictly need deep link URL redirects (`budgetbuddy://auth/callback`) anymore, as the Google SDK handles the UI natively without bouncing through a browser!
3. **Download Android Studio:** Set up device emulators (Level 34/35) to begin Compose testing.
