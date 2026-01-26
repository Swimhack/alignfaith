import Image from 'next/image'
import {
    Church,
    Brain,
    Dumbbell,
    Wallet,
    Sparkles,
    Heart
} from 'lucide-react'

const pillars = [
    {
        icon: Church,
        title: 'Spiritual Fitness',
        description: 'Deepen your faith and relationship with God as the foundation of all other areas.',
        image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=400&q=80',
    },
    {
        icon: Brain,
        title: 'Mental Fitness',
        description: 'Develop emotional intelligence, clarity of thought, and healthy mindset patterns.',
        image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&q=80',
    },
    {
        icon: Dumbbell,
        title: 'Physical Fitness',
        description: 'Honor your body through discipline, health, and stewardship of your physical self.',
        image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
    },
    {
        icon: Wallet,
        title: 'Financial Fitness',
        description: 'Build wisdom around money, generosity, and responsible stewardship of resources.',
        image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&q=80',
    },
    {
        icon: Sparkles,
        title: 'Appearance Fitness',
        description: 'Present yourself with intention, dignity, and confidence that reflects inner growth.',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    },
    {
        icon: Heart,
        title: 'Intimacy Fitness',
        description: 'Understand healthy boundaries, emotional connection, and prepare for covenant relationship.',
        image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80',
    },
]

export default function SixPillars() {
    return (
        <section id="pillars" className="section section--cream">
            <div className="container">
                <div className="text-center" style={{ marginBottom: 'var(--space-16)' }}>
                    <div className="section-badge">
                        <Sparkles size={14} />
                        <span>The Framework</span>
                    </div>
                    <h2 className="section-title">The Six Pillars</h2>
                    <p className="section-subtitle">
                        Rooted uses the Six Pillars to build your <strong>Readiness Score</strong>. These are the areas of focus for your personal assessment, growth tracking, and intentional alignment.
                    </p>
                </div>

                <div className="pillars-grid">
                    {pillars.map((pillar) => (
                        <div key={pillar.title} className="pillar-card">
                            <div className="pillar-card__image">
                                <Image
                                    src={pillar.image}
                                    alt={pillar.title}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                />
                                <div className="pillar-card__image-overlay" />
                            </div>
                            <div className="pillar-card__content">
                                <div className="pillar-card__icon">
                                    <pillar.icon size={24} />
                                </div>
                                <h3 className="pillar-card__title">{pillar.title}</h3>
                                <p className="pillar-card__description">{pillar.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
