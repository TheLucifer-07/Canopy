import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../theme/index.js';

export function LoadingState({
  label = 'Loading...',
  fullscreen = false
}) {
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <ActivityIndicator color={theme.colors.green} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm
  },
  fullscreen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  text: {
    color: theme.colors.secondary,
    fontSize: 13,
    fontWeight: '600'
  }
});
