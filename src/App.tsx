import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Activity, BookOpen, ChevronRight, Hand, Home, Languages,
  Menu, MessageSquareText, Settings, ShieldAlert, Sparkles, Video, X,
  type LucideIcon,
} from 'lucide-react'
import {
  BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation,
} from 'react-router-dom'
import {
  AboutPage, CommunicationPage, EmergencyPage, HomePage, LanguagesPage,
  LearningPage, RecognitionPage, SettingsPage,
} from './pages'
import { BackendStatus } from './components/BackendStatus'
import { readSettings, saveSettings, type AppSettings } from './settings'
import { saveRemoteSettings } from './services/apiClient'

const navigation: { name: string; path: string; icon: LucideIcon }[] = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'ISL Recognition', path: '/recognition', icon: Video },
  { name: 'Two-way communication', path: '/communication', icon: MessageSquareText },
  { name: 'Emergency mode', path: '/emergency', icon: ShieldAlert },
  { name: 'Regional languages', path: '/languages', icon: Languages },
  { name: 'ISL learning', path: '/learning', icon: BookOpen },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'About', path: '/about', icon: Sparkles },
]

function AppFrame() {
  const location = useLocation()
  const [settings, setSettings] = useState<AppSettings>(readSettings)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const systemReducedMotion = useReducedMotion()
  const reduceMotion = settings.reducedMotion || Boolean(systemReducedMotion)
  const currentPage = navigation.find((item) => item.path === location.pathname)?.name ?? 'Home'

  useEffect(() => {
    try { saveSettings(settings) } catch { /* Storage may be disabled by the browser. */ }
    void saveRemoteSettings(settings).catch(() => undefined)
  }, [settings])

  function updateSettings(nextSettings: AppSettings) {
    setSettings(nextSettings)
  }

  const motionProps = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -5 }, transition: { duration: 0.18 } }

  return (
    <div className={`app-shell theme-${settings.theme}${settings.highContrast ? ' high-contrast' : ''}${settings.largerText ? ' larger-text' : ''}${settings.largerControls ? ' larger-controls' : ''}${reduceMotion ? ' reduce-motion' : ''}`} data-accent={settings.accent}>
      <aside className="desktop-sidebar" aria-label="Main navigation">
        <NavBrand />
        <p className="sidebar-label">WORKSPACE</p>
        <nav className="sidebar-nav">
          {navigation.map((item) => <NavigationItem key={item.path} item={item} />)}
        </nav>
        <div className="sidebar-note"><span><Hand size={18} /></span><strong>Communication matters.</strong><p>More ways to understand each other, one conversation at a time.</p></div>
        <p className="sidebar-version">EchoGesture · Prototype</p>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button type="button" className="icon-button mobile-menu-button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="topbar-heading"><div className="breadcrumbs"><span>EchoGesture</span><ChevronRight size={13} /><strong>{currentPage}</strong></div><h1>{currentPage === 'Home' ? 'Your accessible communication space' : currentPage}</h1></div>
          <div className="topbar-actions"><BackendStatus /><NavLink to="/settings" className="profile-link" aria-label="Open settings"><span className="profile-mark"><Activity size={18} /></span><span className="profile-name">Prototype</span></NavLink></div>
        </header>

        {mobileMenuOpen && <><button type="button" className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} /><nav className="mobile-drawer" aria-label="Mobile navigation">{navigation.map((item) => <NavigationItem key={item.path} item={item} onNavigate={() => setMobileMenuOpen(false)} />)}</nav></>}

        <AnimatePresence mode="wait" initial={false}>
          <motion.main className="page-content" key={location.pathname} {...motionProps}>
            <Outlet context={{ settings, updateSettings }} />
            <footer className="app-footer"><span>EchoGesture · Built for inclusive communication</span><span>Model integration pending</span></footer>
          </motion.main>
        </AnimatePresence>
        {settings.voiceAssistance && <span className="screen-reader-only" aria-live="polite">{currentPage} page loaded</span>}

        <nav className="mobile-bottom-nav" aria-label="Quick navigation">
          {navigation.slice(0, 4).map((item) => <NavigationItem key={item.path} item={item} compact />)}
        </nav>
      </div>
    </div>
  )
}

function NavBrand() {
  return <NavLink to="/" className="brand-lockup"><span className="brand-symbol"><Activity size={21} strokeWidth={2.2} /></span><span><strong>EchoGesture</strong><small>COMMUNICATION FOR ALL</small></span></NavLink>
}

function NavigationItem({ item, compact = false, onNavigate }: { item: (typeof navigation)[number]; compact?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink to={item.path} end={item.path === '/'} onClick={onNavigate} className={({ isActive }) => `navigation-link${isActive ? ' navigation-link-active' : ''}${compact ? ' navigation-link-compact' : ''}`} aria-label={compact ? item.name : undefined}>
      <Icon size={18} strokeWidth={1.8} /><span>{item.name}</span>
      {!compact && <span className="nav-active-indicator" />}
    </NavLink>
  )
}

function RoutedApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppFrame />}>
          <Route index element={<HomePage />} />
          <Route path="recognition" element={<RecognitionPage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="emergency" element={<EmergencyPage />} />
          <Route path="languages" element={<LanguagesPage />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <RoutedApp />
}
