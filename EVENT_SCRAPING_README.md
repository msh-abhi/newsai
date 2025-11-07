# Event Scraping System - Complete Implementation

## 🎯 **Overview**

This comprehensive event scraping system automatically collects accessible events from 16 Miami-area websites and displays them on a premium calendar interface. The system is designed for families seeking sensory-friendly and inclusive events for children with autism and special needs.

## 🏗️ **System Architecture**

### **Core Components**

1. **Database Layer**
   - `event_sources` table: Stores website configurations and scraping settings
   - `events` table: Stores scraped event data
   - `scraping_filters` table: Simple ON/OFF toggle for filtering
   - `scraping_cache` table: Caches scraping results for performance

2. **Hybrid Scraping Engine**
   - **Intelligent Method Selection**: Automatically chooses best scraping approach
   - **Progressive Fallbacks**: Cache → Basic HTML → Browserless.io API
   - **JavaScript Detection**: Identifies sites requiring full browser rendering
   - **16 pre-configured Miami-area websites** with specialized parsers

3. **Scraping Methods**
   - **Cache Layer**: Fast retrieval of recent successful scrapes (24h TTL)
   - **Basic HTML**: Traditional regex-based parsing for simple sites
   - **Browserless.io**: External headless browser API for JavaScript-heavy sites
   - **Smart Detection**: Analyzes HTML to determine JavaScript requirements

4. **Admin Interface**
   - Simple toggle: "Filter Events: ON/OFF"
   - Performance monitoring dashboard with method success rates
   - Manual scraping triggers with detailed logging

5. **User Interface**
   - Premium calendar with live event data
   - Responsive design with hot pink accents
   - No user-facing filtering controls

## 📋 **Setup Instructions**

### **1. Database Migration**
```bash
# Apply the scraping filters table
supabase db push
```

### **2. Deploy Edge Functions**
```bash
# Deploy the main scraper (ONLY this one - index.ts is the correct file)
supabase functions deploy event-scraper

# Deploy the scheduled scraper
supabase functions deploy scheduled-scraper
```

**Note:** Make sure your `supabase/config.toml` doesn't have `[edge_functions]` section - it was removed to fix deployment issues.

### **3. Configure Cron Jobs (Optional - For Production)**
For production deployment, set up cron jobs through the Supabase dashboard or CLI:

```bash
# Enable cron job for daily scraping at 6 AM EST
supabase cron create scheduled_event_scraper \
  --schedule "0 6 * * *" \
  --function scheduled-scraper \
  --enabled
```

**Note:** Cron configuration removed from `config.toml` as it's not supported there. Use the separate `cron-config.json` file as reference.

### **4. Configure Browserless.io API (Optional but Recommended)**
For sites that require JavaScript rendering (like Eventbrite):

