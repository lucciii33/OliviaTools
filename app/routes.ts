import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("register", "routes/register.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password/:token", "routes/reset-password.$token.tsx"),
  route("accept-invite", "routes/accept-invite.tsx"),
  route("workspace", "routes/workspace.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("mcp-qa-runs", "routes/mcp-qa-runs.tsx"),
  route("mcp-docs", "routes/mcp-docs.tsx"),
  route("mcp-docs/:projectId", "routes/mcp-docs.$projectId.tsx"),
  route("mcp-docs/:projectId/bugs", "routes/mcp-docs.$projectId.bugs.tsx"),
  route("mcp-docs/:projectId/smoke", "routes/mcp-docs.$projectId.smoke.tsx"),
  route(
    "mcp-docs/:projectId/regression",
    "routes/mcp-docs.$projectId.regression.tsx"
  ),
  route("mcp-docs/:projectId/load", "routes/mcp-docs.$projectId.load.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),
  route("docs", "routes/docs.tsx"),
  route("docs/:owner/:repo", "routes/docs.$owner.$repo.tsx"),
  route("swagger-qa", "routes/swagger-qa.tsx"),
  route("e2e-qa", "routes/e2e-qa.tsx"),
  route("academy", "routes/academy.tsx"),
  route("academy/:courseId", "routes/academy.$courseId.tsx"),
  route("*", "routes/catch-all.tsx"),
] satisfies RouteConfig
