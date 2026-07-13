'use client'

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/** Debounced search box that syncs a `q` query param into the URL. */
export function UserSearch({ initial }: { initial: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initial)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = value.trim()
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      router.replace(`${pathname}?${params.toString()}`)
    }, 300)
    return () => clearTimeout(timer)
  }, [value, pathname, router, searchParams])

  return (
    <div className="relative w-full max-w-sm">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, @username or email"
        className="pl-9"
        aria-label="Search users"
      />
    </div>
  )
}
