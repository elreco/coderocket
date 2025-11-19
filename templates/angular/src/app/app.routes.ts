import { Routes } from '@angular/router';

import { HomeComponent } from './home';
import { NotFoundComponent } from './not-found';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: '**',
    component: NotFoundComponent,
  },
];
