import { NextResponse } from 'next/server';
import services from '../../lib/services.server';

export async function GET() {
  const version = process.env.VITE_VERSION || 'unknown';

  try {
    const latestStatus = await services.status();
    const operational = latestStatus.every((e) => e.ok);

    return NextResponse.json(
      {
        version,
        operational,
        ...(operational ? {} : { statuses: latestStatus })
      },
      { status: operational ? 200 : 500 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        version,
        message: 'Could not retrieve events from database'
      },
      { status: 500 }
    );
  }
}
