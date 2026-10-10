import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';
import { SessionProvider } from '@/context/SessionContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Oculta la pantalla de carga cuando los ajustes guardados ya están disponibles. */
function SplashGate({ children }: { children: React.ReactNode }) {
  const { ready } = useSettings();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <SplashGate>
        {/* La sesión vive por encima de la navegación: sobrevive al cambio de pestañas. */}
        <SessionProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </SessionProvider>
      </SplashGate>
    </SettingsProvider>
  );
}
