import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../UI/Card';
import { Calendar, Mic, UserPlus, GraduationCap, Home } from 'lucide-react';

const guides = [
  {
    title: "Share Your Event",
    description: "Help grow Miami-Dade's special-needs community calendar",
    icon: Calendar,
    link: "/events-guide",
    color: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600"
  },
  {
    title: "Be a Guest on the Podcast",
    description: "Your story could change how Miami sees unique abilities.",
    icon: UserPlus,
    link: "/events-guide",
    color: "bg-green-50",
    iconBg: "bg-green-100",
    iconColor: "text-green-600"
  },
  {
    title: "Watch the Podcast Everyone's Talking About",
    description: "Real people. Real stories. Building a better Miami for our kids.",
    icon: Mic,
    link: "/events-guide",
    color: "bg-purple-50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600"
  },
  {
    title: "Explore the Housing Guide",
    description: "Your shortcut to Miami's most special-needs-friendly neighborhoods and homes",
    icon: Home,
    link: "/events-guide",
    color: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600"
  },
  {
    title: "Explore Community Resources",
    description: "Miami's top special-needs programs, schools, and support networks.",
    icon: GraduationCap,
    link: "/events-guide",
    color: "bg-pink-50",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600"
  }
];

const GuidesSection = () => {
  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-gray-50">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-6 sm:mb-8 text-gray-900">
          Quick Links
        </h2>

        {/* All cards centered in middle */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 lg:gap-6 max-w-5xl mx-auto">
          {/* First row - 3 cards */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 items-center">
            {guides.slice(0, 3).map((guide, index) => (
              <Link key={index} to={guide.link} className="group block w-full sm:w-auto">
                <Card
                  className="h-full transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 hover:border-blue-500 overflow-hidden relative w-full sm:w-64 lg:w-72"
                  hover={true}
                >
                  <div className={`absolute inset-0 ${guide.color} opacity-20`}>
                    <guide.icon className="absolute bottom-0 right-0 w-20 h-20 sm:w-24 sm:h-24 opacity-30 transform translate-x-4 translate-y-4 sm:translate-x-6 sm:translate-y-6" />
                  </div>
                  <div className="p-3 sm:p-4 relative z-10">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform ${guide.iconBg} border-2 ${guide.iconColor}`}>
                      <guide.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${guide.iconColor}`} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold mb-1 sm:mb-2 text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                      {guide.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{guide.description}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Second row - 2 cards centered */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 items-center">
            {guides.slice(3, 5).map((guide, index) => (
              <Link key={index} to={guide.link} className="group block w-full sm:w-auto">
                <Card
                  className="h-full transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 hover:border-blue-500 overflow-hidden relative w-full sm:w-64 lg:w-72"
                  hover={true}
                >
                  <div className={`absolute inset-0 ${guide.color} opacity-20`}>
                    <guide.icon className="absolute bottom-0 right-0 w-20 h-20 sm:w-24 sm:h-24 opacity-30 transform translate-x-4 translate-y-4 sm:translate-x-6 sm:translate-y-6" />
                  </div>
                  <div className="p-3 sm:p-4 relative z-10">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform ${guide.iconBg} border-2 ${guide.iconColor}`}>
                      <guide.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${guide.iconColor}`} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold mb-1 sm:mb-2 text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                      {guide.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{guide.description}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GuidesSection;
