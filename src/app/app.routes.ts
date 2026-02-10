import { Routes } from '@angular/router';
import { Home } from './pages/common/home/home';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';

// This file defines the routes for the application. Each route maps a URL path to a component that should be displayed 
// when the user navigates to that path. The routes are defined as an array of objects,
//  where each object has a 'path' and a 'component' property. The 'path' is the URL segment that will trigger the route, and the 'component' is the Angular component that will be rendered when the route is activated. In this example, the routes array is currently empty, meaning that there are no defined routes in the application yet.
export const routes: Routes = [
    { path:'' , title:"Collection Media App", component: Home },
    { path:'login' , title:"Login Page", component: Login },
    { path:'register' , title:"Register Page", component: Register },
];
