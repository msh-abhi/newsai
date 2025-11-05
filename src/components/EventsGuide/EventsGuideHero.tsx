import React from 'react';
import logoMain from '../../assets/events-guide/logo-main.png';
import headshot from '../../assets/events-guide/headshot.png';

const EventsGuideHero = () => {
  return (
    <section className="relative w-full bg-gradient-to-br from-white via-gray-50 to-white py-12 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Large Logo with Tagline */}
          <div className="flex justify-center lg:justify-start order-2 lg:order-1">
            <div className="flex flex-col items-center gap-3 max-w-sm sm:max-w-md lg:max-w-lg">
              <img
                src={logoMain}
                alt="Miami Dade Disability News Logo"
                className="w-full max-w-xs sm:max-w-sm lg:max-w-md drop-shadow-2xl"
              />
              <p className="text-blue-600 font-bold text-center text-base sm:text-lg lg:text-xl leading-tight w-full px-4">
                Where Families With Disabilities Find Real Events.<br />
                Real People. And Real Answers
              </p>
            </div>
          </div>

          {/* Right side - Headshot and Text */}
          <div className="flex flex-col justify-center items-center space-y-4 sm:space-y-6 order-1 lg:order-2">
            <div className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 overflow-hidden rounded-full shadow-2xl border-4 border-white">
              <img
                src={headshot}
                alt="Victor Antunez - Autism Advocate"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="text-center px-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight" style={{ fontFamily: 'Brush Script MT, cursive' }}>
                <span className="text-blue-600">Dad.</span>
                <br />
                <span className="text-pink-500">Approved</span>
              </h1>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventsGuideHero;
