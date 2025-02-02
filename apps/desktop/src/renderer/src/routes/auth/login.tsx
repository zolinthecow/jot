import { createFileRoute } from '@tanstack/react-router';
import { type JSX, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { router } from '@renderer/main';
import icon_dark from '@resources/icon_dark.svg';
// import icon_light from '@resources/icon_light.svg';

type LoginSearch = {
    redirect: string;
};

export const Route = createFileRoute('/auth/login')({
    validateSearch: (search: Record<string, unknown>): LoginSearch => {
        return {
            redirect: (search.redirect as string) || '/',
        };
    },
    component: Login,
});

function Login(): JSX.Element {
    const { redirect } = Route.useSearch();

    const [loading, setLoading] = useState<boolean>(false);
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
        setLoading(true);
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'github',
            });
            setErrorMessage(null);
        } catch (err) {
            console.error('[GITHUB OAUTH ERROR]:', err);
            setErrorMessage((err as Error).message);
        }
        setLoading(false);
    };

    return (
        <div className="flex h-screen w-full items-center justify-center">
            {loading ?? (
                <div className="absolute w-screen h-screen z-50 bg-[rgba(0,0,0,0.5)] flex justify-center items-center">
                    {' '}
                </div>
            )}
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
                    <img
                        src={icon_dark}
                        alt="Jot Icon"
                        className="h-20 w-auto"
                    />
                    <h1 className="text-3xl font-bold text-foreground">Jot</h1>
                </div>
                <div className="w-full space-y-4">
                    <Button
                        variant="default"
                        className="w-full"
                        onClick={signInOrSignUp}
                    >
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
}
