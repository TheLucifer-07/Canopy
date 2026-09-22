import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/index.js';

const names = Object.freeze({
  home: 'leaf-outline',
  features: 'layers-outline',
  how: 'git-branch-outline',
  cases: 'people-outline',
  developers: 'code-slash-outline',
  docs: 'book-outline',
  pricing: 'pricetag-outline',
  contact: 'mail-outline',
  menu: 'menu-outline',
  close: 'close-outline',
  arrow: 'arrow-forward-outline',
  sparkles: 'sparkles-outline',
  diff: 'git-compare-outline',
  memory: 'library-outline',
  copilot: 'sparkles-outline'
});

export function AppIcon({ name, size = 20, color = theme.colors.green, ...props }) {
  return <Ionicons name={names[name]} size={size} color={color} {...props} />;
}

