/**
 * Обработчик для проверки статуса генерации изображения
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async function handler(req, res) {
  // 1. Принимаем только GET запросы
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.statusCode = 405;
    res.end(`Method ${req.method} Not Allowed`);
    return;
  }

  // 2. Получаем API ключ из переменных окружения
  const USERAPI_KEY = process.env.USERAPI_KEY;
  if (!USERAPI_KEY || USERAPI_KEY === "your_userapi_key_here") {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'USERAPI_KEY is not configured on the server. Please add it to the .env file.' }));
    return;
  }

  try {
    // 3. Получаем hash из URL параметров
    // В ванильном Node.js http сервере (который использует Vite) нужно парсить URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const hash = url.searchParams.get('hash');

    if (!hash) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing required query parameter: hash.' }));
      return;
    }

    // 4. Делаем запрос к userapi.ai
    const apiResponse = await fetch(`https://api.userapi.ai/midjourney/v2/status?hash=${hash}`, {
      method: 'GET',
      headers: {
        'api-key': USERAPI_KEY,
      },
    });

    const responseData = await apiResponse.json();

    // 5. Проверяем статус ответа от userapi.ai и пересылаем клиенту
    res.statusCode = apiResponse.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(responseData));

  } catch (error) {
    console.error('Error in /api/status:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to get generation status.', details: error.message }));
  }
}
