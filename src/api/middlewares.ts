import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/lexware/**",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
  ],
})
