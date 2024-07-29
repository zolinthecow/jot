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
import type { Replicache } from 'replicache';

type Props = {
    r: Replicache;
};

const CreateWorkspaceDialog: React.FC<Props> = ({ r }) => {
    return (
        <div className="flex w-full h-full items-center justify-center">
            <Alert
                variant="destructive"
                className="absolute z-[75] w-64 h-12 p-0 top-4 flex justify-center items-center"
            >
                <AlertTitle className="mb-0">Please enter a name</AlertTitle>
            </Alert>
            <Dialog>
                <DialogTrigger>Create Your Workspace</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Your Workspace</DialogTitle>
                        <DialogDescription>
                            This will be the root folder for all your notes.
                        </DialogDescription>
                    </DialogHeader>
                    <Input id="workspace-name" placeholder="name.." />
                    <DialogFooter className="sm:justify-start">
                        <DialogClose asChild>
                            <Button type="submit" variant="default">
                                Save
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CreateWorkspaceDialog;
