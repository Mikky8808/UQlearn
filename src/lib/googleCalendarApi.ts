// googleCalendarApi.ts
// Helper to interact with Google Calendar API using GSI OAuth tokens.
// NOTE: Client Secret MUST stay server-side. Do NOT include it here.
const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

export const insertEvent = async (accessToken: string, event: CalendarEvent) => {
  const response = await fetch(CALENDAR_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to insert calendar event');
  }

  return response.json();
};
