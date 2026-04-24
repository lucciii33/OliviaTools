import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("docs", "routes/docs.tsx"),
  route("docs/:owner/:repo", "routes/docs.$owner.$repo.tsx"),
] satisfies RouteConfig
