import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PageHeading({ eyebrow, title, description, action }: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>
}

export function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="section-title">
      <div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>
      {action}
    </div>
  )
}

export function FeatureLink({ to, icon: Icon, title, description, tone = 'blue' }: {
  to: string
  icon: typeof ArrowUpRight
  title: string
  description: string
  tone?: 'blue' | 'teal' | 'coral' | 'mint'
}) {
  return (
    <Link to={to} className="feature-link">
      <span className={`feature-icon tone-${tone}`}><Icon size={21} strokeWidth={1.8} /></span>
      <span className="feature-copy"><strong>{title}</strong><span>{description}</span></span>
      <ArrowUpRight className="feature-arrow" size={17} />
    </Link>
  )
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'blue' | 'teal' | 'coral' }) {
  return <span className={`status-pill status-${tone}`}><span />{children}</span>
}
