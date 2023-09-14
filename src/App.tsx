import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import CommonLayout from './components/layout/CommonLayout';

import Editor from './pages/Editor';

const router = createBrowserRouter([
  {
    path: '/',
    element: <CommonLayout />,
    children: [
      {
        path: '',
        element: <Editor />,
      },
      {
        path: '/editor',
        element: <Editor />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
