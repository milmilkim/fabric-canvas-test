import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import CommonLayout from './components/layout/CommonLayout';

import Editor from './pages/Editor';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <CommonLayout />,
      children: [
        {
          path: '',
          element: <Editor />,
        },
        {
          path: '/fabric',
          element: <Editor />,
        },
      ],
    },
  ],
  {
    basename:
      process.env.NODE_ENV === 'production' ? `/fabric-canvas-test` : '/',
  }
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
