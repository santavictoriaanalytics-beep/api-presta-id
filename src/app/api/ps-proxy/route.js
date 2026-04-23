/**
 * Proxy server-side para la API de PrestaShop.
 * Evita errores de CORS: el browser llama a /api/ps-proxy (mismo origen),
 * y este servidor Node.js hace la petición real a europasecreta.cl sin restricciones CORS.
 */
import axios from 'axios';

export async function POST(request) {
  try {
    const body = await request.json();
    const { endpoint, params = {}, apiUrl, apiKey } = body;

    if (!apiUrl || !apiKey || !endpoint) {
      return Response.json(
        { error: 'Faltan parámetros: apiUrl, apiKey, endpoint' },
        { status: 400 }
      );
    }

    const cleanUrl = apiUrl.replace(/\/$/, '');
    const baseUrl = cleanUrl.endsWith('/api') ? cleanUrl : cleanUrl + '/api';

    const response = await axios.get(`${baseUrl}${endpoint}`, {
      params: {
        output_format: 'JSON',
        ws_key: apiKey,
        ...params,
      },
      auth: {
        username: apiKey,
        password: '',
      },
      headers: {
        Accept: 'application/json',
      },
      timeout: 60000, // 60 segundos para scans grandes
    });

    return Response.json(response.data);
  } catch (error) {
    // Retorna el error de PrestaShop tal cual para que el cliente lo maneje
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: error.message };
    return Response.json(data, { status });
  }
}
