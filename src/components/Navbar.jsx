import { useState, useEffect } from "react";
import orion from "../assets/Orion.png";
import "../styles/Navbar.css";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 100); // Trigger after 100px scroll
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="navbar-container">
      <div className={`navbar-desktop ${isScrolled ? "navbar-scrolled" : ""}`}>
        {/* Logo */}
        <div className="navbar-logo">
          <div className="logo-placeholder">
            <div className="logo-icon">
              <img src={orion} alt="Orion" />
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="navbar-nav">
          <a href="#features" className="nav-link">
            Features
          </a>
          <a href="#pricing" className="nav-link">
            Pricing
          </a>
          <a href="#changelog" className="nav-link">
            Changelog
          </a>
          <a href="#contact" className="nav-link">
            Contact
          </a>
        </nav>

        {/* CTA Button */}
        <a href="/dashboard" className="cta-button">
          Launch App
        </a>
      </div>

      {/* Mobile Version */}
      <div className={`navbar-mobile ${isScrolled ? "navbar-scrolled" : ""}`}>
        {/* Logo */}
        <div className="navbar-logo">
          <div className="logo-placeholder">
            <div className="logo-icon">
              <img src={orion} alt="Orion" />
            </div>
          </div>
        </div>

        {/* Hamburger Menu */}
        <div className="hamburger-menu">
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
