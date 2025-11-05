import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import logo from '../../assets/events-guide/logo.png';

const EventsGuideFooter = () => {
  return (
    <footer style={{ backgroundColor: '#121554' }} className="text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Miami Dade Disability News" className="h-12 w-12" />
              <div className="flex flex-col">
                <span className="text-xl font-bold">Miami Dade</span>
                <span className="text-lg font-semibold text-highlight">Disability News</span>
              </div>
            </div>
            <p className="text-primary-foreground/80 mb-4">
              Your trusted source for disability news, resources, and community events in Miami Dade County.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <Phone className="h-4 w-4" />
                <span>305-401-6224</span>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <Mail className="h-4 w-4" />
                <a href="mailto:info@miamidadedisabilitynews.com" className="hover:text-highlight transition-colors">
                  info@miamidadedisabilitynews.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <MapPin className="h-4 w-4" />
                <span>Miami, Florida</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-primary-foreground/80 hover:text-highlight transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/events-guide" className="text-primary-foreground/80 hover:text-highlight transition-colors">
                  Event Calendar
                </Link>
              </li>
              <li>
                <Link to="/events-guide" className="text-primary-foreground/80 hover:text-highlight transition-colors">
                  Newsletter
                </Link>
              </li>
              <li>
                <Link to="/events-guide" className="text-primary-foreground/80 hover:text-highlight transition-colors">
                  Submit Event
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-bold text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/events-guide" className="text-primary-foreground/80 hover:text-highlight transition-colors">
                  Educational Talks
                </Link>
              </li>
              <li>
                <Link to="/events-guide" className="text-primary-foreground/80 hover:text-highlight transition-colors">
                  Housing Resources
                </Link>
              </li>
              <li>
                <Link to="/events-guide" className="text-primary-foreground/80 hover:text-highlight transition-colors">
                  Community Services
                </Link>
              </li>
              <li>
                <Link to="/events-guide" className="text-primary-foreground/80 hover:text-highlight transition-colors">
                  Advertise With Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/60 text-sm">
          <p>© {new Date().getFullYear()} Miami Dade Disability News. All rights reserved.</p>
          <p className="mt-2">
            Serving families with autism, disabilities, and special needs in Miami Dade County
          </p>
        </div>
      </div>
    </footer>
  );
};

export default EventsGuideFooter;
