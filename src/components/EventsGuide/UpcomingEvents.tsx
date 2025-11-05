import React from 'react';
import Card from '../UI/Card';
import { Calendar, MapPin, Clock } from 'lucide-react';

const UpcomingEvents = () => {
  // Get upcoming events from the same data source as EventCalendar
  const allEvents = [
    {
      id: 1,
      title: "Autism Support Group Meeting",
      date: "2025-01-15",
      time: "2:00 PM",
      location: "Miami Community Center",
      description: "Monthly support group for families with children on the autism spectrum."
    },
    {
      id: 2,
      title: "Special Needs Resource Fair",
      date: "2025-01-20",
      time: "10:00 AM",
      location: "Downtown Miami Library",
      description: "Connect with local organizations providing services for special needs families."
    },
    {
      id: 3,
      title: "Parent Education Workshop",
      date: "2025-01-25",
      time: "6:00 PM",
      location: "Miami Children's Hospital",
      description: "Learn about the latest therapies and interventions for developmental disabilities."
    },
    {
      id: 4,
      title: "Speech Therapy Session",
      date: "2025-01-10",
      time: "9:00 AM",
      location: "Miami Speech Center",
      description: "Individual speech therapy sessions for children with communication challenges."
    },
    {
      id: 5,
      title: "Family Yoga & Mindfulness",
      date: "2025-01-18",
      time: "4:00 PM",
      location: "Yoga Studio Miami",
      description: "Relaxing yoga session designed for families with special needs children."
    },
    {
      id: 6,
      title: "IEP Meeting Preparation",
      date: "2025-01-22",
      time: "11:00 AM",
      location: "Virtual Meeting",
      description: "Workshop to help parents prepare for Individualized Education Program meetings."
    },
    {
      id: 7,
      title: "Sensory Play Group",
      date: "2025-01-12",
      time: "3:00 PM",
      location: "Sensory Center Miami",
      description: "Fun sensory activities for children with sensory processing differences."
    },
    {
      id: 8,
      title: "Nutrition for Special Needs",
      date: "2025-01-28",
      time: "1:00 PM",
      location: "Miami Nutrition Center",
      description: "Learn about nutritional strategies for children with special dietary needs."
    }
  ];

  // Get next 4 upcoming events
  const upcomingEvents = allEvents
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Upcoming Events</h2>
      <div className="space-y-4">
        {upcomingEvents.map((event) => (
          <Card key={event.id} className="p-4" hover={true}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {event.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
              {event.description}
            </p>
            <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UpcomingEvents;
