import React, { createContext, useContext, useState, useCallback } from 'react';
import type { VaultData, MailAccount } from '@/types/vault';
import { saveVault } from '@/lib/vault';

interface VaultContextType {
  vault: VaultData | null;
  cryptoKey: CryptoKey | null;
  isUnlocked: boolean;
  prfEnabled: boolean;
  selectedAccountId: string | null;
  setVault: (vault: VaultData) => void;
  setCryptoKey: (key: CryptoKey) => void;
  setPrfEnabled: (enabled: boolean) => void;
  setSelectedAccountId: (id: string | null) => void;
  updateVault: (updater: (vault: VaultData) => VaultData) => Promise<void>;
  lock: () => void;
  getSelectedAccount: () => MailAccount | undefined;
}

const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [vault, setVaultState] = useState<VaultData | null>(null);
  const [cryptoKey, setCryptoKeyState] = useState<CryptoKey | null>(null);
  const [prfEnabled, setPrfEnabledState] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const isUnlocked = vault !== null && cryptoKey !== null;

  const setVault = useCallback((v: VaultData) => setVaultState(v), []);
  const setCryptoKey = useCallback((k: CryptoKey) => setCryptoKeyState(k), []);
  const setPrfEnabled = useCallback((e: boolean) => setPrfEnabledState(e), []);

  const updateVault = useCallback(
    async (updater: (vault: VaultData) => VaultData) => {
      if (!vault || !cryptoKey) throw new Error('Vault not unlocked');
      const updated = updater(vault);
      await saveVault(updated, cryptoKey);
      setVaultState(updated);
    },
    [vault, cryptoKey]
  );

  const lock = useCallback(() => {
    setVaultState(null);
    setCryptoKeyState(null);
    setPrfEnabledState(false);
    setSelectedAccountId(null);
  }, []);

  const getSelectedAccount = useCallback(() => {
    if (!vault || !selectedAccountId) return undefined;
    return vault.accounts.find((a) => a.id === selectedAccountId);
  }, [vault, selectedAccountId]);

  return (
    <VaultContext.Provider
      value={{
        vault,
        cryptoKey,
        isUnlocked,
        prfEnabled,
        selectedAccountId,
        setVault,
        setCryptoKey,
        setPrfEnabled,
        setSelectedAccountId,
        updateVault,
        lock,
        getSelectedAccount,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
}
