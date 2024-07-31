import type {
    ReplicacheFile,
    ReplicacheFolder,
    ReplicacheWorkspace,
} from '@repo/replicache-schema';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Mosaic, type MosaicNode } from 'react-mosaic-component';
import type { DeepReadonlyObject } from 'replicache';

import WorkspacePane from './WorkspacePane';

import 'react-mosaic-component/react-mosaic-component.css';
import './mosaic.css';

type Props = {
    workspace: ReplicacheWorkspace;
    folders: Array<ReplicacheFolder>;
    files: Array<DeepReadonlyObject<ReplicacheFile>>;
    mosaicState: MosaicNode<string>;
};

const countPanes = (node: MosaicNode<string> | null): number => {
    if (node === null) return 0;
    if (typeof node === 'string') return 1;
    return countPanes(node.first) + countPanes(node.second);
};

const Layout: React.FC<Props> = ({
    workspace,
    folders,
    files,
    mosaicState: _mosaicState,
}) => {
    const [mosaicState, setMosaicState] = useState<MosaicNode<string> | null>(
        _mosaicState,
    );

    useEffect(() => {
        if (mosaicState) {
            window.api
                .setStorage('mosaicState', mosaicState)
                .catch((err) => console.error('[MOSAIC STATE ERR]:', err));
        }
    }, [mosaicState]);

    const paneCount = useMemo(() => countPanes(mosaicState), [mosaicState]);

    const createNewPane = () => {
        return (paneCount + 1).toString();
    };

    const splitPane = (path: Array<string>, direction: 'row' | 'column') => {
        const newPaneId = createNewPane();
        setMosaicState((currentState) => {
            if (typeof currentState === 'string') {
                // If it's the initial single pane, create a new split
                return {
                    direction,
                    first: currentState,
                    second: newPaneId,
                    splitPercentage: 50,
                };
            }

            const updatedState = JSON.parse(JSON.stringify(currentState));
            let node: MosaicNode<string> = updatedState;
            for (let i = 0; i < path.length - 1; i++) {
                node = node[path[i]];
            }
            const lastKey = path[path.length - 1];
            node[lastKey] = {
                direction,
                first: node[lastKey],
                second: newPaneId,
                splitPercentage: 50,
            };
            return updatedState;
        });
    };

    return (
        <div className="transition-all duration-150 ease-in-out flex flex-1 gap-2 relative">
            <Mosaic<string>
                renderTile={(id, path) => (
                    <WorkspacePane
                        title={`Pane ${id}`}
                        path={path}
                        splitPane={splitPane}
                        workspace={workspace}
                        folders={folders}
                        files={files}
                    />
                )}
                className="p-0"
                value={mosaicState}
                onChange={(state) => setMosaicState(state)}
            />
        </div>
    );
};

export default Layout;
