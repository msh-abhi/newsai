import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const EventsGuideHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-accent transition-colors font-medium">
              Home
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Event Calendar
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Book Downloads
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Newsletter
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Submit Event
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Contact
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 flex flex-col gap-4">
            <Link to="/" className="text-foreground hover:text-accent transition-colors font-medium">
              Home
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Event Calendar
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Book Downloads
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Newsletter
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Submit Event
            </Link>
            <Link to="/events-guide" className="text-foreground hover:text-accent transition-colors font-medium">
              Contact
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default EventsGuideHeader;
