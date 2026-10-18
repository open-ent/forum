import { RouteObject, createHashRouter } from 'react-router-dom';

import { Categories } from './screens/Categories';
import { Category } from './screens/Category';
import { Root } from './screens/Root';
import { Subject } from './screens/Subject';

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

// Routeur à fragment : l'app est servie sous `/forum` (route serveur unique `@Get("")`), le routage se fait dans
// `/forum#/…` — comme l'AngularJS (`#/view/:catId`). Un routeur par chemin donnait un 404 au rechargement (F5) d'une
// catégorie ou d'un sujet, et cassait les liens `#/view/…` venus d'ailleurs.
export const router = createHashRouter(routes);
