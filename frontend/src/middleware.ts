import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
    // If the request is for the root, we ensure it's handled by Next.js
    if (request.nextUrl.pathname === '/') {
        return NextResponse.next();
    }
}

export const config = {
    matcher: ['/'],
};
