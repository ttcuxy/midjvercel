import React, { useState, useRef } from 'react';
    import { Bot, KeyRound, Upload, Sparkles, Play, Download, Image as ImageIcon, CheckCircle, XCircle, LoaderCircle } from 'lucide-react';

    // Тип для данных в строке таблицы
    type TableRowData = {
      id: number;
      file: File;
      originalImage: string;
      prompt: string;
      results: (string | null)[];
    };

    type Provider = 'OpenAI' | 'Google';


    // Вспомогательная функция для конвертации File в base64
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
      });
    };


    function App() {
      // --- Состояния Компонента ---
      const [apiKey, setApiKey] = useState('');
      const [systemPrompt, setSystemPrompt] = useState("Создай детальный промт для Midjourney на основе этого изображения, который будет содержать описание объекта, окружения, стиля, камеры, и других деталей в конце через --ar 16:9 --v 6.0");
      const [tableData, setTableData] = useState<TableRowData[]>([]);
      const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
      const [isLoadingImages, setIsLoadingImages] = useState(false);
      const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
      const [isCheckingApiKey, setIsCheckingApiKey] = useState(false);

      const [selectedProvider, setSelectedProvider] = useState<Provider>('OpenAI');
      const [selectedModel, setSelectedModel] = useState('');
      const [availableModels, setAvailableModels] = useState<string[]>([]);


      const fileInputRef = useRef<HTMLInputElement>(null);

      // --- Обработчики событий ---

      const checkApiKey = async () => {
        if (!apiKey) {
          alert('Пожалуйста, введите API-ключ для проверки.');
          return;
        }
        setIsCheckingApiKey(true);
        setApiKeyStatus('idle');
        setAvailableModels([]); // Очищаем старый список моделей

        try {
          const response = await fetch('/api/validate-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey,
              provider: selectedProvider,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.details || 'Ошибка сервера при проверке ключа.');
          }

          setApiKeyStatus('valid');
          setAvailableModels(data.models);
          // Устанавливаем первую модель из списка как выбранную по умолчанию
          if (data.models && data.models.length > 0) {
            setSelectedModel(data.models[0]);
          } else {
            setSelectedModel('');
          }

        } catch (error) {
          console.error('Ошибка при проверке API ключа:', error);
          setApiKeyStatus('invalid');
          setAvailableModels([]);
          setSelectedModel('');
        } finally {
          setIsCheckingApiKey(false);
        }
      };


      const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = event.target.value as Provider;
        setSelectedProvider(newProvider);
        // Сбрасываем все, что связано с ключом и моделями
        setApiKeyStatus('idle');
        setAvailableModels([]);
        setSelectedModel('');
      };

      const handleUploadClick = () => {
        fileInputRef.current?.click();
      };

      const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newFilesData = Array.from(files).map((file, index) => ({
          id: Date.now() + index,
          file: file,
          originalImage: URL.createObjectURL(file),
          prompt: '',
          results: [null, null, null, null],
        }));

        setTableData(prevData => [...prevData, ...newFilesData]);

        if (event.target) {
          event.target.value = '';
        }
      };

      const handleGetPrompts = async () => {
        if (!apiKey) {
          alert('Пожалуйста, введите ваш API-ключ.');
          return;
        }
        if (tableData.length === 0) {
          alert('Пожалуйста, загрузите изображения.');
          return;
        }

        setIsLoadingPrompts(true);

        for (const row of tableData) {
          if (row.prompt) continue;

          try {
            const imageBase64 = await fileToBase64(row.file);

            const response = await fetch('/api/generate-prompt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemPrompt,
                apiKey,
                modelName: selectedModel,
                imageBase64,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.details || 'Ошибка при генерации промта.');
            }

            const data = await response.json();
            const newPrompt = data.prompt;

            setTableData(currentData =>
              currentData.map(item =>
                item.id === row.id ? { ...item, prompt: newPrompt } : item
              )
            );

          } catch (error: any) {
            console.error(`Ошибка для файла ${row.file.name}:`, error);
            setTableData(currentData =>
              currentData.map(item =>
                item.id === row.id ? { ...item, prompt: `Ошибка: ${error.message}` } : item
              )
            );
          }
        }

        setIsLoadingPrompts(false);
      };


      return (
        <div className="min-h-screen bg-gray-900 text-gray-300 font-sans p-4 sm:p-6 lg:p-8">
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div className="max-w-7xl mx-auto">
            <header className="mb-8">
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <Sparkles className="w-10 h-10 text-purple-400" />
                Image Prompt Generator
              </h1>
              <p className="text-gray-400 mt-2">Создавайте промты для Midjourney из ваших изображений с помощью AI.</p>
            </header>

            <main>
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">

                  <div className="flex flex-col gap-2">
                    <label className="font-medium text-white flex items-center gap-2"><Bot size={18} />Выберите нейросеть и модель</label>
                    <div className="flex gap-2">
                      <select
                        id="ai-provider"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        value={selectedProvider}
                        onChange={handleProviderChange}
                      >
                        <option value="OpenAI">ChatGPT</option>
                        <option value="Google">Gemini</option>
                      </select>
                      <select
                        id="ai-model"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-gray-600 disabled:cursor-not-allowed"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={availableModels.length === 0}
                      >
                        {availableModels.length > 0 ? (
                          availableModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))
                        ) : (
                          <option value="" disabled>
                            {apiKeyStatus === 'invalid' ? 'Ключ невалиден' : 'Сначала проверьте ключ'}
                          </option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="api-key" className="font-medium text-white flex items-center gap-2"><KeyRound size={18} />Ваш API-ключ</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        id="api-key"
                        placeholder="Введите ваш API ключ..."
                        className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setApiKeyStatus('idle');
                          setAvailableModels([]);
                          setSelectedModel('');
                        }}
                      />
                      <button
                        onClick={checkApiKey}
                        className="bg-gray-600 hover:bg-gray-500 text-white font-semibold px-4 py-2 rounded-md transition-colors w-28 flex justify-center"
                        disabled={isCheckingApiKey}
                      >
                        {isCheckingApiKey ? <LoaderCircle size={18} className="animate-spin" /> : 'Проверить'}
                      </button>
                      <div className="w-6 h-6 flex items-center justify-center">
                        {apiKeyStatus === 'idle' ? null : (
                          isCheckingApiKey ? <LoaderCircle size={20} className="animate-spin text-gray-500" /> : (
                            <>
                              {apiKeyStatus === 'valid' && <CheckCircle className="text-green-500" />}
                              {apiKeyStatus === 'invalid' && <XCircle className="text-red-500" />}
                            </>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 md:col-span-2 lg:col-span-1 lg:justify-self-end">
                    <button
                      onClick={handleUploadClick}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed"
                      disabled={isLoadingPrompts || isLoadingImages}
                    >
                      <Upload size={18} /> Загрузить
                    </button>
                    <button
                      onClick={handleGetPrompts}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors disabled:bg-purple-800 disabled:cursor-not-allowed"
                      disabled={isLoadingPrompts || isLoadingImages || apiKeyStatus !== 'valid' || tableData.length === 0}
                    >
                      {isLoadingPrompts ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}
                      {isLoadingPrompts ? 'Получение...' : 'Получить промты'}
                    </button>
                    <button
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors disabled:bg-green-800 disabled:cursor-not-allowed"
                      disabled={isLoadingPrompts || isLoadingImages || tableData.length === 0}
                    >
                      {isLoadingImages ? <LoaderCircle size={18} className="animate-spin" /> : <Play size={18} />}
                      {isLoadingImages ? 'Генерация...' : 'Запустить'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <label htmlFor="system-prompt" className="block font-medium text-white mb-2">Системный промт:</label>
                <textarea
                  id="system-prompt"
                  rows={6}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Опишите здесь задачу для AI..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                ></textarea>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">Результаты</h2>
                  <button className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-md flex items-center gap-2 transition-colors" disabled={tableData.length === 0}>
                    <Download size={18} /> Скачать все изображения
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="border-b border-gray-600">
                      <tr>
                        <th className="p-4">№</th>
                        <th className="p-4">Ваше изображение</th>
                        <th className="p-4">Промт для Midjourney</th>
                        <th className="p-4 text-center">Результат 1</th>
                        <th className="p-4 text-center">Результат 2</th>
                        <th className="p-4 text-center">Результат 3</th>
                        <th className="p-4 text-center">Результат 4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.length === 0 ? (
                        <tr className="border-b border-gray-700">
                          <td colSpan={7} className="text-center p-8 text-gray-500">
                            Загрузите изображения и сгенерируйте промты, чтобы увидеть здесь результаты.
                          </td>
                        </tr>
                      ) : (
                        tableData.map((row, index) => (
                          <tr key={row.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                            <td className="p-4 align-top">{index + 1}</td>
                            <td className="p-4 align-top">
                              <div className="w-24 h-24 bg-gray-700 rounded-md flex items-center justify-center">
                                <img src={row.originalImage} alt="Original" className="w-full h-full object-cover rounded-md" />
                              </div>
                            </td>
                            <td className="p-4 max-w-sm align-top">
                              <p className="text-gray-300 whitespace-pre-wrap">{row.prompt || 'Нажмите "Получить промты"'}</p>
                            </td>
                            {row.results.map((result, i) => (
                              <td key={i} className="p-4 align-top">
                                <div className="w-24 h-24 bg-gray-700 rounded-md flex items-center justify-center">
                                  {result ? <img src={result} alt={`Result ${i + 1}`} className="w-full h-full object-cover rounded-md" /> : <ImageIcon className="text-gray-500" />}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </main>
          </div>
        </div>
      );
    }

    export default App;
