import OpenAI from 'openai';
    import { GoogleGenerativeAI } from '@google/generative-ai';

    // В Vite для серверных функций переменные окружения доступны через import.meta.env
    // Но так как мы передаем ключ с клиента, этот код здесь не нужен.
    // Если бы ключи хранились на сервере, мы бы использовали:
    // const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    // const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

    /**
     * Обработчик серверной функции
     * @param {import('http').IncomingMessage} req - Объект запроса
     * @param {import('http').ServerResponse} res - Объект ответа
     */
    export default async function handler(req, res) {
      // 1. Принимаем только POST запросы
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        // В Node.js http server для установки статуса используется res.statusCode
        res.statusCode = 405;
        res.end(`Method ${req.method} Not Allowed`);
        return;
      }

      try {
        // В ванильном Node.js http сервере (который использует Vite dev server)
        // тело запроса нужно считывать из потока.
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }
        
        // 2. Парсим тело запроса
        const { systemPrompt, apiKey, modelName, imageBase64 } = JSON.parse(body);

        // Простая валидация
        if (!systemPrompt || !apiKey || !modelName || !imageBase64) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing required parameters.' }));
          return;
        }

        let generatedText = '';

        // 3. Определяем, к какому API обращаться
        if (modelName.toLowerCase().includes('gpt')) {
          const openai = new OpenAI({ apiKey });
          const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: systemPrompt },
                  {
                    type: "image_url",
                    image_url: {
                      "url": `data:image/jpeg;base64,${imageBase64}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 300,
          });
          generatedText = response.choices[0].message.content;

        } else if (modelName.toLowerCase().includes('gemini')) {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

          const imagePart = {
            inlineData: {
              data: imageBase64,
              mimeType: "image/jpeg",
            },
          };

          const result = await model.generateContent([systemPrompt, imagePart]);
          const response = await result.response;
          generatedText = response.text();

        } else {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Unsupported model: ${modelName}` }));
          return;
        }

        // 4. Отправляем успешный ответ
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ prompt: generatedText }));

      } catch (error) {
        // 5. Обрабатываем ошибки
        console.error('Error calling AI API:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to generate prompt from AI service.', details: error.message }));
      }
    }
