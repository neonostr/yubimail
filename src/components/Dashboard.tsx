import { useState } from 'react';
import { useVault } from '@/contexts/VaultContext';
import AddressSidebar from '@/components/AddressSidebar';
import InboxView from '@/components/InboxView';
import CreateAddressDialog from '@/components/CreateAddressDialog';
import SettingsDialog from '@/components/SettingsDialog';
import { Button } from '@/components/ui/button';
import { Lock, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { lock, vault } = useVault();
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLock = () => {
    lock();
    toast.info('Vault locked');
  };

  return (
    <div className="dark h-screen flex flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm tracking-tight">
            Yubi<span className="text-primary">Mail</span>
          </span>
          <span className="text-xs text-muted-foreground ml-2 font-mono">
            {vault?.accounts.length || 0} addresses
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLock} title="Lock vault" className="text-warning hover:text-warning">
            <Lock className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-border shrink-0 bg-card">
          <AddressSidebar onCreateNew={() => setCreateOpen(true)} />
        </aside>

        {/* Inbox */}
        <main className="flex-1 overflow-hidden">
          <InboxView />
        </main>
      </div>

      {/* Dialogs */}
      <CreateAddressDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
