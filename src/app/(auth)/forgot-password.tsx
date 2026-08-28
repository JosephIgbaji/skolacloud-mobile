import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiClient } from '@/lib/api-client';

type ResetStep = 'request' | 'verify' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<ResetStep>('request');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Step 1: Request Password Reset OTP
  const handleRequestOtp = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      await apiClient.post('/auth/forgot-password', {
        email: email.trim(),
        subdomain: subdomain.trim() || undefined,
      });
      setStep('verify');
      setInfoMessage(`We've sent a 6-digit verification code to ${email.trim()}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Unable to send reset code. Please check your details.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!email.trim()) return;
    setIsResending(true);
    setError(null);

    try {
      await apiClient.post('/auth/forgot-password', {
        email: email.trim(),
        subdomain: subdomain.trim() || undefined,
      });
      setInfoMessage('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Reset Password using OTP
  const handleResetPassword = async () => {
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setStep('success');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Invalid or expired verification code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'verify') {
                setStep('request');
                setError(null);
              } else {
                router.back();
              }
            }}
          >
            <ArrowLeft size={20} color="#94a3b8" />
            <ThemedText style={styles.backText}>
              {step === 'verify' ? 'Back to Email Request' : 'Back to Login'}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {step === 'request'
                ? 'Forgot Password'
                : step === 'verify'
                ? 'Enter Reset Code'
                : 'Password Reset'}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {step === 'request'
                ? 'Enter your account details to receive a 6-digit verification code'
                : step === 'verify'
                ? `Enter the code sent to ${email} and choose a new password`
                : 'Your password has been successfully updated'}
            </ThemedText>
          </View>

          {/* STEP 1: REQUEST CODE */}
          {step === 'request' && (
            <ThemedView style={styles.card}>
              {error && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#ef4444" style={styles.errorIcon} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              )}

              {/* Subdomain Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>School Workspace (Optional)</ThemedText>
                <View style={styles.inputWrapper}>
                  <Building2 size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. greenwood (optional)"
                    placeholderTextColor="#94a3b8"
                    value={subdomain}
                    onChangeText={setSubdomain}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Email Address</ThemedText>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@school.com"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  (!email.trim() || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleRequestOtp}
                disabled={!email.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Send Reset Code</ThemedText>
                )}
              </TouchableOpacity>
            </ThemedView>
          )}

          {/* STEP 2: VERIFY OTP & SET NEW PASSWORD */}
          {step === 'verify' && (
            <ThemedView style={styles.card}>
              {error && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#ef4444" style={styles.errorIcon} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              )}

              {infoMessage && !error && (
                <View style={styles.infoBanner}>
                  <CheckCircle2 size={18} color="#38bdf8" style={styles.errorIcon} />
                  <ThemedText style={styles.infoText}>{infoMessage}</ThemedText>
                </View>
              )}

              {/* OTP Code Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Verification Code (OTP)</ThemedText>
                <View style={styles.inputWrapper}>
                  <KeyRound size={20} color="#38bdf8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { letterSpacing: 2, fontWeight: 'bold' }]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#94a3b8"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={10}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* New Password Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>New Password</ThemedText>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#94a3b8"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color="#94a3b8" />
                    ) : (
                      <Eye size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Confirm New Password</ThemedText>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#94a3b8" />
                    ) : (
                      <Eye size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  (!otp.trim() || !newPassword || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={!otp.trim() || !newPassword || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Reset Password</ThemedText>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleResendOtp}
                  disabled={isResending}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#38bdf8" />
                  ) : (
                    <>
                      <RefreshCw size={14} color="#38bdf8" style={{ marginRight: 6 }} />
                      <ThemedText style={styles.resendText}>Resend Code</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ThemedView>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 'success' && (
            <ThemedView style={styles.successCard}>
              <CheckCircle2 size={56} color="#22c55e" style={styles.successIcon} />
              <ThemedText style={styles.successTitle}>Password Updated!</ThemedText>
              <ThemedText style={styles.successText}>
                Your password has been reset successfully. You can now log in with your new password.
              </ThemedText>

              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/(auth)/login')}
              >
                <ThemedText style={styles.buttonText}>Proceed to Login</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 15,
    marginLeft: 8,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  successCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    color: '#38bdf8',
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#0284c7',
    height: 52,
    width: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  resendText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
});
