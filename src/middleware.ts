/**
 * Middleware - Auth + Multi-tenant detection
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Verificar usuario autenticado contra el servidor (no confiar solo en cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (
    (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') &&
    user
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Multi-tenant shop_slug detection
  const url = request.nextUrl
  let shopSlug: string | null = null

  const pathMatch = url.pathname.match(/^\/(dashboard|widget)\/([^\/]+)/)
  if (pathMatch) {
    shopSlug = pathMatch[2]
  }

  if (shopSlug) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-shop-slug', shopSlug)

    supabaseResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Excluir: archivos estáticos, imágenes, webhooks públicos y rutas de API sin auth
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/v1/whatsapp|api/public).*)',
  ],
}
