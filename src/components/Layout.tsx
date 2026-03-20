import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Home } from "lucide-react";
import dunaLogo from "@/assets/duna-logo.jpeg";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-gradient-dark shadow-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <NavLink to="/" className="flex items-center gap-2.5 text-primary-foreground hover:opacity-80 transition-opacity active:scale-95">
              <Home className="h-5 w-5" />
              <span className="text-sm font-semibold font-body">Início</span>
            </NavLink>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-full overflow-hidden border-2 border-primary/40 hover:border-primary transition-colors h-9 w-9 flex-shrink-0 active:scale-95"
            >
              <img src={dunaLogo} alt="Casa Duna" className="h-full w-full object-cover" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};
