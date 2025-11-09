import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import orion from "@/assets/OrionBg.png";
import { useContractServices } from "@/hooks/useContractServices";
import { toast } from "sonner";

const DashboardNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isConnected, address, connect, disconnect } = useContractServices();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleConnect = async () => {
    try {
      await connect();
      toast.success("Wallet connected successfully!");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error("Failed to connect wallet. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className={`dashboard-navbar-container transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        {/* THIS IS THE FIXED LINE 👇 */}
        <div className="w-full px-6 h-16 flex items-center">
          {/* Logo - Top Left */}
          <div className="flex items-center gap-3 mr-auto">
            <img src={orion} alt="Orion" className="w-8 h-8" />
            <div className="font-beau text-2xl text-foreground font-normal tracking-wide">
              Orion
            </div>
          </div>

          {/* Wallet Connection - Top Right */}
          <div className="flex items-center ml-auto">
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 bg-card rounded-full px-4 py-2 card-shadow">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-inter text-sm text-foreground font-medium tracking-wider">
                    {formatAddress(address)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="bg-black text-white hover:bg-gray-800 font-antic font-semibold px-6 py-2 rounded-[10px] tracking-wide"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnect}
                className="bg-black/75 text-white hover:bg-gray-800 font-antic font-semibold px-6 py-2 rounded-[10px] tracking-wide"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardNavbar;