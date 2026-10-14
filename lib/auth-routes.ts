export function isProtectedRoute(pathname: string) {
  return ["/videos", "/compare"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
