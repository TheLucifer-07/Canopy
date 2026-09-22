import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CanopyLogo } from '../branding/CanopyLogo.jsx';
import { AppIcon } from '../icons/AppIcon.jsx';
import { theme } from '../../theme/index.js';

export const PUBLIC_ROUTES = [
  ['home', 'Home', 'home'],
  ['features', 'Features', 'features'],
  ['how-it-works', 'How it works', 'how'],
  ['use-cases', 'Use cases', 'cases'],
  ['developers', 'Developers', 'developers'],
  ['docs', 'Documentation', 'docs'],
  ['pricing', 'Pricing', 'pricing'],
  ['contact', 'Contact', 'contact']
];

export function PublicNavigator({ route, onNavigate, onAuthNavigate }) {
  const [open, setOpen] = useState(false);
  const select = (next) => { onNavigate(next); setOpen(false); };
  const authSelect = (next) => { onAuthNavigate(next); setOpen(false); };
  return <><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Canopy home" onPress={() => select('home')}><CanopyLogo /></Pressable><View style={styles.headerActions}><Pressable accessibilityRole="button" onPress={() => authSelect('login')} style={styles.signIn}><Text style={styles.signInText}>Sign in</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open navigation menu" onPress={() => setOpen(true)} hitSlop={10}><AppIcon name="menu" size={26} color={theme.colors.text} /></Pressable></View></View><Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}><View style={styles.overlay}><View style={styles.drawer}><View style={styles.drawerTop}><CanopyLogo /><Pressable accessibilityRole="button" accessibilityLabel="Close navigation menu" onPress={() => setOpen(false)}><AppIcon name="close" size={26} color={theme.colors.text} /></Pressable></View><ScrollView contentContainerStyle={styles.routes}>{PUBLIC_ROUTES.map(([key, label, icon]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: route === key }} onPress={() => select(key)} style={[styles.route, route === key && styles.routeActive]}><AppIcon name={icon} color={route === key ? theme.colors.green : theme.colors.secondary} /><Text style={[styles.routeText, route === key && styles.routeTextActive]}>{label}</Text></Pressable>)}<View style={styles.authActions}><Pressable accessibilityRole="button" onPress={() => authSelect('login')} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Sign in</Text></Pressable><Pressable accessibilityRole="button" onPress={() => authSelect('signup')} style={styles.primaryAction}><Text style={styles.primaryActionText}>Get started</Text></Pressable></View></ScrollView></View></View></Modal></>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  signIn: { minHeight: 36, justifyContent: 'center' },
  signInText: { color: theme.colors.secondary, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'flex-end' },
  drawer: { width: '84%', height: '100%', backgroundColor: theme.colors.background, borderLeftWidth: 1, borderLeftColor: theme.colors.border },
  drawerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  routes: { padding: theme.spacing.md },
  route: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.md, paddingVertical: 15, borderRadius: theme.radius.sm },
  routeActive: { backgroundColor: theme.colors.elevated },
  routeText: { color: theme.colors.secondary, fontSize: 16 },
  routeTextActive: { color: theme.colors.text, fontWeight: '700' },
  authActions: { gap: theme.spacing.sm, marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  secondaryAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm },
  secondaryActionText: { color: theme.colors.text, fontWeight: '800' },
  primaryAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.green, borderRadius: theme.radius.sm },
  primaryActionText: { color: '#06251A', fontWeight: '800' }
});
