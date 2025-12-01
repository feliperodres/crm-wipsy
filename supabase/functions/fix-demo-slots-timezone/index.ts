import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { toZonedTime, fromZonedTime, format } from 'https://esm.sh/date-fns-tz@3.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all slots in the future (both available and booked)
    const { data: slots, error: slotsError } = await supabaseClient
      .from('demo_time_slots')
      .select('*')
      .gte('start_time', new Date().toISOString());

    if (slotsError) throw slotsError;

    if (!slots || slots.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No slots to fix' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${slots.length} slots to fix`);

    // Fix each slot by assuming the stored UTC time should have been local time
    const fixedSlots = slots.map(slot => {
      const tzName = slot.timezone || 'America/Bogota';
      
      // Current UTC times in database (e.g., "2025-11-06T10:00:00+00:00")
      const currentUtcStart = new Date(slot.start_time);
      const currentUtcEnd = new Date(slot.end_time);
      
      // Extract the time components (treating UTC as if it were local time)
      const year = currentUtcStart.getUTCFullYear();
      const month = String(currentUtcStart.getUTCMonth() + 1).padStart(2, '0');
      const day = String(currentUtcStart.getUTCDate()).padStart(2, '0');
      const hours = String(currentUtcStart.getUTCHours()).padStart(2, '0');
      const minutes = String(currentUtcStart.getUTCMinutes()).padStart(2, '0');
      const seconds = String(currentUtcStart.getUTCSeconds()).padStart(2, '0');
      
      const endYear = currentUtcEnd.getUTCFullYear();
      const endMonth = String(currentUtcEnd.getUTCMonth() + 1).padStart(2, '0');
      const endDay = String(currentUtcEnd.getUTCDate()).padStart(2, '0');
      const endHours = String(currentUtcEnd.getUTCHours()).padStart(2, '0');
      const endMinutes = String(currentUtcEnd.getUTCMinutes()).padStart(2, '0');
      const endSeconds = String(currentUtcEnd.getUTCSeconds()).padStart(2, '0');
      
      // Create strings representing local time in the timezone
      const localStartStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      const localEndStr = `${endYear}-${endMonth}-${endDay} ${endHours}:${endMinutes}:${endSeconds}`;
      
      // Convert from local time in timezone to UTC
      const correctUtcStart = fromZonedTime(localStartStr, tzName);
      const correctUtcEnd = fromZonedTime(localEndStr, tzName);

      console.log(`Fixing slot: ${slot.start_time} -> ${correctUtcStart.toISOString()}`);

      return {
        id: slot.id,
        start_time: correctUtcStart.toISOString(),
        end_time: correctUtcEnd.toISOString(),
        timezone: tzName
      };
    });

    // Update all slots
    let updatedCount = 0;
    for (const slot of fixedSlots) {
      const { error: updateError } = await supabaseClient
        .from('demo_time_slots')
        .update({
          start_time: slot.start_time,
          end_time: slot.end_time
        })
        .eq('id', slot.id);

      if (updateError) {
        console.error(`Error updating slot ${slot.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} slots`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        slots_fixed: updatedCount,
        total_slots: slots.length,
        message: `Se ajustaron ${updatedCount} slots al horario correcto` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error fixing slots:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
