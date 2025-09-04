import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import * as Updates from "expo-updates";
import "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/contexts/QueryProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/lib/toast";
import "../global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import React from "react";
import { useToast } from "@/lib/toast";

// Bridge component to listen for custom update toast event triggered before reload
const UpdateToastBridge: React.FC = () => {
  const toast = useToast();
  useEffect(() => {
    function handler() {
      toast.showInfo("Update downloaded — restarting…");
    }
    const eventName = "app:update:restarting";
    // @ts-ignore
    window?.addEventListener?.(eventName, handler);
    return () => {
      // @ts-ignore
      window?.removeEventListener?.(eventName, handler);
    };
  }, [toast]);
  return null;
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(auth)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  // Lazy import of toast hook (provider is lower in tree, so we use effect after mount)
  // We'll access the toast via a ref pattern once provider is mounted.

  // We'll store a reference to a toast helper by injecting a custom event the provider can listen to.
  // Simpler: use a dynamic import + setTimeout so provider is ready.

  // Automatically check for OTA updates in foreground once on mount
  useEffect(() => {
    let cancelled = false;
    async function syncUpdates() {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (!cancelled) {
            // Show toast before reload (provider should be mounted now)
            try {
              const { useToastHelpers } = await import("@/lib/toast");
              // We can't call hook outside component; instead dispatch a custom event consumed by a listener component.
            } catch {}
            // Fallback: schedule a reload shortly after giving user a moment.
            try {
              const eventName = "app:update:restarting";
              // @ts-ignore
              window?.dispatchEvent?.(new Event(eventName));
            } catch {}
            setTimeout(() => {
              Updates.reloadAsync();
            }, 1500);
          }
        }
      } catch (e) {
        // Silently ignore update errors for now; could add toast/logging later
        console.warn("Update check failed", e);
      }
    }
    syncUpdates();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode={isDark ? "dark" : "light"}>
        <StatusBar
          style={isDark ? "light" : "dark"}
          backgroundColor={isDark ? "#000" : "#F9FAFB"}
        />
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <UpdateToastBridge />
                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                >
                  <Stack.Screen
                    name="(auth)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="modal"
                    options={{ presentation: "modal" }}
                  />
                </Stack>
              </ThemeProvider>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
