'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      // Mock bypass if no supabase keys provided
      console.log('Mock bypass login')
      redirect('/dashboard')
    }
    redirect('/login?error=Invalid%20credentials')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      // Mock bypass if no supabase keys provided
      console.log('Mock bypass signup')
      redirect('/dashboard')
    }
    redirect('/login?error=Signup%20failed')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
