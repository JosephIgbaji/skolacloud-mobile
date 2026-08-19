import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const router = useRouter();
  const {
    login,
    verifyStep1,
    clearSavedStep1,
    savedSubdomain,
    savedEmail,
    isLoading,
    error,
    clearError,
  } = useAuth();

  // If savedSubdomain and savedEmail exist on device storage, default to Stage 2 (Password entry)
  const hasSavedAccount = Boolean(savedSubdomain && savedEmail);
  const [stage, setStage] = useState<1 | 2>(hasSavedAccount ? 2 : 1);

  // Stage 1 Inputs
  const [subdomain, setSubdomain] = useState(savedSubdomain || '');
  const [email, setEmail] = useState(savedEmail || '');

  // Stage 2 Input
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (savedSubdomain && savedEmail) {
      setSubdomain(savedSubdomain);
      setEmail(savedEmail);
      setStage(2);
    } else {
      setStage(1);
    }
  }, [savedSubdomain, savedEmail]);

  // Stage 1 Action: Verify Org ID & Email
  const handleVerifyStep1 = async () => {
    if (!subdomain.trim() || !email.trim()) return;
    const isSuccess = await verifyStep1(subdomain.trim(), email.trim());
    if (isSuccess) {
      setStage(2);
    }
  };

  // Stage 2 Action: Authenticate Password
  const handleLogin = async () => {
    if (!password) return;
    const activeSubdomain = savedSubdomain || subdomain.trim();
    const activeEmail = savedEmail || email.trim();

    const isSuccess = await login(activeEmail, password, activeSubdomain);
    if (isSuccess) {
      router.replace('/(tabs)' as any);
    }
  };

  // Switch Account / Change Organization
  const handleSwitchAccount = async () => {
    await clearSavedStep1();
    setPassword('');
    setStage(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header & Logo */}
          <View style={styles.header}>
            <View style={{ alignItems: 'center' }}>
              <Image
                source={require('@/assets/PNG/8-8.png')}
                style={{ width: 100, height: 30 }}
                resizeMode="contain"
              />
            </View>
            {/* <ThemedText style={styles.subtitle}>
              {stage === 1
                ? 'Step 1 of 2: Find your organization'
                : 'Step 2 of 2: Enter your password'}
            </ThemedText> */}
          </View>

          {/* Card Container */}
          <ThemedView style={{ padding: 20 }}>
            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color="#ef4444" style={styles.errorIcon} />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            {/* STAGE 1: School Subdomain & Email Entry */}
            {stage === 1 && (
              <>
                {/* School Subdomain Input */}
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>School Subdomain</ThemedText>
                  <View style={styles.inputWrapper}>
                    <Building2 size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. greenwood"
                      placeholderTextColor="#94a3b8"
                      value={subdomain}
                      onChangeText={(val) => {
                        clearError();
                        setSubdomain(val);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <ThemedText style={styles.helperText}>
                    Your school's unique domain identifier (e.g. greenwood)
                  </ThemedText>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>School Email Address</ThemedText>
                  <View style={styles.inputWrapper}>
                    <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="you@school.edu"
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={(val) => {
                        clearError();
                        setEmail(val);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    (!subdomain.trim() || !email.trim() || isLoading) &&
                    styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyStep1}
                  disabled={!subdomain.trim() || !email.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View style={styles.buttonRow}>
                      <ThemedText style={styles.buttonText}>Verify & Continue</ThemedText>
                      <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* STAGE 2: Password Entry (Saved Account Verified) */}
            {stage === 2 && (
              <>
                {/* Verified Account Badge Card */}
                <View style={styles.verifiedBadge}>
                  <View style={styles.badgeLeft}>
                    <CheckCircle2 size={20} color="#4ade80" style={{ marginRight: 10 }} />
                    <View>
                      <ThemedText style={styles.badgeEmail}>
                        {savedEmail || email}
                      </ThemedText>
                      <ThemedText style={styles.badgeSubdomain}>
                        School: <ThemedText style={{ color: '#38bdf8', fontWeight: 'bold' }}>{savedSubdomain || subdomain}</ThemedText>
                      </ThemedText>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handleSwitchAccount}
                    style={styles.switchButton}
                  >
                    <ThemedText style={styles.switchText}>Change</ThemedText>
                  </TouchableOpacity>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <ThemedText style={styles.label}>Password</ThemedText>
                    <TouchableOpacity
                      onPress={() => router.push('/(auth)/forgot-password')}
                    >
                      <ThemedText style={styles.forgotText}>Forgot?</ThemedText>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={(val) => {
                        clearError();
                        setPassword(val);
                      }}
                      secureTextEntry={!showPassword}
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#94a3b8" />
                      ) : (
                        <Eye size={20} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    (!password || isLoading) && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={!password || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Sign In</ThemedText>
                  )}
                </TouchableOpacity>

                {/* Back to Change Org */}
                <TouchableOpacity
                  onPress={handleSwitchAccount}
                  style={styles.backLink}
                >
                  <ArrowLeft size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.backLinkText}>
                    Use a different school or email
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </ThemedView>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Need help accessing your dashboard? Contact your School Administrator.
            </ThemedText>
          </View>
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
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 38,
    height: 38,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
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
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
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
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
  forgotText: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '600',
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
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: '#0284c7',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badgeEmail: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  badgeSubdomain: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  switchButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38bdf8',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  backLinkText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
