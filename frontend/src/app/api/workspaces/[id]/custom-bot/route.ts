import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    connected: true,
    bot: {
      bot_username: 'testnxxxbot',
      first_name: 'NX Referral Bot',
      is_active: true,
    },
  });
}
