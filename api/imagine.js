/**
 * Обработчик для запуска генерации изображения в Midjourney
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async function handler(req, res) {
  // 1. Принимаем только POST запросы
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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
    // 3. Считываем и парсим тело запроса
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const { prompt } = JSON.parse(body);

    if (!prompt) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing required parameter: prompt.' }));
      return;
    }

    // 4. Делаем запрос к userapi.ai
    const apiResponse = await fetch('https://api.userapi.ai/midjourney/v2/imagine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': USERAPI_KEY,
      },
      body: JSON.stringify({ prompt }),
    });

    const responseData = await apiResponse.json();

    // 5. Проверяем статус ответа от userapi.ai и пересылаем клиенту
    res.statusCode = apiResponse.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(responseData));

  } catch (error) {
    console.error('Error in /api/imagine:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to start image generation.', details: error.message }));
  }
}
