import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { Database } from "../types/database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Custom fetch with timeout and better error logging (helps diagnose SSL/DNS issues on some Android devices)
const customFetch: typeof fetch = async (url: any, options?: any) => {
  const timeoutMs = 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    // Surface more details in native logs
    // eslint-disable-next-line no-console
    console.error("Supabase fetch error:", error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
  global: {
    fetch: customFetch,
  },
});

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// Simple connectivity test you can call on startup to debug device-specific issues
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    // eslint-disable-next-line no-console
    console.log("Testing connection to:", supabaseUrl);
    const response = await customFetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    // eslint-disable-next-line no-console
    console.log("Connection test status:", (response as any)?.status);
    return (response as any)?.ok ?? false;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Connection test failed:", error);
    return false;
  }
};
