import React, { useState, useEffect } from 'react';
import Card from '../UI/Card';
import { Calendar, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { eventService } from '../../services/eventService';

const EventCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrganization } = useAuthStore();

  // Fetch events on component mount and when organization changes
  useEffect(() => {
    const fetchEvents = async () => {
      if (!currentOrganization?.id) return;

      try {
        setLoading(true);
        const calendarEvents = await eventService.getEventsForCalendar(currentOrganization.id);
        setEvents(calendarEvents);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        // Fallback to sample data if API fails
        setEvents([
          {
            id: 1,
            title: "Autism Support Group Meeting",
            date_start: "2025-01-15T14:00:00Z",
            location: "Miami Community Center",
            description: "Monthly support group for families with children on the autism spectrum."
          },
          {
            id: 2,
            title: "Special Needs Resource Fair",
            date_start: "2025-01-20T10:00:00Z",
            location: "Downtown Miami Library",
            description: "Connect with local organizations providing services for special needs families."
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentOrganization?.id]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.date_start).toISOString().split('T')[0];
      return eventDate === dateString;
    });
  };

  // Get all dates that have events in current month
  const getEventDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return events
      .filter(event => {
        const eventDate = new Date(event.date_start);
        return eventDate.getFullYear() === year && eventDate.getMonth() === month;
      })
      .map(event => new Date(event.date_start).getDate());
  };

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
    setSelectedDate(null);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const eventDates = getEventDates();

    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);

      const isCurrentMonth = day.getMonth() === month;
      const isToday = day.toDateString() === new Date().toDateString();
      const hasEvents = eventDates.includes(day.getDate()) && isCurrentMonth;
      const isSelected = selectedDate?.toDateString() === day.toDateString();

      days.push({
        date: day,
        isCurrentMonth,
        isToday,
        hasEvents,
        isSelected,
        dayNumber: day.getDate()
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Calendar Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-slate-50 rounded-lg transition-all duration-200 hover:shadow-md"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <h3 className="text-sm font-bold text-slate-800 tracking-wide">
                {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </h3>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-slate-50 rounded-lg transition-all duration-200 hover:shadow-md"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>

            {/* Premium Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {/* Day headers */}
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                <div key={day} className="p-2 text-center font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day.date)}
                  disabled={!day.isCurrentMonth}
                  className={`
                    p-2 text-xs relative min-h-[32px] transition-all duration-200 rounded-lg font-medium
                    ${day.isCurrentMonth
                      ? 'text-slate-800 hover:bg-slate-100 hover:shadow-sm'
                      : 'text-slate-400'
                    }
                    ${day.isToday ? 'bg-blue-100 text-blue-800 font-bold shadow-sm' : ''}
                    ${day.isSelected ? 'bg-blue-200 text-blue-900 shadow-md' : ''}
                    ${day.hasEvents ? 'font-bold text-[#FF00AA] bg-pink-50' : ''}
                  `}
                >
                  <span>{day.dayNumber}</span>
                  {day.hasEvents && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#FF00AA] rounded-full shadow-sm"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events on Selected Date Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100 h-full">
            <h3 className="text-sm font-bold mb-4 text-slate-800 tracking-wide">
              {selectedDate
                ? `Events on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Select a date'
              }
            </h3>

            <div className="space-y-3">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event) => (
                  <div key={event.id} className="bg-gradient-to-r from-[#FF00AA]/10 to-pink-50 p-3 rounded-lg border border-[#FF00AA]/20">
                    <h4 className="font-semibold text-slate-800 text-sm mb-2 leading-tight">
                      {event.title}
                    </h4>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-[#FF00AA]" />
                        <span className="font-medium">{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-[#FF00AA]" />
                        <span className="truncate font-medium">{event.location}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">
                    {selectedDate ? 'No events on this date' : 'Click a date to see events'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Events Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100 h-full">
            <h3 className="text-sm font-bold mb-4 text-[#FF00AA] tracking-wide">
              Upcoming Events
            </h3>

            <div className="space-y-3">
              {events
                .filter((event: any) => new Date(event.date_start) >= new Date())
                .sort((a: any, b: any) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
                .slice(0, 3)
                .map((event: any) => (
                  <div key={event.id} className="bg-gradient-to-r from-slate-50 to-white p-3 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                    <h4 className="font-semibold text-slate-800 text-sm mb-2 leading-tight">
                      {event.title}
                    </h4>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        <span className="font-medium">{new Date(event.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span className="font-medium">{new Date(event.date_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCalendar;
