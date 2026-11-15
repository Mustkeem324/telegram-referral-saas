import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      _id: 'tix_001',
      subject: 'Custom Bot Setup Assistance',
      message: 'Need help connecting my private channel bot token from BotFather.',
      status: 'resolved',
      priority: 'medium',
      user_telegram_id: '1951052299',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      _id: 'tix_002',
      subject: 'Telegram Stars Verification Delay',
      message: 'Payment was completed via Stars but milestone hold shows 1h remaining.',
      status: 'resolved',
      priority: 'high',
      user_telegram_id: '8005858260',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);
}
