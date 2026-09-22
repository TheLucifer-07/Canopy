import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CanopyLogo } from '../../components/branding/CanopyLogo.jsx';
import { AppIcon } from '../../components/icons/AppIcon.jsx';
import { firstError, validateLoginInput, validateSignupInput } from '../../features/auth/authValidation.js';
import { theme } from '../../theme/index.js';

export function LoginScreen({ busy, error, onLogin, onNavigate }) {
  return <AuthScaffold eyebrow="Canopy account" title="Sign in to Canopy" body="Continue with your Canopy account.">
    <AuthForm mode="login" busy={busy} serverError={error} onSubmit={onLogin} />
    <Pressable accessibilityRole="button" onPress={() => onNavigate('forgot-password')} style={styles.textAction}><Text style={styles.textActionText}>Forgot password?</Text></Pressable>
    <Text style={styles.switchText}>Do not have an account? <Text onPress={() => onNavigate('signup')} style={styles.switchLink}>Create account</Text></Text>
  </AuthScaffold>;
}

export function SignupScreen({ busy, error, onSignup, onNavigate }) {
  return <AuthScaffold eyebrow="New account" title="Create your Canopy account" body="Use an email and password to start preserving creative history.">
    <AuthForm mode="signup" busy={busy} serverError={error} onSubmit={onSignup} />
    <Text style={styles.switchText}>Already have an account? <Text onPress={() => onNavigate('login')} style={styles.switchLink}>Sign in</Text></Text>
  </AuthScaffold>;
}

export function UnsupportedPasswordScreen({ variant = 'forgot', onNavigate }) {
  const title = variant === 'reset' ? 'Reset link support is not available' : 'Password reset is not wired yet';
  const body = variant === 'reset'
    ? 'The backend has no reset-token contract in this prototype.'
    : 'The current Canopy API does not include a password reset endpoint, so this prototype does not pretend to send a reset email.';
  return <AuthScaffold eyebrow="Prototype limitation" title={title} body={body}>
    <View style={styles.notice}><Text style={styles.noticeText}>Email verification, OAuth, and password reset will appear only when the API supports real flows.</Text></View>
    <Pressable accessibilityRole="button" onPress={() => onNavigate('login')} style={styles.primary}><Text style={styles.primaryText}>Back to sign in</Text><AppIcon name="arrow" size={18} color="#06251A" /></Pressable>
  </AuthScaffold>;
}

function AuthScaffold({ eyebrow, title, body, children }) {
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
      <View style={styles.logoWrap}><CanopyLogo size="lg" /></View>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.formSlot}>{children}</View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function AuthForm({ mode, busy, serverError, onSubmit }) {
  const isSignup = mode === 'signup';
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function submit() {
    const nextErrors = isSignup ? validateSignupInput(values) : validateLoginInput(values);
    setErrors(nextErrors);
    if (firstError(nextErrors)) return;
    try {
      await onSubmit(values);
    } catch {
      // The auth store maps failures to visible form errors.
    }
  }

  return <View style={styles.form}>
    {isSignup ? <Field label="Name" error={errors.displayName}><TextInput value={values.displayName} onChangeText={(text) => update('displayName', text)} autoComplete="name" textContentType="name" placeholder="Your name" placeholderTextColor={theme.colors.muted} style={styles.input} /></Field> : null}
    <Field label="Email" error={errors.email}><TextInput value={values.email} onChangeText={(text) => update('email', text)} autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" placeholder="you@company.com" placeholderTextColor={theme.colors.muted} style={styles.input} /></Field>
    <Field label="Password" error={errors.password}>
      <View style={styles.passwordRow}>
        <TextInput value={values.password} onChangeText={(text) => update('password', text)} autoCapitalize="none" autoCorrect={false} autoComplete={isSignup ? 'new-password' : 'current-password'} textContentType={isSignup ? 'newPassword' : 'password'} secureTextEntry={!showPassword} placeholder="At least 8 characters" placeholderTextColor={theme.colors.muted} style={[styles.input, styles.passwordInput]} />
        <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((value) => !value)} hitSlop={8} style={styles.passwordToggle}><Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text></Pressable>
      </View>
    </Field>
    {isSignup ? <Field label="Confirm password" error={errors.confirmPassword}><TextInput value={values.confirmPassword} onChangeText={(text) => update('confirmPassword', text)} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" secureTextEntry={!showPassword} placeholder="Repeat your password" placeholderTextColor={theme.colors.muted} style={styles.input} /></Field> : null}
    {serverError ? <Text accessibilityRole="alert" style={styles.errorBox}>{serverError}</Text> : null}
    <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={[styles.primary, busy && styles.disabled]}>
      {busy ? <ActivityIndicator color="#06251A" /> : null}
      <Text style={styles.primaryText}>{busy ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create account' : 'Sign in')}</Text>
    </Pressable>
  </View>;
}

function Field({ label, error, children }) {
  return <View><Text style={styles.label}>{label}</Text>{children}{error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  logoWrap: { alignItems: 'center', marginBottom: theme.spacing.xl },
  panel: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.sm },
  eyebrow: { color: theme.colors.green, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: theme.colors.text, fontSize: 27, lineHeight: 34, fontWeight: '800', marginTop: theme.spacing.md },
  body: { color: theme.colors.secondary, fontSize: 15, lineHeight: 23, marginTop: theme.spacing.sm },
  formSlot: { marginTop: theme.spacing.lg },
  form: { gap: theme.spacing.md },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.elevated, borderRadius: theme.radius.sm, color: theme.colors.text, paddingHorizontal: theme.spacing.md, fontSize: 15 },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 72 },
  passwordToggle: { position: 'absolute', right: 8, top: 6, minHeight: 36, justifyContent: 'center', paddingHorizontal: 8 },
  passwordToggleText: { color: theme.colors.green, fontWeight: '800', fontSize: 13 },
  primary: { minHeight: 50, flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.green, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing.md },
  primaryText: { color: '#06251A', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.72 },
  textAction: { alignSelf: 'center', padding: theme.spacing.sm, marginTop: theme.spacing.sm },
  textActionText: { color: theme.colors.secondary, fontSize: 14 },
  switchText: { color: theme.colors.secondary, textAlign: 'center', marginTop: theme.spacing.md, lineHeight: 21 },
  switchLink: { color: theme.colors.green, fontWeight: '800' },
  errorText: { color: '#FDA4AF', fontSize: 12, marginTop: 6 },
  errorBox: { color: '#FFE4E6', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.35)', backgroundColor: 'rgba(244, 63, 94, 0.12)', padding: theme.spacing.sm, lineHeight: 19 },
  notice: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background, padding: theme.spacing.md, marginBottom: theme.spacing.lg },
  noticeText: { color: theme.colors.secondary, lineHeight: 21 }
});
