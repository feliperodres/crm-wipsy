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

    const { weeks_ahead = 4 } = await req.json();

    // Get availability schedule
    const { data: schedule, error: scheduleError } = await supabaseClient
      .from('availability_schedule')
      .select('*')
      .eq('is_active', true);

    if (scheduleError) throw scheduleError;

    if (!schedule || schedule.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No availability schedule found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Generate slots for the next N weeks
    const slots = [];
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (weeks_ahead * 7));

    // Group schedule by day of week
    const scheduleByDay = schedule.reduce((acc, item) => {
      if (!acc[item.day_of_week]) {
        acc[item.day_of_week] = [];
      }
      acc[item.day_of_week].push(item);
      return acc;
    }, {});

    // Iterate through each day in the timezone
    const tzName = scheduleByDay[Object.keys(scheduleByDay)[0]]?.[0]?.timezone || 'America/Bogota';
    for (let date = new Date(now); date <= endDate; date.setDate(date.getDate() + 1)) {
      // Convert current date to the target timezone to get the correct local date
      const localDate = toZonedTime(date, tzName);
      const dayOfWeek = localDate.getDay();
      const daySchedule = scheduleByDay[dayOfWeek];

      if (!daySchedule) continue;

      // For each time range in the day's schedule
      for (const timeRange of daySchedule) {
        const [startHour, startMin] = timeRange.start_time.split(':').map(Number);
        const [endHour, endMin] = timeRange.end_time.split(':').map(Number);
        
        // Get the local date string in the timezone
        const localDateStr = format(localDate, 'yyyy-MM-dd');
        
        // Create start and end times as local time strings
        const startTimeStr = `${localDateStr} ${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
        const endTimeStr = `${localDateStr} ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
        
        // Convert from local time in timezone to UTC
        let slotStart = fromZonedTime(startTimeStr, tzName);
        const slotEnd = fromZonedTime(endTimeStr, tzName);

        // Generate 30-minute slots
        while (slotStart < slotEnd) {
          const slotEndTime = new Date(slotStart.getTime() + 30 * 60 * 1000);

          if (slotEndTime <= slotEnd && slotStart > now) {
            slots.push({
              start_time: slotStart.toISOString(),
              end_time: slotEndTime.toISOString(),
              timezone: tzName,
              is_available: true
            });
          }

          slotStart = slotEndTime;
        }
      }
    }

    // Check for existing slots and only insert new ones
    if (slots.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('demo_time_slots')
        .upsert(slots, { onConflict: 'start_time' });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        slots_generated: slots.length,
        message: `Generated ${slots.length} time slots` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
