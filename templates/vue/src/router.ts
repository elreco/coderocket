import { createRouter, createWebHistory } from "vue-router";

import Home from "./Home.vue";
import NotFound from "./NotFound.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: Home,
    },
    {
      path: "/:pathMatch(.*)*",
      component: NotFound,
    },
  ],
});

export default router;
