import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/index.js';

export function CanopyMark({ size = 34 }) {
  const scale = size / 34;
  return <View accessible={false} style={[styles.mark, { width: size, height: size, borderRadius: 8 * scale }]}>
    <View style={[styles.stem, { height: 17 * scale, width: 2.4 * scale, left: 15.8 * scale, top: 8 * scale }]} />
    <View style={[styles.leaf, styles.leftLeaf, { width: 13 * scale, height: 6 * scale, left: 7 * scale, top: 11 * scale, borderRadius: 6 * scale }]} />
    <View style={[styles.leaf, styles.rightLeaf, { width: 15 * scale, height: 7 * scale, left: 14 * scale, top: 17 * scale, borderRadius: 7 * scale }]} />
  </View>;
}

export function CanopyLogo({ markOnly = false, size = 'md' }) {
  const markSize = size === 'lg' ? 42 : 34;
  return <View style={styles.logo} accessibilityRole="text" accessibilityLabel="Canopy">
    <CanopyMark size={markSize} />
    {markOnly ? null : <Text style={[styles.wordmark, size === 'lg' && styles.wordmarkLarge]}>CANOPY</Text>}
  </View>;
}

const styles = StyleSheet.create({
  logo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  mark: { borderWidth: 2, borderColor: theme.colors.green, backgroundColor: 'rgba(67, 211, 145, 0.12)', position: 'relative' },
  stem: { position: 'absolute', backgroundColor: '#D8FBEA', borderRadius: 4 },
  leaf: { position: 'absolute', borderWidth: 2, borderColor: theme.colors.green },
  leftLeaf: { transform: [{ rotate: '24deg' }] },
  rightLeaf: { transform: [{ rotate: '-24deg' }] },
  wordmark: { color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  wordmarkLarge: { fontSize: 22 }
});
