import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../theme/index.js';

export function ErrorState({
  title = 'An error occurred',
  message,
  onRetry = null,
  retryLabel = 'Try Again'
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message || 'Could not complete the operation.'}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: theme.radius.sm
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800'
  },
  message: {
    color: theme.colors.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  retryButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start'
  },
  retryText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700'
  }
});
