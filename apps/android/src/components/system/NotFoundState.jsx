import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../theme/index.js';
import { AppIcon } from '../icons/AppIcon.jsx';

export function NotFoundState({
  title = 'Resource Not Found',
  description = 'The requested project, version, asset, or page could not be located.',
  onBack = null,
  backLabel = 'Return to Workspace'
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AppIcon name="features" size={24} color={theme.colors.green} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onBack && (
        <Pressable onPress={onBack} style={styles.button}>
          <Text style={styles.buttonText}>{backLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    alignItems: 'center'
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  },
  description: {
    color: theme.colors.secondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md
  },
  button: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.green,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(67, 211, 145, 0.1)'
  },
  buttonText: {
    color: theme.colors.green,
    fontSize: 13,
    fontWeight: '800'
  }
});
