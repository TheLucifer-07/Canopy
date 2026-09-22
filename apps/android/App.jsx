import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PLATFORM_VERSION } from '@canopy/config';
import { PublicNavigator } from './src/components/navigation/PublicNavigator.jsx';
import { PublicScreen } from './src/screens/public/PublicScreen.jsx';
import { LoginScreen, SignupScreen, UnsupportedPasswordScreen } from './src/screens/auth/AuthScreens.jsx';
import { AuthenticatedHomeScreen } from './src/screens/auth/AuthenticatedHomeScreen.jsx';
import { createAuthActions, createInitialAuthState } from './src/stores/authStore.js';
import { theme } from './src/theme/index.js';

export default function App() {
  const [route, setRoute] = useState('home');
  const [authRoute, setAuthRoute] = useState(null);
  const [authState, setAuthState] = useState(createInitialAuthState);
  const auth = useMemo(() => createAuthActions((patch) => setAuthState((current) => ({ ...current, ...patch }))), []);

  useEffect(() => {
    auth.restore();
  }, [auth]);

  if (authState.status === 'initializing') {
    return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={styles.loading}><ActivityIndicator color={theme.colors.green} /><Text style={styles.loadingText}>Initializing Canopy</Text></View></SafeAreaView>;
  }

  if (authState.session) {
    return <SafeAreaView style={styles.safe}><StatusBar style="light" /><AuthenticatedHomeScreen session={authState.session} user={authState.user} onLogout={auth.logout} /></SafeAreaView>;
  }

  if (authRoute === 'login') {
    return <SafeAreaView style={styles.safe}><StatusBar style="light" /><LoginScreen busy={authState.status === 'authenticating'} error={authState.error} onLogin={auth.login} onNavigate={setAuthRoute} /></SafeAreaView>;
  }

  if (authRoute === 'signup') {
    return <SafeAreaView style={styles.safe}><StatusBar style="light" /><SignupScreen busy={authState.status === 'authenticating'} error={authState.error} onSignup={auth.signup} onNavigate={setAuthRoute} /></SafeAreaView>;
  }

  if (authRoute === 'forgot-password' || authRoute === 'reset-password') {
    return <SafeAreaView style={styles.safe}><StatusBar style="light" /><UnsupportedPasswordScreen variant={authRoute === 'reset-password' ? 'reset' : 'forgot'} onNavigate={setAuthRoute} /></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.scroll}>
      <PublicNavigator route={route} onNavigate={setRoute} onAuthNavigate={setAuthRoute} />
      <View style={styles.version}><Text style={styles.versionText}>Canopy public foundation - v{PLATFORM_VERSION}</Text></View>
      <View style={styles.content}><PublicScreen route={route} onNavigate={setRoute} /></View>
      <View style={styles.footer}><Text style={styles.footerTitle}>Creative work should have history.</Text><Text style={styles.footerText}>Canopy preserves decisions across people, tools, assets, and AI systems.</Text><Text accessibilityRole="link" onPress={() => Linking.openURL('mailto:support@canopy.local')} style={styles.link}>Contact support</Text></View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, paddingBottom: theme.spacing.xl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  loadingText: { color: theme.colors.secondary, fontSize: 14 },
  version: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  versionText: { color: theme.colors.muted, fontSize: 11 },
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, minHeight: 600 },
  footer: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: theme.spacing.xl, padding: theme.spacing.lg },
  footerTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: theme.spacing.sm },
  footerText: { color: theme.colors.muted, fontSize: 13, lineHeight: 20, marginBottom: theme.spacing.md },
  link: { color: theme.colors.green, fontSize: 13, fontWeight: '700' }
});
