import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import icon_dark from '@resources/icon_dark.svg';
// import icon_light from '@resources/icon_light.svg';

const Login: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState<boolean>(false);

  useEffect(() => {
    if (errorMessage) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const signInOrSignUp = async (): Promise<void> => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'github',
      });
      setErrorMessage(null);
    } catch (err) {
      console.error('[GOOGLE OAUTH ERROR]:', err);
      setErrorMessage((err as Error).message);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-6">
        <div
          className={`
            w-full overflow-hidden transition-all duration-300 ease-in-out
            ${showError ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="bg-destructive text-destructive-foreground p-3 rounded-md shadow-md">
            {errorMessage}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <img src={icon_dark} alt="Jot Icon" className="h-20 w-auto" />
          <h1 className="text-3xl font-bold text-foreground">Jot</h1>
        </div>
        <div className="w-full space-y-4">
          <Button variant="default" className="w-full" onClick={signInOrSignUp}>
            Login
          </Button>
          <Button
            className="w-full font-semibold"
            variant="ghost"
            onClick={signInOrSignUp}
          >
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/auth/login')({
  component: Login,
});
