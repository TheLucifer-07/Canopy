import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../theme/index.js';
import { AppIcon } from '../icons/AppIcon.jsx';

export function ForbiddenState({
  title = 'Access Restricted',
  description = "You don't have permission to view or modify this resource.",
  onHome = null,
  homeLabel = 'Return to Workspace'
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AppIcon name="features" size={24} color="#f43f5e" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onHome && (
        <Pressable onPress={onHome} style={styles.button}>
          <Text style={styles.buttonText}>{homeLabel}</Text>
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
    borderColor: 'rgba(244, 63, 94, 0.4)',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: theme.radius.sm,
    alignItems: 'center'
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md
  },
  title: {
    color: '#fff',
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
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800'
  }
});
