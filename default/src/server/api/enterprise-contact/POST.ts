import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

interface ContactPayload {
  name: string;
  email: string;
  company: string;
  volume: string;
  message?: string;
}

export default async function handler(req: Request, res: Response) {
  const { name, email, company, volume, message } = req.body as ContactPayload;

  if (!name?.trim() || !email?.trim() || !company?.trim() || !volume?.trim()) {
    return res.status(400).json({ error: 'Missing required fields: name, email, company, volume' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const lead = {
    id: `lead_${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    company: company.trim(),
    volume: volume.trim(),
    message: message?.trim() || '',
    submittedAt: new Date().toISOString(),
    source: 'enterprise-contact-form',
  };

  // Persist to /private/leads/ so it survives restarts
  try {
    const leadsDir = '/private/leads';
    await fs.mkdir(leadsDir, { recursive: true });
    const filePath = path.join(leadsDir, `${lead.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(lead, null, 2), 'utf-8');
  } catch (err) {
    console.error('enterprise-contact.write-failed', { error: String(err) });
    // Don't fail the request — log and continue
  }

  console.log('enterprise-contact.lead-received', {
    id: lead.id,
    company: lead.company,
    email: lead.email,
    volume: lead.volume,
  });

  return res.status(201).json({ ok: true, id: lead.id });
}
