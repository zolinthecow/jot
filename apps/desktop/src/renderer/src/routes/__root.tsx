import { getReplicache } from '@/lib/replicache';
import type { M } from '@/lib/replicache/mutators';
import { supabase } from '@/lib/supabase';
import { router } from '@renderer/main';
import type { Session } from '@supabase/supabase-js';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useEffect } from 'react';
import type { Replicache } from 'replicache';

export interface RouterContext {
    session: Session | null;
    replicache: Replicache<M> | null;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    beforeLoad: async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        let replicache: Replicache<M> | null = null;

        if (session) {
            replicache = getReplicache({
                name: session.user.id,
                auth: session.access_token,
                DEBUG_MODE: true,
            });
        }

        return { session, replicache };
    },
    component: () => {
        const context = Route.useRouteContext();

        useEffect(() => {
            const {
                data: { subscription },
            } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    if (
                        !context.replicache ||
                        context.replicache.name !== session.user.id
                    ) {
                        router.invalidate();
                    }
                } else if (event === 'SIGNED_OUT') {
                    router.invalidate();
                    router.history.push('/auth/login');
                } else if (
                    event === 'TOKEN_REFRESHED' &&
                    session &&
                    context.replicache
                ) {
                    // router.invalidate();
                }
            });

            return () => subscription.unsubscribe();
        }, [context]);

        return (
            <>
                <Outlet />
                <TanStackRouterDevtools />
            </>
        );
    },
});
