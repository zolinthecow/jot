import { Button } from '@/components/ui/button';

function App(): JSX.Element {
  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <h1 className="text-4xl font-bold underline">Hello world!</h1>
      <Button variant="outline">hi</Button>
    </>
  );
}

export default App;
