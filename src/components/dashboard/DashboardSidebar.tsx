import { Layers, CreditCard, User, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardSidebarProps {
  activeSection: 'stake' | 'borrow' | 'profile' | 'transactions';
  setActiveSection: (section: 'stake' | 'borrow' | 'profile' | 'transactions') => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const DashboardSidebar = ({
  activeSection,
  setActiveSection,
  collapsed,
  setCollapsed
}: DashboardSidebarProps) => {
  const navItems = [
    {
      id: 'stake' as const,
      label: 'Stake',
      icon: Layers
    },
    {
      id: 'borrow' as const,
      label: 'Borrow',
      icon: CreditCard
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User
    },
    {
      id: 'transactions' as const,
      label: 'Transactions',
      icon: FileText
    }
  ];

  return (
    <aside className={`fixed left-4 top-20 bottom-4 bg-black/75 backdrop-blur-md transition-all duration-300 z-10 rounded-2xl border border-border/10 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full p-3">
        {/* Collapse Toggle */}
        <div className={`flex mb-4 ${collapsed ? 'justify-center' : 'justify-center'}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={`p-0 hover:bg-white/10 text-white ${
              collapsed ? 'h-10 w-10' : 'h-8 w-8'
            }`}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 ${collapsed ? 'space-y-4' : 'space-y-3'}`}>
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            const IconComponent = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center rounded-xl transition-all duration-200 group ${
                  collapsed 
                    ? 'justify-center px-4 py-3 h-12' 
                    : 'gap-3 p-3'
                } ${
                  isActive 
                    ? 'bg-white/30 text-primary-foreground shadow-md' 
                    : 'text-white/70 hover:text-white hover:bg-white/30'
                }`}
              >
                {collapsed ? (
                  // Collapsed state - icon only, centered
                  <div className="flex items-center justify-center">
                    <IconComponent className="w-5 h-5" />
                  </div>
                ) : (
                  // Expanded state - icon + text
                  <>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-white/20' 
                        : 'bg-transparent group-hover:bg-white/10'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="font-antic font-medium text-sm tracking-wide">
                        {item.label}
                      </div>
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="text-xs text-white/40 font-inter font-light tracking-wider">
                Orion v1.0
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;