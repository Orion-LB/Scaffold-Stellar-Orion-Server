import { useState } from "react";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import StakeSection from "@/components/dashboard/StakeSection";
import BorrowSection from "@/components/dashboard/BorrowSection";
import ProfileSection from "@/components/dashboard/ProfileSection";
import HeroBackground from "@/components/HeroBackground";

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState<'stake' | 'borrow' | 'profile'>('stake');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'stake':
        return <StakeSection />;
      case 'borrow':
        return <BorrowSection />;
      case 'profile':
        return <ProfileSection />;
      default:
        return <StakeSection />;
    }
  };

  return (
    <div className="h-screen  bg-background">
            <HeroBackground />
      
      <DashboardNavbar />
      
      <div className="relative h-full pt-16">
        {/* Base Layer - Sidebar */}
        <DashboardSidebar 
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
        
        {/* Top Layer - Main Dashboard Content */}
        <main
          className={`fixed top-16 bottom-0 right-0 transition-all duration-300 z-20 ${
            sidebarCollapsed
              ? 'left-20' // Give space for collapsed sidebar (64px + 16px margin)
              : 'left-72' // Give space for expanded sidebar (256px + 16px margin)
          }`}
        >
          <div className="h-full">
            {renderActiveSection()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;