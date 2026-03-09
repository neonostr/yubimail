import { useState } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { Plus, Copy, Trash2, Tag, Timer, Mail, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { MailAccount } from '@/types/vault';

function getTimeRemaining(autoDeleteAt?: number): string | null {
  if (!autoDeleteAt) return null;
  const diff = autoDeleteAt - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface Props {
  onCreateNew: () => void;
}

export default function AddressSidebar({ onCreateNew }: Props) {
  const { vault, selectedAccountId, setSelectedAccountId, updateVault } = useVault();
  const accounts = vault?.accounts || [];

  const handleCopy = async (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    toast.success('Copied to clipboard');
  };

  const handleDelete = async (account: MailAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Try to delete from mail.tm
      const { deleteAccount } = await import('@/lib/mailtm');
      await deleteAccount(account.id, account.token).catch(() => {});
    } catch {}
    
    await updateVault((v) => ({
      ...v,
      accounts: v.accounts.filter((a) => a.id !== account.id),
    }));

    if (selectedAccountId === account.id) {
      setSelectedAccountId(null);
    }
    toast.success('Address deleted');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button onClick={onCreateNew} className="w-full gap-2" size="sm">
          <Plus className="w-4 h-4" />
          New Address
        </Button>
      </div>

      {/* Address List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {accounts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            <Mail className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>No addresses yet</p>
            <p className="text-xs mt-1">Create one to get started</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {accounts.map((account) => {
              const isSelected = selectedAccountId === account.id;
              const timeLeft = getTimeRemaining(account.autoDeleteAt);

              return (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccountId(account.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors group',
                    isSelected
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs truncate text-foreground">
                        {account.address}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {account.tag && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            {account.tag}
                          </Badge>
                        )}
                        {timeLeft && (
                          <Badge
                            variant={timeLeft === 'Expired' ? 'destructive' : 'outline'}
                            className="text-[10px] px-1.5 py-0 h-4 gap-1"
                          >
                            <Timer className="w-2.5 h-2.5" />
                            {timeLeft}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => handleCopy(account.address, e)}
                        className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground"
                        title="Copy address"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(account, e)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
