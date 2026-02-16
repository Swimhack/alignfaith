'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Lock, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isForced = session?.user?.mustChangePassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to change password')
        return
      }

      setSuccess(true)

      // Update the session to clear mustChangePassword
      await update({ mustChangePassword: false })

      // Redirect after short delay
      setTimeout(() => {
        if (session?.user?.role === 'ADMIN') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
        router.refresh()
      }, 1500)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main style={{ paddingTop: 'var(--header-height)' }}>
        <section className="section section--cream" style={{
          minHeight: 'calc(100vh - var(--header-height))',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div className="container">
            <div style={{ maxWidth: '450px', margin: '0 auto' }}>
              <div className="card">
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                  <h1 style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-3xl)',
                    color: 'var(--color-primary)',
                    marginBottom: 'var(--space-2)',
                  }}>
                    {isForced ? 'Set Your Password' : 'Change Password'}
                  </h1>
                  <p style={{ color: 'var(--color-slate)' }}>
                    {isForced
                      ? 'Please set a new password to secure your account.'
                      : 'Enter your current password and choose a new one.'}
                  </p>
                </div>

                {success ? (
                  <div style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-6)',
                    textAlign: 'center',
                    color: '#22C55E',
                  }}>
                    <CheckCircle size={32} style={{ marginBottom: 'var(--space-2)' }} />
                    <p style={{ fontWeight: 600 }}>Password updated successfully!</p>
                    <p style={{ fontSize: 'var(--text-sm)', opacity: 0.8 }}>Redirecting...</p>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-4)',
                        marginBottom: 'var(--space-6)',
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}>
                        <AlertCircle size={18} />
                        {error}
                      </div>
                    )}

                    {isForced && (
                      <div style={{
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-4)',
                        marginBottom: 'var(--space-6)',
                        color: '#FBBF24',
                        fontSize: 'var(--text-sm)',
                      }}>
                        Your temporary password must be changed before you can continue.
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>
                      <div className="form-group">
                        <label className="form-label">
                          {isForced ? 'Temporary Password' : 'Current Password'}
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)' }} />
                          <input
                            type="password"
                            className="form-input"
                            style={{ paddingLeft: '40px' }}
                            value={currentPassword}
                            onChange={(e) => { setCurrentPassword(e.target.value); setError(null) }}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">New Password</label>
                        <div style={{ position: 'relative' }}>
                          <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)' }} />
                          <input
                            type="password"
                            className="form-input"
                            style={{ paddingLeft: '40px' }}
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setError(null) }}
                            placeholder="Min 8 chars, uppercase, lowercase, number"
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <div style={{ position: 'relative' }}>
                          <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)' }} />
                          <input
                            type="password"
                            className="form-input"
                            style={{ paddingLeft: '40px' }}
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn--primary"
                        style={{ width: '100%', marginTop: 'var(--space-4)' }}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            Set New Password
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
