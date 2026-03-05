'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function SupabaseTestPage() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>(
    'loading'
  )
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function checkConnection() {
      try {
        // Just checking if properties are there, we can't actually call the API 
        // without real credentials which might be missing in .env.local initially
        const { error } = await supabase.from('orders').select('*').limit(1)

        if (error && error.message.includes('FetchError')) {
          // This usually means the URL is invalid/missing
          setStatus('error')
          setMessage('Could not connect to Supabase. Check your .env.local credentials.')
        } else if (error && error.code === 'PGRST116') {
          // This code means the table doesn't exist, but it DID talk to Supabase!
          setStatus('connected')
          setMessage('Successfully connected to Supabase (Table "test_connection" not found, but API responded).')
        } else if (error) {
          setStatus('error')
          setMessage(`Error: ${error.message}`)
        } else {
          setStatus('connected')
          setMessage('Successfully connected to Supabase!')
        }
      } catch (err: any) {
        setStatus('error')
        setMessage(`Unexpected error: ${err.message}`)
      }
    }

    checkConnection()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <div
        className={`p-4 rounded-md ${status === 'loading'
            ? 'bg-blue-100 text-blue-700'
            : status === 'connected'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
      >
        <p className="font-semibold">Status: {status.toUpperCase()}</p>
        <p className="mt-2">{message}</p>
      </div>
      <div className="mt-6 text-sm text-gray-600">
        <p>
          Note: You must set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your{' '}
          <code>.env.local</code> for this test to work.
        </p>
      </div>
    </div>
  )
}
