import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import SuburbView from '../views/SuburbView.vue'
import DashboardView from '../views/DashboardView.vue'
import CompareView from '../views/CompareView.vue'
import ContactView from '../views/ContactView.vue'
import PlantTipsView from '../views/PlantTipsView.vue'
import AccessibilityView from '../views/AccessibilityView.vue' // 👈 NEW

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/compare',
      name: 'compare',
      component: CompareView,
    },
    {
      path: '/contact',
      name: 'contact',
      component: ContactView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },

    // Plant tips page
    {
      path: '/plant-tips',
      name: 'plant-tips',
      component: PlantTipsView,
    },

    // Accessibility options page
    {
      path: '/accessibility',
      name: 'accessibility',
      component: AccessibilityView,
    },


    {
      path: '/suburb/:suburb',
      name: 'suburb',
      component: SuburbView,
    },
  ],
})

export default router
