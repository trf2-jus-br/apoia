/**
 * Validation endpoint for prompt files.
 * 
 * Public endpoint — does not require authentication.
 * Called from pre-commit hooks or CI/CD pipelines to validate prompt files.
 * Does not write to database — purely stateless validation.
 * 
 * POST /api/v1/sync/validate
 * Body: { files: [{ path: string, content: string }] }
 */
import { NextResponse } from 'next/server'
import { validatePromptFiles } from '@/lib/sync/validate'

export async function POST(req: Request) {
    // Parse request body
    let body: any
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ errormsg: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.files || !Array.isArray(body.files)) {
        return NextResponse.json({ errormsg: 'Expected { files: [{ path, content }] }' }, { status: 400 })
    }

    // Validate that each file entry has path and content
    for (const file of body.files) {
        if (typeof file.path !== 'string' || typeof file.content !== 'string') {
            return NextResponse.json({ errormsg: 'Each file must have string path and content' }, { status: 400 })
        }
    }

    // Filter out README files — they are not prompts
    const promptFiles = body.files.filter(
        (f: any) => !/^readme\.md$/i.test(f.path.split('/').pop() || '')
    )

    // Run validation
    const result = validatePromptFiles(promptFiles)

    return NextResponse.json(result, { status: result.valid ? 200 : 422 })
}
