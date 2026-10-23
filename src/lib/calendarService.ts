// calendarService.ts
// Service for Google Calendar API interactions

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

/**
 * Inserts a new event into the user's primary calendar.
 * @param event - The calendar event object.
 */
export const insertEvent = async (event: any) => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Authentication failed');

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  const responseData = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${JSON.stringify(responseData)}`);
  }

  return responseData;
};
