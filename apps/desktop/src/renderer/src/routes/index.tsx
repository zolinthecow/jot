import { supabase } from '@/lib/supabase';
import {
  Link,
  Outlet,
  createFileRoute,
  createRootRoute,
  redirect,
} from '@tanstack/react-router';

const Index: React.FC = () => {
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
    </div>
  );
};

export const Route = createFileRoute('/')({
  beforeLoad: async ({ location }) => {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw redirect({
        to: '/auth/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: Index,
});
