// Injection key for the Navbar's page-menu Teleport target (see
// `NavbarMenu.vue`). Provided once by the app shell (`App.vue`) via the
// Navbar's `menu` slot; belongs to that single App instance, never to a
// global store, so multiple app roots (tests, future entrypoints) never
// share a target by accident.
export const navbarMenuKey = Symbol("navbarMenu");
