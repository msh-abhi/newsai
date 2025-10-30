import { supabase } from '../lib/supabase';

export interface EventSource {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  keywords: string[];
  location: {
    city: string;
    state: string;
    radius: number;
  };
  scraping_config: {
    selector: string;
    title_selector: string;
    date_selector: string;
    location_selector: string;
    link_selector?: string;
  };
  performance_metrics: {
    last_success?: boolean;
    events_found?: number;
    last_error?: string;
    last_attempt?: string;
  };
  is_active: boolean;
  last_scraped_at?: string;
  success_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  date_start: string;
  date_end?: string;
  location?: string;
  url?: string;
  source_name: string;
  source_id: string;
  keywords_matched: string[];
  relevance_score: number;
  embedding?: number[];
  metadata: Record<string, any>;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

class EventService {
  async getEventSources(organizationId: string): Promise<EventSource[]> {
    try {
      const { data, error } = await supabase
        .from('event_sources')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching event sources:', error);
      return [];
    }
  }

  async createEventSource(source: Omit<EventSource, 'id' | 'created_at' | 'updated_at'>): Promise<EventSource> {
    try {
      console.log('💾 eventService: Creating event source:', {
        name: source.name,
        url: source.url,
        organization_id: source.organization_id,
        keywords: source.keywords,
      });

      const { data, error } = await supabase
        .from('event_sources')
        .insert(source)
        .select()
        .single();

      if (error) {
        console.error('❌ eventService: Database error creating source:', error);
        throw error;
      }

      console.log('✅ eventService: Event source created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('Event source creation error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
      });
      throw new Error(error?.message || 'Failed to create event source');
    }
  }

  async updateEventSource(id: string, updates: Partial<EventSource>): Promise<EventSource> {
    try {
      const { data, error } = await supabase
        .from('event_sources')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Event source update error:', error);
      throw new Error(error?.message || 'Failed to update event source');
    }
  }

