import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    data: [
      {
        _id: 'usr_1951052299',
        telegram_id: '1951052299',
        first_name: 'NX Dev',
        username: 'nxproo',
        role: 'superadmin',
        is_active: true,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        _id: 'usr_8005858260',
        telegram_id: '8005858260',
        first_name: 'Alex Crypto',
        username: 'alex_growth',
        role: 'user',
        is_active: true,
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
      {
        _id: 'usr_9928172635',
        telegram_id: '9928172635',
        first_name: 'Elena Web3',
        username: 'elena_dev',
        role: 'user',
        is_active: true,
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
    ],
    total: 3,
    page: 1,
    pages: 1,
  });
}
