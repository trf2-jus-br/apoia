export async function GET(req: Request) {
  return new Response(JSON.stringify({ status: 'UP', version: process.env.IMAGE_VERSION || 'Desconhecida' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      // Sem 'Access-Control-Allow-Credentials' → navegador não envia cookies automaticamente.
      // Assim cada requisição cai numa instância aleatória do load balancer. ✅
      'Vary': 'Origin',
      'Cache-Control': 'no-store', // garante que cada teste bate na instância real
    },
  });
}

// Handler de preflight OPTIONS — necessário se algum header custom for enviado no GET
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}