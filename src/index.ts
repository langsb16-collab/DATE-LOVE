import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS 활성화
app.use('/api/*', cors());

// 메모리 저장소 (실제로는 KV나 D1 사용 권장)
const urlStore = new Map<string, string>();

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>JTbit.me - URL 단축 서비스</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen">
      <div class="container mx-auto px-4 py-8">
        <!-- 헤더 -->
        <div class="text-center text-white mb-12">
          <h1 class="text-6xl font-bold mb-4">
            <i class="fas fa-link"></i> JTbit.me
          </h1>
          <p class="text-2xl">빠르고 간편한 URL 단축 서비스</p>
        </div>

        <!-- URL 단축 폼 -->
        <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-2xl p-8 mb-8">
          <h2 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-scissors text-blue-500"></i> URL 단축하기
          </h2>
          
          <div class="mb-4">
            <label class="block text-gray-700 font-semibold mb-2">원본 URL</label>
            <input 
              type="url" 
              id="longUrl" 
              placeholder="https://example.com/very/long/url" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 font-semibold mb-2">단축 코드 (선택사항)</label>
            <input 
              type="text" 
              id="shortCode" 
              placeholder="my-link" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-sm text-gray-500 mt-1">비워두면 자동 생성됩니다</p>
          </div>

          <button 
            onclick="shortenUrl()" 
            class="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            <i class="fas fa-magic"></i> 단축 URL 생성
          </button>

          <!-- 결과 표시 -->
          <div id="result" class="mt-6 hidden">
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 class="text-lg font-bold text-green-800 mb-2">
                <i class="fas fa-check-circle"></i> 생성 완료!
              </h3>
              <div class="flex items-center gap-2">
                <input 
                  type="text" 
                  id="shortUrl" 
                  readonly 
                  class="flex-1 px-3 py-2 bg-white border border-green-300 rounded"
                />
                <button 
                  onclick="copyUrl()" 
                  class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  <i class="fas fa-copy"></i> 복사
                </button>
              </div>
            </div>
          </div>

          <div id="error" class="mt-6 hidden">
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-red-800"><i class="fas fa-exclamation-circle"></i> <span id="errorMsg"></span></p>
            </div>
          </div>
        </div>

        <!-- 통계 카드 -->
        <div class="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-lg shadow p-6 text-center">
            <i class="fas fa-link text-4xl text-blue-500 mb-2"></i>
            <p class="text-3xl font-bold text-gray-800" id="totalUrls">0</p>
            <p class="text-gray-600">단축된 URL</p>
          </div>
          <div class="bg-white rounded-lg shadow p-6 text-center">
            <i class="fas fa-clock text-4xl text-green-500 mb-2"></i>
            <p class="text-3xl font-bold text-gray-800">0.5초</p>
            <p class="text-gray-600">평균 응답속도</p>
          </div>
          <div class="bg-white rounded-lg shadow p-6 text-center">
            <i class="fas fa-globe text-4xl text-purple-500 mb-2"></i>
            <p class="text-3xl font-bold text-gray-800">24/7</p>
            <p class="text-gray-600">서비스 운영</p>
          </div>
        </div>

        <!-- 푸터 -->
        <div class="text-center text-white mt-12">
          <p class="text-sm opacity-75">
            <i class="fas fa-server"></i> Powered by Cloudflare Pages & Hono
          </p>
        </div>
      </div>

      <script>
        // 페이지 로드시 통계 업데이트
        updateStats();

        async function shortenUrl() {
          const longUrl = document.getElementById('longUrl').value;
          const shortCode = document.getElementById('shortCode').value;
          
          if (!longUrl) {
            showError('URL을 입력해주세요');
            return;
          }

          try {
            const response = await fetch('/api/shorten', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: longUrl, code: shortCode })
            });

            const data = await response.json();

            if (response.ok) {
              document.getElementById('shortUrl').value = data.shortUrl;
              document.getElementById('result').classList.remove('hidden');
              document.getElementById('error').classList.add('hidden');
              updateStats();
            } else {
              showError(data.error || '오류가 발생했습니다');
            }
          } catch (err) {
            showError('서버 연결 실패');
          }
        }

        function copyUrl() {
          const shortUrl = document.getElementById('shortUrl');
          shortUrl.select();
          document.execCommand('copy');
          
          const btn = event.target.closest('button');
          const originalHtml = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-check"></i> 복사됨!';
          setTimeout(() => {
            btn.innerHTML = originalHtml;
          }, 2000);
        }

        function showError(message) {
          document.getElementById('errorMsg').textContent = message;
          document.getElementById('error').classList.remove('hidden');
          document.getElementById('result').classList.add('hidden');
        }

        async function updateStats() {
          try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            document.getElementById('totalUrls').textContent = data.total || 0;
          } catch (err) {
            console.error('통계 업데이트 실패:', err);
          }
        }
      </script>
    </body>
    </html>
  `);
});

// URL 단축 API
app.post('/api/shorten', async (c) => {
  try {
    const { url, code } = await c.req.json();
    
    if (!url || !url.startsWith('http')) {
      return c.json({ error: '올바른 URL을 입력해주세요' }, 400);
    }

    // 단축 코드 생성 또는 검증
    let shortCode = code;
    if (!shortCode) {
      shortCode = generateShortCode();
    } else {
      // 코드 유효성 검사
      if (!/^[a-zA-Z0-9-_]+$/.test(shortCode)) {
        return c.json({ error: '코드는 영문, 숫자, -, _만 사용 가능합니다' }, 400);
      }
      if (urlStore.has(shortCode)) {
        return c.json({ error: '이미 사용중인 코드입니다' }, 400);
      }
    }

    // URL 저장
    urlStore.set(shortCode, url);

    const shortUrl = \`https://jtbit.me/\${shortCode}\`;
    
    return c.json({ 
      success: true, 
      shortUrl,
      originalUrl: url 
    });
  } catch (err) {
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// 통계 API
app.get('/api/stats', (c) => {
  return c.json({ 
    total: urlStore.size,
    timestamp: new Date().toISOString()
  });
});

// URL 목록 API
app.get('/api/urls', (c) => {
  const urls = Array.from(urlStore.entries()).map(([code, url]) => ({
    code,
    url,
    shortUrl: \`https://jtbit.me/\${code}\`
  }));
  return c.json({ urls });
});

// 리다이렉션
app.get('/:code', (c) => {
  const code = c.req.param('code');
  const url = urlStore.get(code);
  
  if (url) {
    return c.redirect(url);
  }
  
  return c.html(\`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>404 - Not Found</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-red-600 mb-4">404</h1>
        <p class="text-2xl text-gray-700 mb-4">단축 URL을 찾을 수 없습니다</p>
        <a href="/" class="text-blue-600 hover:underline">홈으로 돌아가기</a>
      </div>
    </body>
    </html>
  \`, 404);
});

// 랜덤 코드 생성 함수
function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // 중복 체크
  if (urlStore.has(code)) {
    return generateShortCode();
  }
  return code;
}

export default app;
