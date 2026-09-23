import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../theme/index.js';
import { AppIcon } from '../icons/AppIcon.jsx';

export function MaintenanceState({
  title = 'System Maintenance',
  description = 'Canopy is temporarily undergoing system maintenance. Please try again shortly.',
  onCheckStatus = null,
  actionLabel = 'Check Status'
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AppIcon name="features" size={24} color="#f59e0b" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onCheckStatus && (
        <Pressable onPress={onCheckStatus} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
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
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: theme.radius.sm,
    alignItems: 'center'
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
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
    borderColor: '#f59e0b',
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.2)'
  },
  buttonText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '800'
  }
});
