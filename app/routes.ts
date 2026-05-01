import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("mcp-docs", "routes/mcp-docs.tsx"),
  route("mcp-docs/:projectId", "routes/mcp-docs.$projectId.tsx"),
  route("mcp-docs/:projectId/bugs", "routes/mcp-docs.$projectId.bugs.tsx"),
  route("docs", "routes/docs.tsx"),
  route("docs/:owner/:repo", "routes/docs.$owner.$repo.tsx"),
] satisfies RouteConfig
