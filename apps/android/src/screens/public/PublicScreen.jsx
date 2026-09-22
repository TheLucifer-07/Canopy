import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/icons/AppIcon.jsx';
import { theme } from '../../theme/index.js';

const copy = {
  home: ['Creative evolution platform', 'Your creative work has a history. Keep it understandable.', 'Canopy records versions, lineage, decisions, and AI context so the next move begins with the story behind the work.', 'How Canopy works', 'how-it-works'],
  'how-it-works': ['How Canopy works', 'Create. Capture. Continue.', 'Capture work, preserve the context, and make the next decision with both.', 'See use cases', 'use-cases'],
  'use-cases': ['Use cases', 'For work that changes hands, tools, and directions.', 'Canopy gives different creative practices a common history without forcing them into the same process.', 'Meet developers', 'developers'],
  developers: ['Developer platform', 'Build tools that understand creative history.', 'The REST API and MCP interface expose authorized project, version, lineage, diff, and memory context through the Core boundary.', 'Read documentation', 'docs'],
  docs: ['Documentation', 'One vocabulary across every surface.', 'Start with the product model, then explore API, MCP, creative versions, and the architecture that keeps history authoritative.', 'Prototype pricing', 'pricing'],
  pricing: ['Pricing', 'A product model is still taking shape.', 'Canopy is a prototype. Pricing, plans, and payment flows are not available yet, so this screen does not invent them.', 'Contact support', 'contact']
};

export function PublicScreen({ route, onNavigate }) {
  if (route === 'features') return <FeaturesScreen />;
  if (route === 'contact') return <ContactScreen />;
  const [eyebrow, title, body, action, target] = copy[route] || copy.home;
  return <MarketingScreen eyebrow={eyebrow} title={title} body={body} action={action} onAction={() => onNavigate(target)} />;
}

function MarketingScreen({ eyebrow, title, body, action, onAction }) {
  return <View><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.hero}>{title}</Text><Text style={styles.body}>{body}</Text><Pressable accessibilityRole="button" onPress={onAction} style={styles.primary}><Text style={styles.primaryText}>{action}</Text><AppIcon name="arrow" size={18} color="#06251A" /></Pressable><LineageTimeline /></View>;
}

function FeaturesScreen() {
  const items = [['features', 'Creative versioning', 'Capture actions, provenance, and parent context.'], ['how', 'Creative lineage', 'See branches and merges as a mobile-friendly timeline.'], ['diff', 'Semantic diff', 'Understand declared changes alongside observed meaning.'], ['memory', 'Creative memory', 'Keep the interpretation that makes a future choice easier.'], ['copilot', 'Canopy Copilot', 'Ask about history and receive grounded citations.']];
  return <View><Text style={styles.eyebrow}>Platform features</Text><Text style={styles.title}>A foundation for work that needs to last.</Text><Text style={styles.body}>Canopy turns each meaningful creative change into a reusable record.</Text>{items.map(([icon, title, body]) => <View key={title} style={styles.card}><AppIcon name={icon} size={24} /><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{body}</Text></View>)}</View>;
}

function ContactScreen() {
  return <View><Text style={styles.eyebrow}>Contact</Text><Text style={styles.title}>Start with the right context.</Text><Text style={styles.body}>There is no server-backed contact form in the prototype, so Canopy opens your mail client instead of pretending a message was submitted.</Text><Pressable accessibilityRole="link" onPress={() => Linking.openURL('mailto:support@canopy.local')} style={styles.primary}><Text style={styles.primaryText}>Email support</Text><AppIcon name="arrow" size={18} color="#06251A" /></Pressable><View style={styles.notice}><AppIcon name="docs" /><Text style={styles.noticeText}>Documentation, API, and MCP references remain available from the navigation drawer.</Text></View></View>;
}

function LineageTimeline() {
  return <View style={styles.timeline}><Text style={styles.timelineLabel}>Neon Campaign</Text>{[['V1', 'Import'], ['V2', 'Brightness +18'], ['V3', 'Model branch'], ['V5', 'Merge']].map(([version, action], index) => <View key={version} style={styles.node}><View style={styles.nodeRail}><View style={[styles.nodeDot, index === 2 && styles.aiDot]} />{index < 3 ? <View style={styles.line} /> : null}</View><View style={styles.nodeBody}><Text style={styles.nodeVersion}>{version}</Text><Text style={styles.nodeAction}>{action}</Text></View></View>)}</View>;
}

const styles = StyleSheet.create({
  eyebrow: { color: theme.colors.green, fontSize: theme.type.eyebrow, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: theme.spacing.md },
  hero: { color: theme.colors.text, fontSize: theme.type.hero, lineHeight: 49, fontWeight: '800', marginBottom: theme.spacing.lg },
  title: { color: theme.colors.text, fontSize: theme.type.title, lineHeight: 37, fontWeight: '800', marginBottom: theme.spacing.md },
  body: { color: theme.colors.secondary, fontSize: theme.type.body, lineHeight: 25, marginBottom: theme.spacing.lg },
  primary: { alignSelf: 'flex-start', flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', backgroundColor: theme.colors.green, paddingHorizontal: theme.spacing.md, paddingVertical: 13, borderRadius: theme.radius.sm },
  primaryText: { color: '#06251A', fontWeight: '800', fontSize: 14 },
  card: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, marginBottom: theme.spacing.sm, borderRadius: theme.radius.sm },
  cardTitle: { color: theme.colors.text, marginTop: theme.spacing.lg, fontSize: 18, fontWeight: '700' },
  cardText: { color: theme.colors.secondary, marginTop: theme.spacing.sm, fontSize: 14, lineHeight: 21 },
  timeline: { marginTop: theme.spacing.xxl, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.sm },
  timelineLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.lg },
  node: { flexDirection: 'row', minHeight: 54 },
  nodeRail: { width: 26, alignItems: 'center' },
  nodeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.human },
  aiDot: { backgroundColor: theme.colors.ai },
  line: { width: 1, flex: 1, backgroundColor: theme.colors.border },
  nodeBody: { paddingLeft: theme.spacing.sm, paddingBottom: theme.spacing.md },
  nodeVersion: { color: theme.colors.text, fontWeight: '700', fontFamily: 'monospace' },
  nodeAction: { color: theme.colors.secondary, marginTop: 2, fontSize: 13 },
  notice: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, marginTop: theme.spacing.xxl, borderRadius: theme.radius.sm },
  noticeText: { color: theme.colors.secondary, flex: 1, fontSize: 14, lineHeight: 21 }
});

