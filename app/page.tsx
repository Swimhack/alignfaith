import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Hero from '@/components/Hero'
import SixPillars from '@/components/SixPillars'
import HowItWorks from '@/components/HowItWorks'
import CorePrinciples from '@/components/CorePrinciples'
import MembershipTiers from '@/components/MembershipTiers'
import PhotoPolicy from '@/components/PhotoPolicy'
import CTASection from '@/components/CTASection'

export default function Home() {
    return (
        <>
            <Header />
            <main>
                <Hero />
                <SixPillars />
                <HowItWorks />
                <CorePrinciples />
                <PhotoPolicy />
                <MembershipTiers />
                <CTASection />
            </main>
            <Footer />
        </>
    )
}
