export async function GET(req: Request) {
    try {
        const baseUrl = process.env.TRIBUNAL_4_DATALAKE_API_URL || "https://apoia-eproc.trf2.jus.br/api/v1";

        if (!baseUrl) {
            return Response.json(
                { error: 'TRIBUNAL_4_DATALAKE_API_URL not configured' },
                { status: 500 }
            );
        }

        // Adiciona /test à URL base
        const testUrl = `${baseUrl}/test`;

        // Faz a chamada para a API externa
        const response = await fetch(testUrl);

        // Obtém o conteúdo da resposta
        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // Retorna a resposta com o mesmo status code
        return new Response(
            typeof data === 'string' ? data : JSON.stringify(data),
            {
                status: response.status,
                headers: {
                    'Content-Type': contentType || 'application/json',
                },
            }
        );
    } catch (error) {
        return Response.json(
            { error: 'Failed to connect to apoia-eproc API', details: String(error), message: (error as Error).message, cause: (error as Error).cause },
            { status: 502 }
        );
    }
}