  async deleteEventSource(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('event_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Event source deletion error:', error);
      throw new Error(error?.message || 'Failed to delete event source');
    }
  }

  async triggerScraping(organizationId: string, sourceIds?: string[]): Promise<{ success: boolean; total_events: number; message: string }> {
    try {
      console.log('🚀 eventService: Triggering event scraping for organization:', organizationId);

      const { data, error } = await supabase.functions.invoke('event-scraper', {
        body: {
          organization_id: organizationId,
          source_ids: sourceIds,
        },
      });

      if (error) throw error;

      console.log('✅ eventService: Scraping completed:', data);
      return data;
    } catch (error) {
      console.error('Event scraping error:', error);
      throw new Error(error?.message || 'Failed to trigger event scraping');
    }
  }

  async testEventSource(organizationId: string, sourceId: string): Promise<{ success: boolean; events: Event[]; message: string }> {
    try {
      console.log('🧪 eventService: Testing event source:', sourceId);

      const { data, error } = await supabase.functions.invoke('event-scraper', {
        body: {
          organization_id: organizationId,
          source_ids: [sourceId],
          test_mode: true,
        },
      });

      if (error) throw error;

      return {
        success: data.success,
        events: data.events || [],
        message: data.message,
      };
    } catch (error) {
      console.error('Event source test error:', error);
      return {
        success: false,
        events: [],
        message: error?.message || 'Failed to test event source',
      };
    }
  }

  async getEvents(organizationId: string, limit: number = 50): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('date_start', new Date().toISOString())
        .order('relevance_score', { ascending: false })
        .order('date_start', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  async searchEvents(organizationId: string, query: string): Promise<Event[]> {
    try {
      // Try vector search first if available
      const { data: vectorResults, error: vectorError } = await supabase.functions.invoke('vector-search-events', {
        body: {
          query,
          organization_id: organizationId,
          limit: 10,
        },
      });

      if (!vectorError && vectorResults?.results) {
        return vectorResults.results;
      }

      // Fallback to text search
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('date_start', new Date().toISOString())
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('relevance_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  }

  async createMiamiEventSources(organizationId: string): Promise<EventSource[]> {
    const miamiSources = [
      {
        name: 'Eventbrite Miami',
        url: 'https://www.eventbrite.com/d/fl--miami/autism/',
        keywords: ['autism', 'sensory', 'sensory-friendly', 'adaptive', 'inclusive', 'disabilities', 'special needs'],
        location: { city: 'Miami', state: 'FL', radius: 25 },
        scraping_config: {
          selector: '[data-testid="event-listing"], .event-card, article',
          title_selector: 'h2, h3, .event-card__title',
          date_selector: '[data-testid="event-date"], time, .event-date',
          location_selector: '[data-testid="event-location"], .event-location',
          link_selector: 'a',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Miami-Dade County Parks',
        url: 'https://www.miamidade.gov/global/recreation/family-fun.page',
        keywords: ['sensory-friendly', 'sensory', 'inclusive', 'autism', 'adaptive', 'special needs', 'disabilities'],
        location: { city: 'Miami-Dade', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event-item, .activity-item, .program, .event',
          title_selector: '.event-title, h3, h2, .title',
          date_selector: '.event-date, .date, .when, time',
          location_selector: '.event-location, .location, .where',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'The Children\'s Trust',
        url: 'https://www.thechildrenstrust.org/',
        keywords: ['autism', 'inclusive', 'special needs', 'developmental', 'sensory', 'sensory-friendly', 'disabilities'],
        location: { city: 'Miami', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event-listing, .program, .activity, .event',
          title_selector: 'h3, h2, .title, .program-title',
          date_selector: '.date, .when, .event-date, time',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Miami-Dade Public Library',
        url: 'https://mdpls.org/events',
        keywords: ['autism', 'sensory', 'sensory-friendly', 'inclusive', 'special needs', 'adaptive', 'disabilities'],
        location: { city: 'Miami-Dade', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event, .program, .calendar-event, .views-row',
          title_selector: '.event-title, h2, h3, .field-content',
          date_selector: '.event-date, .when, .date, time, .date-display-single',
          location_selector: '.event-location, .where, .location, .field-name-field-location',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'City of Miami Events',
        url: 'https://www.miami.gov/Notices/Events-Activities',
        keywords: ['sensory-friendly', 'autism', 'inclusive', 'adaptive', 'special needs', 'disabilities'],
        location: { city: 'Miami', state: 'FL', radius: 20 },
        scraping_config: {
          selector: '.event, .activity, .notice, .event-item',
          title_selector: 'h2, h3, .title, .event-title',
          date_selector: '.date, .when, .event-date, time',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Miami Beach Events',
        url: 'https://events.miamibeachfl.gov/',
        keywords: ['sensory-friendly', 'autism', 'inclusive', 'special needs', 'adaptive', 'disabilities'],
        location: { city: 'Miami Beach', state: 'FL', radius: 15 },
        scraping_config: {
          selector: '.event, .calendar-event, .event-item',
          title_selector: 'h2, h3, .event-title, .title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'City of Coral Gables',
        url: 'https://www.coralgables.com/events-calendar',
        keywords: ['sensory-friendly', 'autism', 'inclusive', 'special needs', 'adaptive', 'disabilities'],
        location: { city: 'Coral Gables', state: 'FL', radius: 15 },
        scraping_config: {
          selector: '.event, .calendar-event, .event-item',
          title_selector: 'h2, h3, .event-title, .title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'UM-CARD (Autism Programs)',
        url: 'https://www.card.miami.edu/',
        keywords: ['autism', 'sensory', 'sensory-friendly', 'developmental', 'special needs', 'disabilities', 'adaptive'],
        location: { city: 'Miami', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event, .program, .training, .workshop',
          title_selector: 'h2, h3, .title, .program-title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Miami on the Cheap',
        url: 'https://miamionthecheap.com/miami-dade-free-cheap-events-calendar/',
        keywords: ['sensory-friendly', 'autism', 'inclusive', 'special needs', 'adaptive', 'disabilities', 'family-friendly'],
        location: { city: 'Miami', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event, .post, article, .event-item',
          title_selector: 'h2, h3, .entry-title, .title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Munchkin Fun Miami',
        url: 'https://www.munchkinfun.com/miami/',
        keywords: ['sensory-friendly', 'autism', 'inclusive', 'special needs', 'adaptive', 'disabilities', 'kids'],
        location: { city: 'Miami', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event, .activity, article, .post',
          title_selector: 'h2, h3, .title, .entry-title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Mommy Poppins Miami',
        url: 'https://mommypoppins.com/miami-south-florida',
        keywords: ['sensory-friendly', 'autism', 'inclusive', 'special needs', 'adaptive', 'disabilities', 'family'],
        location: { city: 'Miami', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event, article, .post, .event-listing',
          title_selector: 'h2, h3, .title, .entry-title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Kids Out and About Miami',
        url: 'https://miami.kidsoutandabout.com/',
        keywords: ['sensory-friendly', 'autism', 'inclusive', 'special needs', 'adaptive', 'disabilities', 'kids', 'family'],
        location: { city: 'Miami', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event, .listing, article, .event-item',
          title_selector: 'h2, h3, .title, .event-title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'All Kids Included (AKI)',
        url: 'https://miamidadearts.org/education-outreach-access/all-kids-included-accessible-arts-experiences-kids-aki',
        keywords: ['accessible', 'inclusive', 'autism', 'sensory-friendly', 'special needs', 'disabilities', 'adaptive', 'arts'],
        location: { city: 'Miami-Dade', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event, .program, .workshop, article',
          title_selector: 'h2, h3, .title, .program-title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Miami Children\'s Museum',
        url: 'https://www.miamichildrensmuseum.org/upcoming-events',
        keywords: ['sensory-friendly', 'sensory', 'autism', 'inclusive', 'special needs', 'disabilities', 'adaptive'],
        location: { city: 'Miami', state: 'FL', radius: 15 },
        scraping_config: {
          selector: '.event, .program-listing, article, .event-item',
          title_selector: 'h2, h3, .event-title, .title',
          date_selector: '.date, .when, .event-date, time',
          location_selector: '.location, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Adrienne Arsht Center',
        url: 'https://www.arshtcenter.org/plan-your-visit/families--kids/',
        keywords: ['sensory-friendly', 'autism', 'inclusive', 'accessible', 'special needs', 'disabilities', 'adaptive', 'family'],
        location: { city: 'Miami', state: 'FL', radius: 20 },
        scraping_config: {
          selector: '.event, .performance, article, .show',
          title_selector: 'h2, h3, .title, .show-title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
      {
        name: 'Parent Academy Miami',
        url: 'https://parentacademymiami.com/',
        keywords: ['autism', 'special needs', 'disabilities', 'inclusive', 'developmental', 'sensory', 'family support'],
        location: { city: 'Miami-Dade', state: 'FL', radius: 30 },
        scraping_config: {
          selector: '.event, .workshop, .class, article',
          title_selector: 'h2, h3, .title, .class-title',
          date_selector: '.date, .when, time, .event-date',
          location_selector: '.location, .where, .venue',
        },
        performance_metrics: {},
        is_active: true,
      },
    ];

    const createdSources: EventSource[] = [];

    for (const sourceData of miamiSources) {
      try {
        const source = await this.createEventSource({
          ...sourceData,
          organization_id: organizationId,
        });
        createdSources.push(source);
      } catch (error) {
        console.error(`Failed to create source ${sourceData.name}:`, error);
      }
    }

    return createdSources;
  }
}

export const eventService = new EventService();