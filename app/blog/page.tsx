import type { Metadata } from 'next'
import { PageShell } from '@/components/site/page-shell'

export const metadata: Metadata = {
  title: 'Blog | Masanawa',
  description: 'Product updates, security notes, and guidance from the Masanawa team.',
}

const POSTS = [
  {
    date: 'Jul 2026',
    tag: 'Product',
    title: 'Send crypto by @username, no address required',
    excerpt: 'How we designed username transfers to remove the most common cause of lost funds—pasting the wrong address.',
  },
  {
    date: 'Jun 2026',
    tag: 'Security',
    title: 'What we show you before you confirm a transaction',
    excerpt: 'A look at the recipient, amount, rate, and fee summary that appears on every buy, sell, transfer, and withdrawal.',
  },
  {
    date: 'May 2026',
    tag: 'Guides',
    title: 'Funding your naira balance from your bank',
    excerpt: 'A step-by-step walkthrough of your dedicated virtual NGN account and how deposits are confirmed.',
  },
]

export default function BlogPage() {
  return (
    <PageShell
      eyebrow="Blog"
      title="Notes from the Masanawa team."
      description="Product updates, security explainers, and practical guides for moving money with confidence."
    >
      <ul className="divide-y divide-border">
        {POSTS.map((post) => (
          <li key={post.title} className="flex flex-col gap-4 py-8 lg:flex-row lg:gap-10">
            <div className="flex items-center gap-3 lg:w-48 lg:flex-col lg:items-start lg:gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">{post.date}</span>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-primary">{post.tag}</span>
            </div>
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{post.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10 rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
        More articles are on the way. For real-time product news, follow updates inside the app.
      </p>
    </PageShell>
  )
}
