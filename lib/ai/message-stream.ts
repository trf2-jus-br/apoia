// Parses an SSE byte stream carrying UIMessageChunk JSON lines
export function parseSSEToUIMessageChunkStream(
    byteStream: ReadableStream<Uint8Array>
): ReadableStream<any /* UIMessageChunk */> {
    const decoder = new TextDecoder();

    return new ReadableStream({
        start(controller) {
            let buffer = '';

            const reader = byteStream.getReader();

            (async function pump() {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // Split by SSE message boundary (blank line)
                        let idx;
                        while ((idx = buffer.indexOf('\n\n')) !== -1) {
                            const sseEvent = buffer.slice(0, idx);
                            buffer = buffer.slice(idx + 2);

                            // Extract each "data: ..." line and parse JSON
                            for (const line of sseEvent.split('\n')) {
                                const trimmed = line.trim();
                                if (!trimmed.startsWith('data:')) continue;

                                const payload = trimmed.slice(5).trim(); // after "data:"
                                if (payload === '[DONE]') continue;       // end sentinel

                                try {
                                    const chunk = JSON.parse(payload);      // <- UIMessageChunk
                                    controller.enqueue(chunk);
                                } catch (e) {
                                    // ignore malformed lines or surface via controller.error(e)
                                }
                            }
                        }
                    }

                    // Flush any remaining (usually empty)
                    if (buffer.trim()) {
                        // (optional) handle partial line
                    }
                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            })();
        },
    });
}

