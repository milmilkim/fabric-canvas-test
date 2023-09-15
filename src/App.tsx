import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import CommonLayout from './components/layout/CommonLayout';

import Editor from './pages/Editor';
import Konva from './pages/Konva';

const router = createBrowserRouter([
  {
    path: '/',
    element: <CommonLayout />,
    children: [
      {
        path: '',
        element: <Konva />,
      },
      {
        path: '/fabric',
        element: <Editor />,
      },
      {
        path: '/konva',
        element: <Konva />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
