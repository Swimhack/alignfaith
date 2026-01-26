'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { ArrowLeft, ArrowRight, Check, User, MapPin, Heart, Loader2, Church, Brain, Dumbbell, Wallet, Sparkles } from 'lucide-react'

const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
]

const PILLARS = [
    { id: 'SPIRITUAL', name: 'Spiritual', icon: Church, color: '#4F46E5', description: 'Your faith foundation and relationship with God.' },
    { id: 'MENTAL', name: 'Mental', icon: Brain, color: '#0891B2', description: 'Emotional intelligence and clarity of thought.' },
    { id: 'PHYSICAL', name: 'Physical', icon: Dumbbell, color: '#059669', description: 'Body stewardship, health, and discipline.' },
    { id: 'FINANCIAL', name: 'Financial', icon: Wallet, color: '#CA8A04', description: 'Stewardship of resources and financial wisdom.' },
    { id: 'APPEARANCE', name: 'Appearance', icon: Sparkles, color: '#D946EF', description: 'Presenting yourself with dignity and intention.' },
    { id: 'INTIMACY', name: 'Intimacy', icon: Heart, color: '#E11D48', description: 'Healthy boundaries and relational readiness.' },
]

export default function ProfileSetupPage() {
    const { data: session, status, update } = useSession()
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        dateOfBirth: '',
        gender: '',
        seekingGender: '',
        city: '',
        state: '',
        bio: '',
        relationshipGoal: 'SERIOUS_DATING',
        pillarScores: {
            SPIRITUAL: 5,
            MENTAL: 5,
            PHYSICAL: 5,
            FINANCIAL: 5,
            APPEARANCE: 5,
            INTIMACY: 5,
        }
    })

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    const updateFormData = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError(null)
    }

    const updatePillarScore = (pillar: string, score: number) => {
        setFormData(prev => ({
            ...prev,
            pillarScores: {
                ...prev.pillarScores,
                [pillar]: score
            }
        }))
        setError(null)
    }

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.dateOfBirth) {
                    setError('Date of birth is required')
                    return false
                }
                const age = calculateAge(new Date(formData.dateOfBirth))
                if (age < 18) {
                    setError('You must be 18 or older')
                    return false
                }
                if (!formData.gender) {
                    setError('Please select your gender')
                    return false
                }
                return true
            case 2:
                // Pillar scores are defaults (5), so always valid for now
                return true
            case 3:
                if (!formData.city.trim()) {
                    setError('City is required')
                    return false
                }
                if (!formData.state) {
                    setError('State is required')
                    return false
                }
                return true
            case 4:
                if (!formData.seekingGender) {
                    setError('Please select who you are looking for')
                    return false
                }
                if (!formData.relationshipGoal) {
                    setError('Please select your relationship goal')
                    return false
                }
                return true
            default:
                return true
        }
    }

    const calculateAge = (birthDate: Date): number => {
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age
    }

    const nextStep = () => {
        if (validateStep(currentStep) && currentStep < 4) {
            setCurrentStep(currentStep + 1)
            setError(null)
            window.scrollTo(0, 0)
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
            setError(null)
            window.scrollTo(0, 0)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateStep(currentStep)) return

        setIsLoading(true)
        setError(null)

        try {
            // Format pillar scores for API
            const formattedPillarScores = Object.entries(formData.pillarScores).map(([pillar, selfScore]) => ({
                pillar,
                selfScore
            }))

            const response = await fetch('/api/profile/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dateOfBirth: formData.dateOfBirth,
                    gender: formData.gender,
                    seekingGender: formData.seekingGender,
                    city: formData.city.trim(),
                    state: formData.state,
                    bio: formData.bio.trim(),
                    relationshipGoal: formData.relationshipGoal,
                    pillarScores: formattedPillarScores,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to complete profile')
            }

            // Update session to reflect profile completion
            await update({ profileComplete: true })

            // Redirect to dashboard
            router.push('/dashboard')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete profile')
        } finally {
            setIsLoading(false)
        }
    }

    if (status === 'loading') {
        return (
            <>
                <Header />
                <main style={{ paddingTop: 'var(--header-height)' }}>
                    <section className="section section--cream" style={{ minHeight: 'calc(100vh - var(--header-height))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p>Loading...</p>
                    </section>
                </main>
            </>
        )
    }

    if (!session) {
        return null
    }

    const steps = [
        { id: 1, name: 'About You', icon: User },
        { id: 2, name: 'Assessment', icon: Dumbbell },
        { id: 3, name: 'Location', icon: MapPin },
        { id: 4, name: 'Preferences', icon: Heart },
    ]

    return (
        <>
            <Header />
            <main style={{ paddingTop: 'var(--header-height)' }}>
                <section className="section section--cream" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
                    <div className="container">
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                                <h1 style={{
                                    fontFamily: 'var(--font-heading)',
                                    fontSize: 'var(--text-4xl)',
                                    color: 'var(--color-primary)',
                                    marginBottom: 'var(--space-2)',
                                }}>
                                    Your Relational Fitness Journey
                                </h1>
                                <p style={{ color: 'var(--color-slate)' }}>
                                    Everything starts with your personal assessment
                                </p>
                            </div>

                            {/* Progress Steps */}
                            <div className="progress-steps">
                                {steps.map((step) => (
                                    <div
                                        key={step.id}
                                        className={`progress-step ${currentStep > step.id ? 'progress-step--completed' :
                                            currentStep === step.id ? 'progress-step--active' :
                                                'progress-step--pending'
                                            }`}
                                    >
                                        <div className="progress-step__circle">
                                            {currentStep > step.id ? <Check size={18} /> : step.id}
                                        </div>
                                        <span className="progress-step__label">{step.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="card" style={{ marginTop: 'var(--space-8)' }}>
                                <form onSubmit={handleSubmit}>
                                    {error && (
                                        <div style={{
                                            backgroundColor: '#FEE2E2',
                                            border: '1px solid #F87171',
                                            borderRadius: 'var(--radius-md)',
                                            padding: 'var(--space-4)',
                                            marginBottom: 'var(--space-6)',
                                            color: '#B91C1C',
                                        }}>
                                            {error}
                                        </div>
                                    )}

                                    {/* Step 1: About You */}
                                    {currentStep === 1 && (
                                        <div>
                                            <h2 style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
                                                About You
                                            </h2>

                                            <div className="form-group">
                                                <label className="form-label">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={formData.dateOfBirth}
                                                    onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                                                    required
                                                    disabled={isLoading}
                                                />
                                                <p className="form-hint">You must be 18 or older</p>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">I am a</label>
                                                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                                                    <label style={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 'var(--space-2)',
                                                        padding: 'var(--space-4)',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: `2px solid ${formData.gender === 'MALE' ? 'var(--color-primary)' : 'var(--color-rose)'}`,
                                                        backgroundColor: formData.gender === 'MALE' ? 'var(--color-blush)' : 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            name="gender"
                                                            value="MALE"
                                                            checked={formData.gender === 'MALE'}
                                                            onChange={(e) => updateFormData('gender', e.target.value)}
                                                            style={{ display: 'none' }}
                                                        />
                                                        Man
                                                    </label>
                                                    <label style={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 'var(--space-2)',
                                                        padding: 'var(--space-4)',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: `2px solid ${formData.gender === 'FEMALE' ? 'var(--color-primary)' : 'var(--color-rose)'}`,
                                                        backgroundColor: formData.gender === 'FEMALE' ? 'var(--color-blush)' : 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            name="gender"
                                                            value="FEMALE"
                                                            checked={formData.gender === 'FEMALE'}
                                                            onChange={(e) => updateFormData('gender', e.target.value)}
                                                            style={{ display: 'none' }}
                                                        />
                                                        Woman
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Pillar Assessment */}
                                    {currentStep === 2 && (
                                        <div>
                                            <h2 style={{ marginBottom: 'var(--space-2)', textAlign: 'center' }}>
                                                Relational Fitness Assessment
                                            </h2>
                                            <p style={{
                                                textAlign: 'center',
                                                color: 'var(--color-slate)',
                                                marginBottom: 'var(--space-8)'
                                            }}>
                                                Rate your current status in each pillar (1-10). Be honest: this is for your growth.
                                            </p>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                                                {PILLARS.map((pillar) => (
                                                    <div key={pillar.id} style={{
                                                        padding: 'var(--space-4)',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                                        borderRadius: 'var(--radius-lg)',
                                                        border: '1px solid var(--color-rose-light)',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: 'var(--radius-md)',
                                                                backgroundColor: `${pillar.color}15`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: pillar.color,
                                                            }}>
                                                                <pillar.icon size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 style={{ marginBottom: 0 }}>{pillar.name} Fitness</h4>
                                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate)', marginBottom: 0 }}>
                                                                    {pillar.description}
                                                                </p>
                                                            </div>
                                                            <div style={{ marginLeft: 'auto', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                                {formData.pillarScores[pillar.id as keyof typeof formData.pillarScores]}
                                                            </div>
                                                        </div>

                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            step="1"
                                                            value={formData.pillarScores[pillar.id as keyof typeof formData.pillarScores]}
                                                            onChange={(e) => updatePillarScore(pillar.id, parseInt(e.target.value))}
                                                            style={{
                                                                width: '100%',
                                                                cursor: 'pointer',
                                                                accentColor: 'var(--color-primary)',
                                                            }}
                                                        />
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-slate)' }}>
                                                            <span>Room for Growth</span>
                                                            <span>Disciplined</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 3: Location */}
                                    {currentStep === 3 && (
                                        <div>
                                            <h2 style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
                                                Your Location
                                            </h2>

                                            <div className="form-group">
                                                <label className="form-label">City</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.city}
                                                    onChange={(e) => updateFormData('city', e.target.value)}
                                                    placeholder="Enter your city"
                                                    required
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">State</label>
                                                <select
                                                    className="form-input"
                                                    value={formData.state}
                                                    onChange={(e) => updateFormData('state', e.target.value)}
                                                    required
                                                    disabled={isLoading}
                                                >
                                                    <option value="">Select a state</option>
                                                    {US_STATES.map(state => (
                                                        <option key={state} value={state}>{state}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Bio (optional)</label>
                                                <textarea
                                                    className="form-input form-textarea"
                                                    value={formData.bio}
                                                    onChange={(e) => updateFormData('bio', e.target.value)}
                                                    placeholder="Tell others a bit about your growth journey..."
                                                    disabled={isLoading}
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 4: Preferences */}
                                    {currentStep === 4 && (
                                        <div>
                                            <h2 style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
                                                Your Preferences
                                            </h2>

                                            <div className="form-group">
                                                <label className="form-label">I am looking for a</label>
                                                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                                                    <label style={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 'var(--space-2)',
                                                        padding: 'var(--space-4)',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: `2px solid ${formData.seekingGender === 'MALE' ? 'var(--color-primary)' : 'var(--color-rose)'}`,
                                                        backgroundColor: formData.seekingGender === 'MALE' ? 'var(--color-blush)' : 'transparent',
                                                        cursor: 'pointer',
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            name="seekingGender"
                                                            value="MALE"
                                                            checked={formData.seekingGender === 'MALE'}
                                                            onChange={(e) => updateFormData('seekingGender', e.target.value)}
                                                            style={{ display: 'none' }}
                                                        />
                                                        Man
                                                    </label>
                                                    <label style={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 'var(--space-2)',
                                                        padding: 'var(--space-4)',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: `2px solid ${formData.seekingGender === 'FEMALE' ? 'var(--color-primary)' : 'var(--color-rose)'}`,
                                                        backgroundColor: formData.seekingGender === 'FEMALE' ? 'var(--color-blush)' : 'transparent',
                                                        cursor: 'pointer',
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            name="seekingGender"
                                                            value="FEMALE"
                                                            checked={formData.seekingGender === 'FEMALE'}
                                                            onChange={(e) => updateFormData('seekingGender', e.target.value)}
                                                            style={{ display: 'none' }}
                                                        />
                                                        Woman
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">What are you looking for?</label>
                                                <select
                                                    className="form-input"
                                                    value={formData.relationshipGoal}
                                                    onChange={(e) => updateFormData('relationshipGoal', e.target.value)}
                                                    required
                                                    disabled={isLoading}
                                                >
                                                    <option value="MARRIAGE">Marriage</option>
                                                    <option value="SERIOUS_DATING">Serious Dating</option>
                                                    <option value="DISCERNING">Still Discerning</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Navigation */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginTop: 'var(--space-8)',
                                        paddingTop: 'var(--space-6)',
                                        borderTop: '1px solid var(--color-rose)',
                                    }}>
                                        {currentStep > 1 ? (
                                            <button
                                                type="button"
                                                onClick={prevStep}
                                                className="btn btn--secondary"
                                                disabled={isLoading}
                                            >
                                                <ArrowLeft size={18} />
                                                Back
                                            </button>
                                        ) : (
                                            <div />
                                        )}

                                        {currentStep < 4 ? (
                                            <button
                                                type="button"
                                                onClick={nextStep}
                                                className="btn btn--primary"
                                                disabled={isLoading}
                                            >
                                                Continue
                                                <ArrowRight size={18} />
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                className="btn btn--primary"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 size={18} className="animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        Complete Assessment
                                                        <Check size={18} />
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    )
}
