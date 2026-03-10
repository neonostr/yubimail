import { motion } from 'framer-motion';
import { Shield, Key, AlertCircle, Info, Lock, CloudOff, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isWebAuthnSupported, registerCredential, authenticateCredential } from '@/lib/webauthn';
import { createVault, unlockVault, vaultExists, getStoredKeyIds, isVaultPrfEnabled } from '@/lib/vault';
import { useVault } from '@/contexts/VaultContext';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export default function OnboardingScreen() {
  const { setVault, setCryptoKey, setVmkBytes, setPrfEnabled } = useVault();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const hasVault = vaultExists();
  const supported = isWebAuthnSupported();
  const autoTriggered = useRef(false);

  useEffect(() => {
    if (hasVault && supported && !autoTriggered.current) {
      autoTriggered.current = true;
      handleUnlock(true);
    }
  }, [hasVault, supported]);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await registerCredential();
      const keyMaterial = result.prfOutput || result.rawId;
      const { vault, key, vmkBytes } = await createVault(
        result.credentialId, result.rawId, keyMaterial, result.prfSupported
      );
      setVault(vault);
      setCryptoKey(key);
      setVmkBytes(vmkBytes);
      setPrfEnabled(result.prfSupported);
      if (!result.prfSupported) {
        toast.warning('Your authenticator does not support PRF. Using fallback encryption (less secure).');
      } else {
        toast.success('Vault created with hardware-bound encryption');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (silent = false) => {
    setLoading(true);
    setError(null);
    try {
      const keyIds = getStoredKeyIds();
      const vaultUsesPrf = isVaultPrfEnabled();
      const result = await authenticateCredential(keyIds);
      let keyMaterial: ArrayBuffer;
      if (vaultUsesPrf) {
        if (!result.prfOutput) {
          throw new Error('This vault requires PRF support. Your authenticator may not support it, or use a different key.');
        }
        keyMaterial = result.prfOutput;
      } else {
        keyMaterial = result.rawId;
      }
      const { vault, key, vmkBytes } = await unlockVault(result.credentialId, keyMaterial);
      setVault(vault);
      setCryptoKey(key);
      setVmkBytes(vmkBytes);
      setPrfEnabled(vaultUsesPrf);
      toast.success('Vault unlocked');
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Failed to unlock vault');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Lock, label: 'Encrypted Vault', desc: 'AES-256-GCM' },
    { icon: CloudOff, label: 'No Backend', desc: 'Client-side only' },
    { icon: Timer, label: 'Disposable', desc: 'Auto-delete timers' },
  ];

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg text-center space-y-10 relative z-10"
      >
        {/* Shield icon with glow */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center"
        >
          <div
            className="w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
            style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.15), 0 0 80px hsl(var(--primary) / 0.05)' }}
          >
            <Shield className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        {/* Title & subtitle */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Yubi<span className="text-primary">Mail</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-sm mx-auto">
            Disposable email addresses, secured by your YubiKey.
          </p>
          <p className="text-muted-foreground/70 text-sm">
            No passwords · No accounts · No tracking
          </p>
        </div>

        {/* CTA */}
        {!supported ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm text-left">
              WebAuthn is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            {hasVault ? (
              <>
                <Button
                  onClick={() => handleUnlock()}
                  disabled={loading}
                  size="lg"
                  className="w-full h-14 text-base gap-3 shadow-lg shadow-primary/20"
                >
                  <Key className="w-5 h-5" />
                  {loading ? 'Waiting for YubiKey...' : 'Tap YubiKey to Unlock'}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  variant="ghost"
                  size="lg"
                  className="w-full text-muted-foreground"
                >
                  Create New Vault
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={loading}
                size="lg"
                className="w-full h-14 text-base gap-3 shadow-lg shadow-primary/20"
              >
                <Key className="w-5 h-5" />
                {loading ? 'Waiting for YubiKey...' : 'Tap YubiKey to Get Started'}
              </Button>
            )}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive text-left">{error}</p>
          </motion.div>
        )}

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-3 pt-2"
        >
          {features.map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border"
            >
              <f.icon className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Info section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {!infoExpanded ? (
            <button
              onClick={() => setInfoExpanded(true)}
              className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              How does this work?
            </button>
          ) : (
            <div className="text-left space-y-3 p-4 rounded-lg bg-card border border-border text-xs text-muted-foreground">
              <button
                onClick={() => setInfoExpanded(false)}
                className="flex items-center gap-1.5 text-foreground font-medium mb-2"
              >
                <Info className="w-3.5 h-3.5 text-primary" />
                How YubiMail works
              </button>
              <div className="space-y-2">
                <p>
                  <span className="text-foreground font-medium">What it does:</span> YubiMail creates disposable email addresses using the{' '}
                  <a href="https://docs.mail.tm" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    mail.tm API
                  </a>
                  . Your login credentials for these addresses are encrypted and stored locally in your browser, protected by your YubiKey.
                </p>
                <p><span className="text-foreground font-medium">Receive only:</span> These are receive-only inboxes. You cannot send emails from them.</p>
                <p><span className="text-foreground font-medium">Email retention:</span> Emails on mail.tm servers are stored for a maximum of 7 days, then automatically deleted.</p>
                <p><span className="text-foreground font-medium">What is encrypted:</span> Your mail.tm account credentials (email + password) are encrypted with AES-256-GCM inside the vault. The emails themselves are not end-to-end encrypted.</p>
                <p><span className="text-foreground font-medium">No backend:</span> YubiMail has no server. The encrypted vault lives entirely in your browser's local storage. If you clear your browser data, your vault is gone.</p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* GitHub footer */}
      <motion.a
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        Free & Open Source
      </motion.a>
    </div>
  );
}
