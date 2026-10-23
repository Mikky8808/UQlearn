// Google Calendar integration using Google Identity Services (GSI)
const CLIENT_ID = '1034977422494-fs5ioio4qnf6iok36dc88eaeuvh8fups.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// Dynamically load GSI script
const loadGsiScript = () => {
  return new Promise((resolve, reject) => {
    if (document.getElementById('gsi-script')) return resolve(null);
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  await loadGsiScript();
  
  return new Promise((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response: any) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response.access_token);
        }
      },
    });
    client.requestAccessToken();
  });
};

export const addPomodoroEventToCalendar = async (summary: string, description: string, durationMinutes: number) => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Authentication failed');

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const event = {
    summary,
    description,
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
        { method: 'email', minutes: 15 },
      ],
    },
  };

  console.log('Sending event payload:', JSON.stringify(event, null, 2));

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  const responseData = await response.json();
  console.log('Calendar API Response:', responseData);

  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${JSON.stringify(responseData)}`);
  }

  return responseData;
};
