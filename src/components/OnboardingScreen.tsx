import { motion } from 'framer-motion';
import { Shield, Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isWebAuthnSupported, registerCredential, authenticateCredential } from '@/lib/webauthn';
import { createVault, unlockVault, vaultExists, getStoredKeyIds } from '@/lib/vault';
import { useVault } from '@/contexts/VaultContext';
import { useState } from 'react';
import { toast } from 'sonner';

export default function OnboardingScreen() {
  const { setVault, setCryptoKey } = useVault();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasVault = vaultExists();
  const supported = isWebAuthnSupported();

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { credentialId, rawId } = await registerCredential();
      const { vault, key } = await createVault(credentialId, rawId);
      setVault(vault);
      setCryptoKey(key);
      toast.success('Vault created successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    setLoading(true);
    setError(null);
    try {
      const keyIds = getStoredKeyIds();
      const { credentialId, rawId } = await authenticateCredential(keyIds);
      const { vault, key } = await unlockVault(credentialId, rawId);
      setVault(vault);
      setCryptoKey(key);
      toast.success('Vault unlocked');
    } catch (err: any) {
      setError(err.message || 'Failed to unlock vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center space-y-8"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
        </motion.div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Yubi<span className="text-primary">Mail</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Disposable email addresses, secured by your YubiKey.
            <br />
            <span className="text-sm">No passwords. No accounts. No traces.</span>
          </p>
        </div>

        {/* Actions */}
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
            className="space-y-4"
          >
            {hasVault ? (
              <>
                <Button
                  onClick={handleUnlock}
                  disabled={loading}
                  size="lg"
                  className="w-full h-14 text-base gap-3"
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
                className="w-full h-14 text-base gap-3"
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

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-4 pt-4"
        >
          {[
            { label: 'Encrypted', desc: 'AES-256-GCM' },
            { label: 'No Backend', desc: 'Client-side only' },
            { label: 'Disposable', desc: 'Auto-delete timers' },
          ].map((f) => (
            <div key={f.label} className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
