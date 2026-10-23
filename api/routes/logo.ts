import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const settingsFile = path.join(process.cwd(), 'public', 'settings.json');

function getSettings(): any {
  try {
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to read settings file', e);
  }
  return { logoUrl: 'https://uqlearn.org/logo/logo.png' };
}

function saveSettings(settings: any) {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to save settings file', e);
  }
}

router.get('/', (req: Request, res: Response) => {
  const settings = getSettings();
  res.json({ success: true, logoUrl: settings.logoUrl || 'https://uqlearn.org/logo/logo.png' });
});

router.post('/', (req: Request, res: Response) => {
  const { logoUrl } = req.body;
  if (!logoUrl) {
    return res.status(400).json({ success: false, message: 'logoUrl is required' });
  }
  const settings = getSettings();
  settings.logoUrl = logoUrl;
  saveSettings(settings);
  res.json({ success: true, message: 'Logo updated successfully', logoUrl });
});

export default router;
