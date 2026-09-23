import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/index.js';

export function EmptyState({
  title,
  description = null,
  action = null
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    alignItems: 'center'
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center'
  },
  description: {
    color: theme.colors.secondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: theme.spacing.xs
  },
  actionContainer: {
    marginTop: theme.spacing.md
  }
});
