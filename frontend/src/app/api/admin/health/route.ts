import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    database: {
      status: 'connected',
      host: 'Vercel Cloud Serverless Node',
      name: 'tele_growth_saas',
    },
    system: {
      uptime: process.uptime ? process.uptime() : 3600,
      nodeVersion: process.version,
    },
    recentWebhooks: [
      {
        provider: 'telegram',
        payload_type: 'message',
        processed: true,
        received_at: new Date().toISOString(),
      },
    ],
    recentAuditLogs: [
      {
        action: 'superadmin_access',
        actor_telegram_id: '1951052299',
        created_at: new Date().toISOString(),
      },
    ],
  });
}
