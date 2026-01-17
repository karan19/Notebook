import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // If the request is for the root, we ensure it's handled by Next.js
    if (request.nextUrl.pathname === '/') {
        return NextResponse.next();
    }
}

export const config = {
    matcher: ['/'],
};
