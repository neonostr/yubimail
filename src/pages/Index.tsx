import { useVault } from '@/contexts/VaultContext';
import OnboardingScreen from '@/components/OnboardingScreen';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { isUnlocked } = useVault();

  if (!isUnlocked) {
    return <OnboardingScreen />;
  }

  return <Dashboard />;
};

export default Index;
