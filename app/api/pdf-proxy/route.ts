import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get('url');

        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }

        // Get authentication headers
        const cookie = request.headers.get('cookie');
        const authorization = request.headers.get('authorization');

        const headers: HeadersInit = {};
        if (cookie) headers['Cookie'] = cookie;
        if (authorization) headers['Authorization'] = authorization;

        // Fetch the document
        const response = await fetch(url, { headers });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch document' }, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        
        // Detect file type by magic bytes
        const uint8Array = new Uint8Array(buffer);

        const isPDF = uint8Array.length >= 4 &&
            uint8Array[0] === 0x25 && // %
            uint8Array[1] === 0x50 && // P
            uint8Array[2] === 0x44 && // D
            uint8Array[3] === 0x46;   // F

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        const isPNG = uint8Array.length >= 8 &&
            uint8Array[0] === 0x89 &&
            uint8Array[1] === 0x50 &&
            uint8Array[2] === 0x4E &&
            uint8Array[3] === 0x47 &&
            uint8Array[4] === 0x0D &&
            uint8Array[5] === 0x0A &&
            uint8Array[6] === 0x1A &&
            uint8Array[7] === 0x0A;

        // JPEG: FF D8 FF
        const isJPEG = uint8Array.length >= 3 &&
            uint8Array[0] === 0xFF &&
            uint8Array[1] === 0xD8 &&
            uint8Array[2] === 0xFF;

        const responseContentType = response.headers.get('content-type') || '';
        let finalContentType = responseContentType;

        // Override incorrect Content-Type when PDF detected
        if (isPDF && !responseContentType.includes('application/pdf')) {
            finalContentType = 'application/pdf';
        } else if (isPNG && !responseContentType.includes('image/png')) {
            finalContentType = 'image/png';
        } else if (isJPEG && !responseContentType.includes('image/jpeg')) {
            finalContentType = 'image/jpeg';
        }

        const isVisible = finalContentType === 'application/octet-stream' ? false : true
        
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': finalContentType,
                'Content-Disposition': 'inline',
                'X-Visible': isVisible ? 'true' : 'false'
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
