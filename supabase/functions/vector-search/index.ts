/*
  # Vector Search Edge Function
  
  Performs similarity search on knowledge base items using dynamic OpenAI API key.
  Fetches OpenAI API key from ai_providers table for security.
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SearchRequest {
  query: string;
  organization_id: string;
  limit?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Vector Search: Function invoked');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { query, organization_id, limit = 5 }: SearchRequest = await req.json();
    
    console.log('📋 Vector Search request:', {
      query: query.substring(0, 50) + '...',
      organization_id,
      limit,
    });

    // Fetch OpenAI API key from ai_providers table
    console.log('🔑 Fetching OpenAI API key from database...');
    const { data: openaiProvider, error: providerError } = await supabase
      .from('ai_providers')
      .select('api_key_encrypted')
      .eq('organization_id', organization_id)
      .eq('type', 'generation')
      .eq('is_active', true)
      .ilike('name', '%openai%')
      .single();

    if (providerError || !openaiProvider) {
      console.error('❌ No active OpenAI provider found for organization:', organization_id);
      throw new Error('No active OpenAI provider configured for this organization');
    }

    // Decrypt the API key
    let openaiApiKey: string;
    try {
      openaiApiKey = atob(openaiProvider.api_key_encrypted);
      console.log('✅ OpenAI API key decrypted successfully');
    } catch (error) {
      console.error('❌ Failed to decrypt OpenAI API key:', error);
      throw new Error('Failed to decrypt OpenAI API key');
    }

    if (!openaiApiKey || openaiApiKey.trim() === '') {
      console.error('❌ Decrypted OpenAI API key is empty');
      throw new Error('OpenAI API key is empty after decryption');
    }

    // Generate embedding for the search query using OpenAI
    console.log('🔄 Generating embedding with OpenAI...');
    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-3-small',
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('❌ OpenAI embedding API error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        errorData,
      });
      throw new Error(`Failed to generate embedding: ${openaiResponse.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const { data } = await openaiResponse.json();
    const embedding = data[0].embedding;
    console.log('✅ Embedding generated successfully');

    // Perform similarity search
    console.log('🔍 Performing similarity search...');
    const { data: results, error } = await supabase.rpc('search_knowledge_items', {
      query_embedding: embedding,
      org_id: organization_id,
      match_limit: limit,
    });

    if (error) {
      console.error('❌ Similarity search error:', error);
      throw error;
    }

    console.log('✅ Vector search completed, results found:', results?.length || 0);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Vector search error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});