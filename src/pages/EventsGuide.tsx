import React from 'react';
import EventsGuideHero from '../components/EventsGuide/EventsGuideHero';
import EventsGuideHeader from '../components/EventsGuide/EventsGuideHeader';
import EventsGuideFooter from '../components/EventsGuide/EventsGuideFooter';
import GuidesSection from '../components/EventsGuide/GuidesSection';
import EventCalendar from '../components/EventsGuide/EventCalendar';
import Newsletter from '../components/EventsGuide/Newsletter';
import BusinessCard from '../components/EventsGuide/BusinessCard';

const EventsGuide = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      <EventsGuideHeader />
      <EventsGuideHero />
      <GuidesSection />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-[#FF00AA] font-sans tracking-wide">
          Event Calendar
        </h2>
        <EventCalendar />
      </div>

      <Newsletter />
      <EventsGuideFooter />
      <BusinessCard />
    </div>
  );
};

export default EventsGuide;
