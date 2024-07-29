import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { M } from '@/lib/replicache/mutators';
import type { ReplicacheWorkspace } from '@repo/replicache-schema';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import type { Replicache } from 'replicache';
import { v4 as uuid } from 'uuid';

type Props = {
    r: Replicache<M>;
    session: Session;
};

const CreateWorkspaceDialog: React.FC<Props> = ({ r, session }) => {
    const [workspaceName, setWorkspaceName] = useState<string>('');
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        if (showAlert) {
            const timer = setTimeout(() => setShowAlert(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showAlert]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (workspaceName.trim() === '') {
            setShowAlert(true);
            return;
        }

        const newWorkspace: ReplicacheWorkspace = {
            id: uuid(),
            userID: session.user.id,
            path: workspaceName.trim(),
            name: workspaceName.trim(),
        };
        r.mutate.createWorkspace({ workspace: newWorkspace });
        setWorkspaceName('');
        setIsOpen(false);
    };

    return (
        <div className="flex w-full h-full items-center justify-center bg-background rounded-md">
            <div
                className={`fixed z-[75] top-0 left-0 right-0 transition-transform duration-300 ease-in-out ${showAlert ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <Alert
                    variant="destructive"
                    className="w-full max-w-md mx-auto mt-4 shadow-lg"
                >
                    <AlertTitle className="mb-0">
                        Please enter a name
                    </AlertTitle>
                </Alert>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setIsOpen(true)}>
                        Create Your Workspace
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Create Your Workspace</DialogTitle>
                            <DialogDescription>
                                This will be the root folder for all your notes.
                            </DialogDescription>
                        </DialogHeader>
                        <Input
                            id="workspace-name"
                            placeholder="name.."
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            className="mt-6"
                        />
                        <DialogFooter className="sm:justify-start mt-3">
                            <Button type="submit" variant="default">
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CreateWorkspaceDialog;