1. Sign up at [Browserless.io](https://browserless.io)
2. Get your API key from the dashboard
3. Add it to your Supabase project environment variables:
   ```bash
   BROWSERLESS_API_KEY=your_actual_api_key_here
   ```
4. Redeploy the Edge Function:
   ```bash
   supabase functions deploy event-scraper
   ```

**Note:** Without a Browserless API key, the scraper will still work for simple websites but may miss events on JavaScript-heavy sites.

### **5. Initialize Miami Sources**
In the admin panel (`/event-sources`):
1. Click "Setup Miami Sources"
2. Toggle "Filter Events: ON" (recommended)
3. Click "Scrape Now" to test

## 🎮 **How It Works**

### **Admin Control (Event Sources Page)**
- **Filter Toggle**: Simple ON/OFF switch in the header
- **When ON**: Only scrapes events containing "inclusive"
- **When OFF**: Scrapes all events from all sources
- **Manual Scraping**: "Scrape Now" button for immediate testing

### **Automated Scheduling**
- **Daily Cron**: Runs at 6 AM EST every day
- **Multi-Organization**: Processes all active organizations
- **Error Handling**: Continues processing even if some sources fail
- **Performance Tracking**: Updates success metrics

### **User Experience (Landing Page)**
- **Clean Calendar**: Shows all scraped events
- **No Filtering**: Users see complete event catalog
- **Premium Design**: Hot pink accents, responsive layout
- **Real-time Data**: Calendar updates with latest scrapes

## 🔧 **Technical Details**

### **Enhanced Scraping Strategy**
```typescript
// Ultra-aggressive multi-pattern extraction
const aggressivePatterns = [
  /<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  /<article[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
  /<li[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  // ... 15+ patterns for comprehensive extraction
];

// Multi-method title extraction
let title = extractText(eventHtml, /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
            extractText(eventHtml, /<strong[^>]*>([^<]+)<\/strong>/i) ||
            extractText(eventHtml, /<b[^>]*>([^<]+)<\/b>/i) ||
            // ... 10+ extraction methods

// Intelligent filtering
if (shouldFilter) {
  const hasInclusive = text.includes('inclusive');
  return hasInclusive;
} else {
  return true; // Accept all events when filtering disabled
}
```

### **Website Coverage**
1. **Eventbrite Miami** - Autism-focused events
2. **Miami-Dade County Parks** - Family programs
3. **The Children's Trust** - Developmental services
4. **Miami-Dade Public Library** - Community events
5. **City of Miami Events** - Municipal programs
6. **Miami Beach Events** - Beach community
7. **City of Coral Gables** - Cultural events
8. **UM-CARD** - Autism research programs
9. **Miami on the Cheap** - Free community events
10. **Munchkin Fun Miami** - Family activities
11. **Mommy Poppins Miami** - Parent resources
12. **Kids Out and About Miami** - Family outings
13. **All Kids Included (AKI)** - Accessible arts
14. **Miami Children's Museum** - Sensory-focused events
15. **Adrienne Arsht Center** - Family performances
16. **Parent Academy Miami** - Support workshops

### **Performance Monitoring**
- **Success Rates**: Per-source reliability tracking
- **Event Counts**: Daily scraping volume
- **Error Logging**: Failed source identification
- **Response Times**: Scraping performance metrics

## 🚀 **Production Deployment**

### **Environment Variables**
Ensure these are set in your Supabase project:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### **Cron Job Setup**
For production deployment, ensure the cron job is enabled:
```bash
supabase cron enable scheduled_event_scraper
```

### **Monitoring**
- Check the monitoring dashboard regularly
- Review scraping logs for failed sources
- Adjust filtering preferences as needed

## 🎨 **UI/UX Features**

### **Admin Interface**
- Clean, professional design
- Intuitive toggle controls
- Real-time status updates
- Performance visualizations

### **User Interface**
- **Hot Pink Theme**: `#FF00AA` accent color
- **Responsive Design**: Mobile-first approach
- **Premium Animations**: Smooth transitions
- **Accessibility**: Screen reader friendly

### **Calendar Features**
- **3-Column Layout**: Calendar | Events | Upcoming
- **Interactive Dates**: Click to view events
- **Event Indicators**: Visual dots on calendar dates
- **Real-time Updates**: Reflects latest scraping data

## 🔧 **Customization**

### **Adding New Sources**
```typescript
{
  name: "New Website",
  url: "https://example.com/events",
  keywords: ["autism", "inclusive", "sensory"],
  location: { city: "Miami", state: "FL", radius: 25 },
  scraping_config: {
    selector: ".event-class",
    title_selector: "h2",
    date_selector: ".date",
    location_selector: ".location"
  }
}
```

### **Modifying Filter Keywords**
Currently set to "inclusive" only. To change:
1. Update the `calculateRelevance` function in `event-scraper/index.ts`
2. Modify the keywords array for new terms

### **Adjusting Schedule**
Change the cron expression in `supabase/config.toml`:
```toml
schedule = "0 6 * * *"  # Daily at 6 AM
schedule = "0 */6 * * *" # Every 6 hours
schedule = "0 9 * * 1"  # Weekly on Mondays at 9 AM
```

## 📊 **Monitoring & Maintenance**

### **Daily Checks**
- Review monitoring dashboard
- Check for failed sources
- Verify event data quality
- Monitor performance metrics

### **Weekly Maintenance**
- Clean up old event data (optional)
- Review and update source configurations
- Optimize scraping selectors if needed

### **Monthly Reviews**
- Analyze scraping success rates
- Identify new event sources to add
- Review user feedback on event quality

## 🎯 **Success Metrics**

- **Scraping Reliability**: >90% success rate
- **Event Quality**: Relevant, accessible events
- **User Engagement**: Calendar usage and event discovery
- **System Performance**: Fast loading, responsive UI

## 🆘 **Troubleshooting**

### **Common Issues**
1. **Sources Failing**: Check website structure changes
2. **No Events Found**: Verify filtering settings
3. **Slow Performance**: Review scraping frequency
4. **Calendar Empty**: Check database connectivity

### **Debugging Steps**
1. Use "Scrape Now" with test mode
2. Check monitoring dashboard logs
3. Review Edge Function logs in Supabase
4. Test individual source URLs manually

## 📈 **Future Enhancements**

- **ML-Powered Filtering**: AI-based event relevance
- **Event Categories**: Tag-based organization
- **User Preferences**: Personalized event recommendations
- **Push Notifications**: New event alerts
- **Social Features**: Event sharing and reviews

---

## ✅ **System Status: PRODUCTION READY**

The event scraping system is now fully implemented with:
- ✅ 16 Miami-area website scrapers
- ✅ Simple admin filtering toggle
- ✅ Automated daily scheduling
- ✅ Premium user interface
- ✅ Performance monitoring
- ✅ Error handling and recovery

**Ready to help Miami families discover accessible events! 🎉**
