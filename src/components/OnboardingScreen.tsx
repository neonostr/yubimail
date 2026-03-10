import { motion } from 'framer-motion';
import { Shield, Key, AlertCircle, Info } from 'lucide-react';
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

  // Auto-trigger unlock if vault exists
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
        result.credentialId,
        result.rawId,
        keyMaterial,
        result.prfSupported
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
      // Silent mode: user cancelled, just reset quietly
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
        className="w-full max-w-md text-center space-y-8">
        
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center">
          
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
        </motion.div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Yubi<span className="text-primary">Mail</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Disposable email addresses, secured by your YubiKey.
            <br />
            <span className="text-sm">No passwords. No accounts. No tracking.</span>
          </p>
        </div>

        {!supported ?
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm text-left">
              WebAuthn is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div> :

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4">
          
            {hasVault ?
          <>
                <Button onClick={() => handleUnlock()} disabled={loading} size="lg" className="w-full h-14 text-base gap-3">
                  <Key className="w-5 h-5" />
                  {loading ? 'Waiting for YubiKey...' : 'Tap YubiKey to Unlock'}
                </Button>
                <Button onClick={handleCreate} disabled={loading} variant="ghost" size="lg" className="w-full text-muted-foreground">
                  Create New Vault
                </Button>
              </> :

          <Button onClick={handleCreate} disabled={loading} size="lg" className="w-full h-14 text-base gap-3">
                <Key className="w-5 h-5" />
                {loading ? 'Waiting for YubiKey...' : 'Tap YubiKey to Get Started'}
              </Button>
          }
          </motion.div>
        }

        {error &&
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive text-left">{error}</p>
          </motion.div>
        }

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-4 pt-4">
          
          {[
          { label: 'Encrypted Vault', desc: 'AES-256-GCM' },
          { label: 'No Backend', desc: 'Client-side only' },
          { label: 'Disposable', desc: 'Auto-delete timers' }].
          map((f) =>
          <div key={f.label} className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}>
          
          {!infoExpanded ?
          <button
            onClick={() => setInfoExpanded(true)}
            className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
            
              <Info className="w-3.5 h-3.5" />
              How does this work?
            </button> :

          <div className="text-left space-y-3 p-4 rounded-lg bg-card border border-border text-xs text-muted-foreground">
              <button
              onClick={() => setInfoExpanded(false)}
              className="flex items-center gap-1.5 text-foreground font-medium mb-2">
              
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

                <p>
                  <span className="text-foreground font-medium">Receive only:</span> These are receive-only inboxes. You cannot send emails from them.
                </p>

                <p>
                  <span className="text-foreground font-medium">Email retention:</span> Emails on mail.tm servers are stored for a maximum of 7 days, then automatically deleted. This is a limitation of the upstream service.
                </p>

                <p>
                  <span className="text-foreground font-medium">What is encrypted:</span> Your mail.tm account credentials (email + password) are encrypted with AES-256-GCM inside the vault. The emails themselves are not end-to-end encrypted — they are standard emails stored on mail.tm servers.
                </p>

                <p>
                  <span className="text-foreground font-medium">No backend:</span> YubiMail has no server. The encrypted vault lives entirely in your browser's local storage. If you clear your browser data, your vault is gone.
                </p>
              </div>

              <p className="pt-2 border-t border-border">
                YubiMail is free &amp; open source.{' '}
                <a href="https://github.com/neonostr/yubimail" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  View on GitHub
                </a>
              </p>
            </div>
          }
        </motion.div>
      </motion.div>
    </div>);

}