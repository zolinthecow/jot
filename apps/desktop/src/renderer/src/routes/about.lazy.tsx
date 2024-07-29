import { createLazyFileRoute } from '@tanstack/react-router';

const About: React.FC = () => {
    return <div className="p-2">Hello from About!</div>;
};

export const Route = createLazyFileRoute('/about')({
    component: About,
});
