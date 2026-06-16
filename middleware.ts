export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/rates/:path*', '/quotations/:path*', '/settings/:path*'],
}
