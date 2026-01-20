'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const CreateShopSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  slug: z.string().min(3, 'El slug debe tener al menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  inviteCode: z.string().min(1, 'El código de invitación es requerido')
})

export type CreateShopState = {
  errors?: {
    name?: string[]
    slug?: string[]
    inviteCode?: string[]
    _form?: string[]
  }
  message?: string | null
}

const INVITE_CODE = process.env.INVITE_CODE || 'ColdBizTech'

export async function createShop(prevState: CreateShopState, formData: FormData): Promise<CreateShopState> {
  const validatedFields = CreateShopSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    inviteCode: formData.get('inviteCode'),
  })

  // 1. Zod Validation
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Por favor revisa los campos.',
    }
  }

  const { name, slug, inviteCode } = validatedFields.data

  // 2. Invite Code Validation
  if (inviteCode !== INVITE_CODE) {
    return {
      errors: {
        inviteCode: ['Código de invitación incorrecto']
      },
      message: 'Acceso denegado.'
    }
  }

  const supabase = await createClient()

  // 3. User Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { message: 'Debes iniciar sesión para continuar.' }
  }

  try {
    // 4. Create Shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .insert({
        name,
        slug,
        api_key_n8n: crypto.randomUUID(),
        public_key: crypto.randomUUID(),
        theme: { color: 'blue' }
      })
      .select()
      .single()

    if (shopError) {
      if (shopError.code === '23505') { // Unique constraint
        return {
          errors: {
            slug: ['Este slug ya está en uso.']
          },
          message: 'Error al crear el comercio.'
        }
      }
      throw shopError
    }

    // 5. Link User
    const { error: linkError } = await supabase
      .from('shop_users')
      .insert({
        shop_id: shop.id,
        user_id: user.id,
        role: 'owner'
      })

    if (linkError) throw linkError

  } catch (error) {
    console.error('Database Error:', error)
    return { message: 'Error de base de datos. Inténtalo de nuevo.' }
  }

  // 6. Redirect
  redirect(`/dashboard/${slug}`)
}
