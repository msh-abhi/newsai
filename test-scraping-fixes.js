// Test script to validate parsing improvements
const testHtml = `
<div class="event-card">
  <h2>Test Event Title</h2>
  <span class="date">December 15, 2024</span>
  <p class="location">Miami-Dade Library</p>
  <a href="/events/test">Learn More</a>
  <p>Test description content for the event.</p>
</div>

<div class="views-row">
  <h3>Library Program Event</h3>
  <time datetime="2024-12-20">Dec 20, 2024</time>
  <div class="field-name-field-location">Downtown Library</div>
  <a href="/events/library-program">Details</a>
</div>

<article class="event">
  <h2>Government Event</h2>
  <div class="date">Jan 10, 2025</div>
  <span class="location">Miami-Dade Parks</span>
  <p>Community event description</p>
  <a href="/events/gov-event">More Info</a>
</article>
`;

console.log('🧪 Testing HTML parsing improvements...');
console.log('Test HTML length:', testHtml.length);

// Simulate the enhanced patterns
const eventbritePattern = /<div[^>]*class="[^"]*event-card[^"]*[^>]*>([\s\S]*?)<\/div>/gi;
const viewsRowPattern = /<div[^>]*class="[^"]*views-row[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
const govPattern = /<article[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;

function extractText(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1].trim() : "";
}

function cleanText(text) {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Test Eventbrite patterns
let match = eventbritePattern.exec(testHtml);
if (match) {
  const eventHtml = match[1];
  const title = extractText(eventHtml, /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
  const date = extractText(eventHtml, /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i);
  const location = extractText(eventHtml, /<p[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/p>/i);
  
  console.log('✅ Eventbrite Pattern Match:');
  console.log('  Title:', cleanText(title));
  console.log('  Date:', cleanText(date));
  console.log('  Location:', cleanText(location));
}

// Test Library patterns
match = viewsRowPattern.exec(testHtml);
if (match) {
  const eventHtml = match[1];
  const title = extractText(eventHtml, /<h[2-3][^>]*>([^<]+)<\/h[2-3]>/i);
  const date = extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i);
  const location = extractText(eventHtml, /<div[^>]*class="[^"]*field-name-field-location[^"]*"[^>]*>([^<]+)</i);
  
  console.log('✅ Library Pattern Match:');
  console.log('  Title:', cleanText(title));
  console.log('  Date:', cleanText(date));
  console.log('  Location:', cleanText(location));
}

// Test Government patterns
match = govPattern.exec(testHtml);
if (match) {
  const eventHtml = match[1];
  const title = extractText(eventHtml, /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
  const date = extractText(eventHtml, /<div[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/div>/i);
  const location = extractText(eventHtml, /<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i);
  
  console.log('✅ Government Pattern Match:');
  console.log('  Title:', cleanText(title));
  console.log('  Date:', cleanText(date));
  console.log('  Location:', cleanText(location));
}

console.log('\n🎯 If all patterns matched successfully, the fixes should work!');
console.log('📝 Next: Deploy the updated edge function to test with real sites.');