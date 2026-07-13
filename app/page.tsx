import { Navbar } from '@/components/site/navbar'
import { Hero } from '@/components/site/hero'
import { Features } from '@/components/site/features'
import { Security } from '@/components/site/security'
import { HowItWorks } from '@/components/site/how-it-works'
import { Assets } from '@/components/site/assets'
import { Faq } from '@/components/site/faq'
import { DownloadCta } from '@/components/site/download-cta'
import { Footer } from '@/components/site/footer'

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Assets />
        <Security />
        <DownloadCta />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
