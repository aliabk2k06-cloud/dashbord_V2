import { useState } from 'react'
import { DirectionProvider } from '@radix-ui/react-direction'
import { Menu } from 'lucide-react'
import { Button } from '../ui/button'
import { Sidebar } from './sidebar'
import { ThemeToggle } from './theme-toggle'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <DirectionProvider dir="rtl">
      <div className="flex min-h-screen">
        {/* Sidebar - on the right for RTL */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="فتح القائمة"
              id="sidebar-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex-1" />

            <ThemeToggle />
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </DirectionProvider>
  )
}
