# Budget Buddy 💰

Budget Buddy is a modern, cross-platform budget tracking application built with **React Native** and **Expo**. It features secure authentication using **Clerk**, a responsive UI with **NativeWind** (Tailwind CSS), and smooth animations powered by **Reanimated**.

## 🚀 Features

-   **Authentication**: Secure sign-up and sign-in flow using Clerk (Email/Password & Google OAuth).
-   **Dashboard**: View user data fetched from a remote API.
-   **Profile Management**: Update profile details.
-   **Secure Storage**: Securely store authentication tokens using `expo-secure-store`.
-   **Responsive Design**: Built with NativeWind for a consistent look across Android, iOS, and Web.
-   **Animations**: engaging UI transitions using `react-native-reanimated`.

## 🛠 Tech Stack

-   **Framework**: [Expo](https://expo.dev/) (SDK 50+)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
-   **Authentication**: [Clerk](https://clerk.com/)
-   **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/)
-   **Icons**: [Expo Vector Icons](https://icons.expo.fyi/)
-   **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (LTS version recommended)
-   [Expo Go](https://expo.dev/client) app on your iOS or Android device (for testing).

## 📦 Installation

1.  **Clone the repository**:

    ```bash
    git clone <repository-url>
    cd budget-buddy
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

## ⚙️ Configuration

1.  Create a `.env` file in the root directory.
2.  Add your Clerk Publishable Key and API URL (optional):

    ```env
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
    EXPO_PUBLIC_API_URL=https://ba-6696c75cc6d44a1683979f86653da53a.ecs.ap-south-1.on.aws
    ```

    > **Note:** You can find your Clerk Publishable Key in your [Clerk Dashboard](https://dashboard.clerk.com/).

## 🏃‍♂️ Running the App

Start the development server:

```bash
npx expo start
```

-   **Scan the QR code** with the Expo Go app (Android) or Camera app (iOS).
-   Press `a` to open in Android Emulator.
-   Press `i` to open in iOS Simulator.
-   Press `w` to open in Web browser.

## 📂 Project Structure

```
budget-buddy/
├── app/                 # Expo Router screens and layouts
│   ├── (tabs)/          # Tab navigation screens (Dashboard, etc.)
│   ├── _layout.tsx      # Root layout and providers
│   ├── index.tsx        # Entry point (redirects to login)
│   ├── login.tsx        # Login screen
│   └── signup.tsx       # Signup screen
├── components/          # Reusable UI components
├── constants/           # App constants (Colors, Theme, etc.)
├── hooks/               # Custom React hooks
├── utils/               # Utility functions (API, etc.)
└── ...config files
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
