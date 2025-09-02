import { NextResponse } from 'next/server'
import wixSyncManager from '../../../utils/wixSyncManager'

export async function GET (req) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const result = await wixSyncManager.processPending()
  return NextResponse.json(result)
}
