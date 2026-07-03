import { RouteObject, createBrowserRouter } from 'react-router-dom';

import { Categories } from './screens/Categories';
import { Category } from './screens/Category';
import { Root } from './screens/Root';
import { Subject } from './screens/Subject';

// Réécrit à la racine du module (`/forum` en prod). En embarqué/dev, racine `/`.
export const basename = import.meta.env.PROD ? '/forum' : '/';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Categories /> },
      { path: 'view/:catId', element: <Category /> },
      { path: 'view/:catId/subject/:subId', element: <Subject /> },
    ],
  },
];

export const router = createBrowserRouter(routes, { basename });
