import { tt } from './i18n/actual';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Brand() {
  return <a className="brand" href="#/" aria-label={tt('comp.inicio')}>
    <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
      <path d="M20 2 36 11v18L20 38 4 29V11Z" fill="currentColor" />
      <path d="M20 29V15m0 6c-7 0-10-4-10-8 7 0 10 3 10 8Zm0-3c0-6 4-9 10-9 0 6-4 9-10 9Z" fill="none" stroke="var(--paper)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
    <span>Agro<span className="brand-light">Hive</span></span>
  </a>;
}

export function ActionLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <a className={`button ${secondary ? 'button-secondary' : ''}`} href={href}>{children}<span aria-hidden="true">↗</span></a>;
}

export function Button({ children, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} type={type} {...props}>{children}</button>;
}

export function Card({ title, eyebrow, children, className = '' }: { title: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
    <h2>{title}</h2>{children}
  </section>;
}

type DataStateProps = { state: 'missing' | 'loading' | 'error'; children?: ReactNode };
export function DataState({ state, children }: DataStateProps) {
  const labels = { missing: 'NO_EVALUABLE', loading: tt('comp.cargando'), error: tt('comp.error') };
  return <div className={`data-state data-state-${state}`} role={state === 'error' ? 'alert' : state === 'loading' ? 'status' : undefined}>
    <span className="state-marker" aria-hidden="true">{state === 'error' ? '!' : state === 'loading' ? '…' : '—'}</span>
    <div><strong>{labels[state]}</strong>{children && <p>{children}</p>}</div>
  </div>;
}

export function PageHeading({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return <header className="page-heading">
    <p className="eyebrow">{step}{tt('comp.explora')}</p>
    <h1 tabIndex={-1}>{title}</h1><p className="page-intro">{children}</p>
  </header>;
}

export function FieldIllustration({ compact = false }: { compact?: boolean }) {
  return <div className={`field-illustration ${compact ? 'field-compact' : ''}`} aria-hidden="true">
    <div className="field-grid" />
    <div className="field-sun" />
    <div className="field-plots"><i /><i /><i /><i /><i /><i /></div>
    <div className="field-cross field-cross-a">+</div><div className="field-cross field-cross-b">+</div>
  </div>;
}

export function MethodNotes() {
  return <details className="method-notes">
    <summary>{tt('comp.notas')}</summary>
    <div>
        <p><a href="#/metodo">{tt('comp.verMetodo')}</a></p>
        <p>{tt('comp.nota1')}</p>
        <p>{tt('comp.fuenteClima')}<a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">{tt('comp.powerEnlace')}</a>{tt('comp.nota2')}</p>
        <p>{tt('comp.nota3')}</p>
      <p>{tt('comp.nota4')}</p>
    </div>
  </details>;
}
