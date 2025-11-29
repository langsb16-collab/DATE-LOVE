import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS 활성화
app.use('/api/*', cors());

// 메모리 저장소 (실제로는 D1이나 KV 사용 권장)
const profiles = new Map();
const matches = new Map();
const notices = new Map();
let profileIdCounter = 1;
let matchIdCounter = 1;
let noticeIdCounter = 1;

// 메인 페이지
app.get('/', (c) => {
  return c.html(getMainPageHTML());
});

// 관리자 페이지
app.get('/admin', (c) => {
  return c.html(getAdminPageHTML());
});

// 공지사항 페이지
app.get('/notices', (c) => {
  return c.html(getNoticesPageHTML());
});

// ============ API 엔드포인트 ============

// 관리자 로그인
app.post('/api/admin/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (username === 'admin' && password === 'admin1234') {
      return c.json({ success: true, token: 'YWRtaW46YWRtaW4xMjM0' });
    }
    return c.json({ error: '아이디 또는 비밀번호가 틀립니다' }, 401);
  } catch (err) {
    return c.json({ error: '로그인 실패' }, 500);
  }
});

// 프로필 등록
app.post('/api/register', async (c) => {
  try {
    const data = await c.req.json();
    
    if (!data.name || !data.age || !data.gender || !data.country) {
      return c.json({ error: '필수 정보를 입력해주세요' }, 400);
    }

    const profile = {
      id: profileIdCounter++,
      name: data.name,
      age: parseInt(data.age),
      gender: data.gender,
      country: data.country,
      about: data.about || '',
      interests: data.interests || '',
      createdAt: new Date().toISOString()
    };

    profiles.set(profile.id, profile);
    return c.json({ success: true, profile });
  } catch (err) {
    return c.json({ error: '프로필 등록 실패' }, 500);
  }
});

// 프로필 목록 조회
app.get('/api/profiles', (c) => {
  const gender = c.req.query('gender');
  const country = c.req.query('country');
  
  let result = Array.from(profiles.values());
  
  if (gender) {
    result = result.filter(p => p.gender === gender);
  }
  if (country) {
    result = result.filter(p => p.country === country);
  }
  
  return c.json({ profiles: result });
});

// 프로필 상세 조회
app.get('/api/profiles/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const profile = profiles.get(id);
  
  if (!profile) {
    return c.json({ error: '프로필을 찾을 수 없습니다' }, 404);
  }
  
  return c.json({ profile });
});

// 매칭 요청
app.post('/api/match', async (c) => {
  try {
    const { fromId, toId } = await c.req.json();
    
    const fromProfile = profiles.get(fromId);
    const toProfile = profiles.get(toId);
    
    if (!fromProfile || !toProfile) {
      return c.json({ error: '프로필을 찾을 수 없습니다' }, 404);
    }

    const match = {
      id: matchIdCounter++,
      fromId,
      toId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    matches.set(match.id, match);
    return c.json({ success: true, match });
  } catch (err) {
    return c.json({ error: '매칭 요청 실패' }, 500);
  }
});

// 통계 조회
app.get('/api/stats', (c) => {
  const profileArray = Array.from(profiles.values());
  const matchArray = Array.from(matches.values());
  
  const stats = {
    totalProfiles: profileArray.length,
    totalMatches: matchArray.length,
    byGender: {
      male: profileArray.filter(p => p.gender === '남성').length,
      female: profileArray.filter(p => p.gender === '여성').length
    },
    byAge: {
      '40s': profileArray.filter(p => p.age >= 40 && p.age < 50).length,
      '50s': profileArray.filter(p => p.age >= 50 && p.age < 60).length,
      '60s': profileArray.filter(p => p.age >= 60 && p.age < 70).length
    }
  };
  
  return c.json(stats);
});

// ============ 관리자 API ============

// 회원 관리 - 전체 조회
app.get('/api/admin/members', (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader !== 'Basic YWRtaW46YWRtaW4xMjM0') {
    return c.json({ error: '인증 실패' }, 401);
  }
  
  return c.json({ members: Array.from(profiles.values()) });
});

// 회원 관리 - 수정
app.put('/api/admin/members/:id', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader !== 'Basic YWRtaW46YWRtaW4xMjM0') {
    return c.json({ error: '인증 실패' }, 401);
  }
  
  const id = parseInt(c.req.param('id'));
  const profile = profiles.get(id);
  
  if (!profile) {
    return c.json({ error: '회원을 찾을 수 없습니다' }, 404);
  }
  
  const data = await c.req.json();
  const updated = { ...profile, ...data };
  profiles.set(id, updated);
  
  return c.json({ success: true, member: updated });
});

// 회원 관리 - 삭제
app.delete('/api/admin/members/:id', (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader !== 'Basic YWRtaW46YWRtaW4xMjM0') {
    return c.json({ error: '인증 실패' }, 401);
  }
  
  const id = parseInt(c.req.param('id'));
  
  if (!profiles.has(id)) {
    return c.json({ error: '회원을 찾을 수 없습니다' }, 404);
  }
  
  profiles.delete(id);
  return c.json({ success: true });
});

// 매칭 관리 - 전체 조회
app.get('/api/admin/matches', (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader !== 'Basic YWRtaW46YWRtaW4xMjM0') {
    return c.json({ error: '인증 실패' }, 401);
  }
  
  const matchArray = Array.from(matches.values()).map(match => {
    const fromProfile = profiles.get(match.fromId);
    const toProfile = profiles.get(match.toId);
    return {
      ...match,
      fromName: fromProfile?.name || '알 수 없음',
      toName: toProfile?.name || '알 수 없음'
    };
  });
  
  return c.json({ matches: matchArray });
});

// 공지사항 관리 - 전체 조회
app.get('/api/notices', (c) => {
  return c.json({ notices: Array.from(notices.values()).reverse() });
});

// 공지사항 관리 - 생성
app.post('/api/admin/notices', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader !== 'Basic YWRtaW46YWRtaW4xMjM0') {
    return c.json({ error: '인증 실패' }, 401);
  }
  
  const { title, content, important } = await c.req.json();
  
  const notice = {
    id: noticeIdCounter++,
    title,
    content,
    important: important || false,
    createdAt: new Date().toISOString()
  };
  
  notices.set(notice.id, notice);
  return c.json({ success: true, notice });
});

// 공지사항 관리 - 수정
app.put('/api/admin/notices/:id', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader !== 'Basic YWRtaW46YWRtaW4xMjM0') {
    return c.json({ error: '인증 실패' }, 401);
  }
  
  const id = parseInt(c.req.param('id'));
  const notice = notices.get(id);
  
  if (!notice) {
    return c.json({ error: '공지사항을 찾을 수 없습니다' }, 404);
  }
  
  const data = await c.req.json();
  const updated = { ...notice, ...data };
  notices.set(id, updated);
  
  return c.json({ success: true, notice: updated });
});

// 공지사항 관리 - 삭제
app.delete('/api/admin/notices/:id', (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader !== 'Basic YWRtaW46YWRtaW4xMjM0') {
    return c.json({ error: '인증 실패' }, 401);
  }
  
  const id = parseInt(c.req.param('id'));
  
  if (!notices.has(id)) {
    return c.json({ error: '공지사항을 찾을 수 없습니다' }, 404);
  }
  
  notices.delete(id);
  return c.json({ success: true });
});

// ============ HTML 페이지 함수들 ============

function getMainPageHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Couple Gate - 국경을 넘어 사랑을 연결하는 국제 연애·결혼 매칭 플랫폼</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-pink-300 via-red-300 to-purple-400 min-h-screen">
  <div class="container mx-auto px-4 py-4 md:py-8">
    <!-- 헤더 -->
    <div class="text-center text-white mb-6 md:mb-12">
      <div class="flex justify-end items-center mb-4">
        <select id="language-selector" class="bg-white text-black px-3 py-2 rounded-lg shadow-lg border-2 border-pink-500 hover:bg-pink-50 font-bold cursor-pointer">
          <option value="ko">한국어</option>
          <option value="en">English</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
          <option value="vi">Tiếng Việt</option>
          <option value="ar">العربية</option>
        </select>
        <a href="/notices" class="ml-4 bg-white text-pink-600 px-4 py-2 rounded-lg shadow-lg hover:bg-pink-50 font-bold">
          <i class="fas fa-bell"></i> <span class="hidden md:inline">공지사항</span>
        </a>
      </div>
      
      <h1 class="text-3xl md:text-5xl font-bold mb-2 md:mb-4" id="main-title">
        <i class="fas fa-heart text-2xl md:text-4xl"></i> Couple Gate
      </h1>
      <p class="text-lg md:text-2xl mb-2" id="main-subtitle">국경을 넘어 사랑을 연결하는 국제 연애·결혼 매칭 플랫폼</p>
      <p class="text-base md:text-xl font-bold text-gray-900" id="target-audience">40대·50대·60대 싱글·돌싱 글로벌 국제 연애·결혼</p>
    </div>

    <!-- 탭 메뉴 -->
    <div class="max-w-4xl mx-auto mb-6">
      <div class="flex flex-wrap gap-2 justify-center">
        <button onclick="showTab('register')" class="tab-btn active px-4 md:px-6 py-2 md:py-3 bg-white text-pink-600 rounded-lg font-bold shadow-lg hover:bg-pink-50" id="tab-register">
          <i class="fas fa-user-plus"></i> <span class="hidden sm:inline">프로필 등록</span>
        </button>
        <button onclick="showTab('search')" class="tab-btn px-4 md:px-6 py-2 md:py-3 bg-pink-100 text-gray-700 rounded-lg font-bold shadow hover:bg-pink-200" id="tab-search">
          <i class="fas fa-search"></i> <span class="hidden sm:inline">프로필 찾기</span>
        </button>
        <button onclick="showTab('stats')" class="tab-btn px-4 md:px-6 py-2 md:py-3 bg-pink-100 text-gray-700 rounded-lg font-bold shadow hover:bg-pink-200" id="tab-stats">
          <i class="fas fa-chart-bar"></i> <span class="hidden sm:inline">통계</span>
        </button>
      </div>
    </div>

    <!-- 프로필 등록 탭 -->
    <div id="register-tab" class="tab-content max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8">
      <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6" id="register-title">
        <i class="fas fa-user-plus text-pink-500"></i> 프로필 등록
      </h2>
      
      <form id="registerForm" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-700 font-semibold mb-2" id="label-name">이름</label>
            <input type="text" id="name" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2" id="label-age">나이 (40-70세)</label>
            <input type="number" id="age" min="40" max="70" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-700 font-semibold mb-2" id="label-gender">성별</label>
            <select id="gender" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="">선택하세요</option>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2" id="label-country">국가</label>
            <select id="country" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="">선택하세요</option>
              <option value="한국">한국</option>
              <option value="미국">미국</option>
              <option value="캐나다">캐나다</option>
              <option value="일본">일본</option>
              <option value="중국">중국</option>
              <option value="베트남">베트남</option>
              <option value="태국">태국</option>
              <option value="필리핀">필리핀</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2" id="label-about">자기소개</label>
          <textarea id="about" rows="3" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"></textarea>
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2" id="label-interests">관심사</label>
          <input type="text" id="interests" placeholder="예: 요리, 여행, 독서" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
        </div>

        <!-- 신분증 사진 업로드 -->
        <div class="border-2 border-dashed border-pink-300 rounded-lg p-6 bg-pink-50">
          <label class="block text-gray-700 font-bold mb-3" id="label-id-photo">
            <i class="fas fa-id-card text-pink-600"></i> 신분증 인증 사진 업로드
          </label>
          
          <!-- 예시 사진 표시 -->
          <div class="mb-4 flex flex-col md:flex-row gap-4 items-center">
            <div class="w-full md:w-1/3">
              <img src="https://www.genspark.ai/api/files/s/gQ21EItf" alt="신분증 예시" class="w-full rounded-lg shadow-md">
            </div>
            <div class="w-full md:w-2/3 text-sm text-gray-700" id="id-photo-instruction">
              <p class="font-semibold text-pink-600 mb-2">📸 이렇게 촬영해주세요:</p>
              <ul class="list-disc list-inside space-y-1">
                <li>여권, 운전면허증, 주민등록증 중 하나를 손에 들고</li>
                <li>본인 얼굴과 신분증이 함께 나오도록 촬영</li>
                <li>신분증의 사진과 정보가 선명하게 보여야 합니다</li>
                <li>조명이 밝은 곳에서 촬영해주세요</li>
              </ul>
            </div>
          </div>

          <input type="file" id="idPhoto" accept="image/*" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white">
          <div id="photoPreview" class="mt-3 hidden">
            <img id="previewImage" class="w-full max-w-md mx-auto rounded-lg shadow-md">
          </div>
        </div>

        <!-- 안전정책 안내 -->
        <div class="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-6 rounded-lg shadow-md">
          <h3 class="font-bold text-lg text-red-700 mb-3 flex items-center" id="safety-policy-title">
            <i class="fas fa-shield-alt mr-2"></i> 로맨스스캠 및 보이스피싱 예방을 위한 안전정책 안내
          </h3>
          <p class="text-sm text-gray-700 mb-3" id="safety-cooperation">
            안전한 서비스 이용을 위해 협조 부탁드립니다.<br>
            회원가입 시 아래 사항을 반드시 제출해야 가입이 가능합니다.
          </p>
          
          <div class="bg-white p-4 rounded-lg mb-3 border-l-4 border-yellow-500">
            <h4 class="font-bold text-yellow-700 mb-2" id="vip-requirements">
              <i class="fas fa-crown mr-1"></i> VIP 회원가입 시 필수 제출 사항
            </h4>
            <p class="text-sm text-gray-700" id="vip-description">
              여권, 운전면허증, 주민등록증 등 본인 신분증을 손에 들고 얼굴과 함께 촬영한 사진을 업로드해야 합니다.<br>
              본인 확인을 위한 절차이며, 제출 정보는 안전하게 보호됩니다.
            </p>
          </div>

          <div class="bg-white p-4 rounded-lg border-l-4 border-blue-500">
            <h4 class="font-bold text-blue-700 mb-2" id="regular-requirements">
              <i class="fas fa-users mr-1"></i> 일반 회원가입 필수 사항
            </h4>
            <p class="text-sm text-gray-700" id="regular-description">
              기존에 사용 중인 SNS 계정(예: 소셜 네트워크) 3개 이상을 등록해야 회원가입이 가능합니다.
            </p>
          </div>

          <p class="text-xs text-gray-600 mt-3 italic" id="safety-note">
            <i class="fas fa-exclamation-circle text-red-500"></i> 
            귀찮으시더라도, 사기 방지 및 안전한 커뮤니티 운영을 위한 필수 절차이므로 협조 부탁드립니다.
          </p>
        </div>

        <button type="submit" class="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700 transition" id="btn-register">
          <i class="fas fa-paper-plane"></i> 등록하기
        </button>
      </form>

      <div id="registerResult" class="mt-4 hidden"></div>
    </div>

    <!-- 프로필 찾기 탭 -->
    <div id="search-tab" class="tab-content hidden max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8">
      <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6" id="search-title">
        <i class="fas fa-search text-pink-500"></i> 프로필 찾기
      </h2>
      
      <div class="flex flex-wrap gap-4 mb-6">
        <select id="filterGender" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
          <option value="">모든 성별</option>
          <option value="남성">남성</option>
          <option value="여성">여성</option>
        </select>
        <select id="filterCountry" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
          <option value="">모든 국가</option>
          <option value="한국">한국</option>
          <option value="미국">미국</option>
          <option value="캐나다">캐나다</option>
          <option value="일본">일본</option>
          <option value="중국">중국</option>
          <option value="베트남">베트남</option>
        </select>
        <button onclick="searchProfiles()" class="px-6 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700" id="btn-search">
          <i class="fas fa-search"></i> 검색
        </button>
      </div>

      <div id="profileResults" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>

    <!-- 통계 탭 -->
    <div id="stats-tab" class="tab-content hidden max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8">
      <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6" id="stats-title">
        <i class="fas fa-chart-bar text-pink-500"></i> 통계
      </h2>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="statsContainer">
        <!-- 통계 카드들이 여기 표시됩니다 -->
      </div>
    </div>
  </div>

  <script>
    // 다국어 지원
    const translations = {
      ko: {
        'main-title': 'Couple Gate',
        'main-subtitle': '국경을 넘어 사랑을 연결하는 국제 연애·결혼 매칭 플랫폼',
        'target-audience': '40대·50대·60대 싱글·돌싱 글로벌 국제 연애·결혼',
        'tab-register': '프로필 등록',
        'tab-search': '프로필 찾기',
        'tab-stats': '통계',
        'register-title': '프로필 등록',
        'label-name': '이름',
        'label-age': '나이 (40-70세)',
        'label-gender': '성별',
        'label-country': '국가',
        'label-about': '자기소개',
        'label-interests': '관심사',
        'label-id-photo': '신분증 인증 사진 업로드',
        'id-photo-instruction': '<p class="font-semibold text-pink-600 mb-2">📸 이렇게 촬영해주세요:</p><ul class="list-disc list-inside space-y-1"><li>여권, 운전면허증, 주민등록증 중 하나를 손에 들고</li><li>본인 얼굴과 신분증이 함께 나오도록 촬영</li><li>신분증의 사진과 정보가 선명하게 보여야 합니다</li><li>조명이 밝은 곳에서 촬영해주세요</li></ul>',
        'safety-policy-title': '로맨스스캠 및 보이스피싱 예방을 위한 안전정책 안내',
        'safety-cooperation': '안전한 서비스 이용을 위해 협조 부탁드립니다.<br>회원가입 시 아래 사항을 반드시 제출해야 가입이 가능합니다.',
        'vip-requirements': 'VIP 회원가입 시 필수 제출 사항',
        'vip-description': '여권, 운전면허증, 주민등록증 등 본인 신분증을 손에 들고 얼굴과 함께 촬영한 사진을 업로드해야 합니다.<br>본인 확인을 위한 절차이며, 제출 정보는 안전하게 보호됩니다.',
        'regular-requirements': '일반 회원가입 필수 사항',
        'regular-description': '기존에 사용 중인 SNS 계정(예: 소셜 네트워크) 3개 이상을 등록해야 회원가입이 가능합니다.',
        'safety-note': '귀찮으시더라도, 사기 방지 및 안전한 커뮤니티 운영을 위한 필수 절차이므로 협조 부탁드립니다.',
        'btn-register': '등록하기',
        'search-title': '프로필 찾기',
        'btn-search': '검색',
        'stats-title': '통계'
      },
      en: {
        'main-title': 'Couple Gate',
        'main-subtitle': 'International Dating & Marriage Platform Connecting Love Across Borders',
        'target-audience': 'Singles & Divorcees in 40s, 50s, 60s for Global Romance & Marriage',
        'tab-register': 'Register',
        'tab-search': 'Search',
        'tab-stats': 'Statistics',
        'register-title': 'Profile Registration',
        'label-name': 'Name',
        'label-age': 'Age (40-70)',
        'label-gender': 'Gender',
        'label-country': 'Country',
        'label-about': 'About Me',
        'label-interests': 'Interests',
        'label-id-photo': 'ID Verification Photo Upload',
        'id-photo-instruction': '<p class="font-semibold text-pink-600 mb-2">📸 Please take photo like this:</p><ul class="list-disc list-inside space-y-1"><li>Hold your ID (passport, driver\'s license, or national ID)</li><li>Take a selfie with your face and ID visible</li><li>Make sure photo and information on ID are clear</li><li>Take photo in a well-lit place</li></ul>',
        'safety-policy-title': 'Safety Policy Notice to Prevent Romance Scams & Voice Phishing',
        'safety-cooperation': 'Thank you for your cooperation for safe service use.<br>The following items must be submitted during registration.',
        'vip-requirements': 'VIP Membership Required Documents',
        'vip-description': 'Upload a photo holding your ID (passport, driver\'s license, national ID) with your face visible.<br>This is for identity verification and submitted information is securely protected.',
        'regular-requirements': 'Regular Membership Requirements',
        'regular-description': 'Registration requires linking 3 or more existing SNS accounts (e.g., social networks).',
        'safety-note': 'Although inconvenient, this is a mandatory procedure to prevent fraud and ensure safe community operation. Thank you for your cooperation.',
        'btn-register': 'Register',
        'search-title': 'Find Profiles',
        'btn-search': 'Search',
        'stats-title': 'Statistics'
      },
      zh: {
        'main-title': 'Couple Gate',
        'main-subtitle': '跨越国境连接爱情的国际恋爱·婚姻配对平台',
        'target-audience': '40岁·50岁·60岁单身·离异全球国际恋爱·婚姻',
        'tab-register': '注册资料',
        'tab-search': '查找资料',
        'tab-stats': '统计',
        'register-title': '资料注册',
        'label-name': '姓名',
        'label-age': '年龄 (40-70岁)',
        'label-gender': '性别',
        'label-country': '国家',
        'label-about': '自我介绍',
        'label-interests': '兴趣',
        'label-id-photo': '身份证认证照片上传',
        'id-photo-instruction': '<p class="font-semibold text-pink-600 mb-2">📸 请这样拍照：</p><ul class="list-disc list-inside space-y-1"><li>手持护照、驾驶执照或身份证之一</li><li>拍摄本人面部和身份证件一起的照片</li><li>身份证件的照片和信息必须清晰可见</li><li>请在光线充足的地方拍照</li></ul>',
        'safety-policy-title': '防止浪漫诈骗和语音钓鱼的安全政策通知',
        'safety-cooperation': '为了安全使用服务，请予以配合。<br>注册会员时必须提交以下内容。',
        'vip-requirements': 'VIP会员注册必须提交的内容',
        'vip-description': '必须上传手持本人身份证件（护照、驾驶执照、身份证等）与面部一起拍摄的照片。<br>这是用于本人确认的程序，提交的信息将得到安全保护。',
        'regular-requirements': '一般会员注册必须事项',
        'regular-description': '必须注册现有使用的3个以上SNS账户（例如：社交网络）才能注册会员。',
        'safety-note': '虽然麻烦，但这是防止诈骗和安全运营社区的必需程序，请予以配合。',
        'btn-register': '注册',
        'search-title': '查找资料',
        'btn-search': '搜索',
        'stats-title': '统计'
      },
      ja: {
        'main-title': 'Couple Gate',
        'main-subtitle': '国境を越えて愛を繋ぐ国際恋愛·結婚マッチングプラットフォーム',
        'target-audience': '40代·50代·60代シングル·バツイチのグローバル国際恋愛·結婚',
        'tab-register': 'プロフィール登録',
        'tab-search': 'プロフィール検索',
        'tab-stats': '統計',
        'register-title': 'プロフィール登録',
        'label-name': '名前',
        'label-age': '年齢 (40-70歳)',
        'label-gender': '性別',
        'label-country': '国',
        'label-about': '自己紹介',
        'label-interests': '趣味',
        'label-id-photo': '身分証明書認証写真アップロード',
        'id-photo-instruction': '<p class="font-semibold text-pink-600 mb-2">📸 このように撮影してください：</p><ul class="list-disc list-inside space-y-1"><li>パスポート、運転免許証、身分証明書のいずれかを手に持って</li><li>本人の顔と身分証明書が一緒に映るように撮影</li><li>身分証明書の写真と情報が鮮明に見える必要があります</li><li>明るい場所で撮影してください</li></ul>',
        'safety-policy-title': 'ロマンス詐欺とボイスフィッシング防止のための安全ポリシー案内',
        'safety-cooperation': '安全なサービスご利用のためご協力をお願いいたします。<br>会員登録時は以下の事項を必ず提出する必要があります。',
        'vip-requirements': 'VIP会員登録時の必須提出事項',
        'vip-description': 'パスポート、運転免許証、身分証明書などの本人確認書類を手に持ち、顔と一緒に撮影した写真をアップロードする必要があります。<br>本人確認のための手続きであり、提出された情報は安全に保護されます。',
        'regular-requirements': '一般会員登録必須事項',
        'regular-description': '既存に使用中のSNSアカウント（例：ソーシャルネットワーク）を3個以上登録する必要があります。',
        'safety-note': 'お手数ですが、詐欺防止と安全なコミュニティ運営のための必須手続きですので、ご協力をお願いいたします。',
        'btn-register': '登録',
        'search-title': 'プロフィール検索',
        'btn-search': '検索',
        'stats-title': '統計'
      },
      vi: {
        'main-title': 'Couple Gate',
        'main-subtitle': 'Nền tảng hẹn hò & kết hôn quốc tế kết nối tình yêu vượt biên giới',
        'target-audience': 'Độc thân & ly hôn ở độ tuổi 40, 50, 60 cho tình yêu & hôn nhân toàn cầu',
        'tab-register': 'Đăng ký',
        'tab-search': 'Tìm kiếm',
        'tab-stats': 'Thống kê',
        'register-title': 'Đăng ký hồ sơ',
        'label-name': 'Tên',
        'label-age': 'Tuổi (40-70)',
        'label-gender': 'Giới tính',
        'label-country': 'Quốc gia',
        'label-about': 'Giới thiệu bản thân',
        'label-interests': 'Sở thích',
        'label-id-photo': 'Tải lên ảnh xác minh giấy tờ',
        'id-photo-instruction': '<p class="font-semibold text-pink-600 mb-2">📸 Vui lòng chụp ảnh như thế này:</p><ul class="list-disc list-inside space-y-1"><li>Cầm hộ chiếu, giấy phép lái xe hoặc chứng minh thư nhân dân trên tay</li><li>Chụp ảnh sao cho khuôn mặt và giấy tờ cùng hiện rõ</li><li>Ảnh và thông tin trên giấy tờ phải rõ ràng</li><li>Chụp ảnh ở nơi có ánh sáng tốt</li></ul>',
        'safety-policy-title': 'Thông báo chính sách an toàn để ngăn chặn lừa đảo lãng mạn và lừa đảo giọng nói',
        'safety-cooperation': 'Cảm ơn sự hợp tác của bạn để sử dụng dịch vụ an toàn.<br>Các mục sau phải được nộp khi đăng ký.',
        'vip-requirements': 'Tài liệu bắt buộc cho thành viên VIP',
        'vip-description': 'Tải lên ảnh cầm giấy tờ của bạn (hộ chiếu, giấy phép lái xe, chứng minh thư) với khuôn mặt của bạn hiện rõ.<br>Đây là để xác minh danh tính và thông tin nộp sẽ được bảo vệ an toàn.',
        'regular-requirements': 'Yêu cầu thành viên thông thường',
        'regular-description': 'Đăng ký yêu cầu liên kết 3 hoặc nhiều tài khoản SNS hiện có (ví dụ: mạng xã hội).',
        'safety-note': 'Mặc dù bất tiện, đây là thủ tục bắt buộc để ngăn chặn gian lận và đảm bảo hoạt động cộng đồng an toàn. Cảm ơn sự hợp tác của bạn.',
        'btn-register': 'Đăng ký',
        'search-title': 'Tìm hồ sơ',
        'btn-search': 'Tìm kiếm',
        'stats-title': 'Thống kê'
      },
      ar: {
        'main-title': 'Couple Gate',
        'main-subtitle': 'منصة المواعدة والزواج الدولية التي تربط الحب عبر الحدود',
        'target-audience': 'العزاب والمطلقون في الأربعينيات والخمسينيات والستينيات للرومانسية والزواج العالمي',
        'tab-register': 'تسجيل',
        'tab-search': 'بحث',
        'tab-stats': 'إحصائيات',
        'register-title': 'تسجيل الملف الشخصي',
        'label-name': 'الاسم',
        'label-age': 'العمر (40-70)',
        'label-gender': 'الجنس',
        'label-country': 'الدولة',
        'label-about': 'عن نفسي',
        'label-interests': 'الاهتمامات',
        'label-id-photo': 'تحميل صورة التحقق من الهوية',
        'id-photo-instruction': '<p class="font-semibold text-pink-600 mb-2">📸 يرجى التقاط الصورة هكذا:</p><ul class="list-disc list-inside space-y-1"><li>احمل جواز سفرك أو رخصة القيادة أو بطاقة الهوية</li><li>التقط صورة شخصية مع وجهك وبطاقة الهوية مرئية</li><li>تأكد من أن الصورة والمعلومات على بطاقة الهوية واضحة</li><li>التقط الصورة في مكان جيد الإضاءة</li></ul>',
        'safety-policy-title': 'إشعار سياسة السلامة لمنع عمليات الاحتيال الرومانسية والاحتيال الصوتي',
        'safety-cooperation': 'شكراً لتعاونكم لاستخدام الخدمة بشكل آمن.<br>يجب تقديم العناصر التالية أثناء التسجيل.',
        'vip-requirements': 'المستندات المطلوبة لعضوية VIP',
        'vip-description': 'قم بتحميل صورة وأنت تحمل بطاقة هويتك (جواز سفر، رخصة قيادة، بطاقة هوية وطنية) مع وجهك مرئي.<br>هذا للتحقق من الهوية والمعلومات المقدمة محمية بشكل آمن.',
        'regular-requirements': 'متطلبات العضوية العادية',
        'regular-description': 'يتطلب التسجيل ربط 3 حسابات SNS موجودة أو أكثر (مثل شبكات التواصل الاجتماعي).',
        'safety-note': 'على الرغم من عدم الراحة، هذا إجراء إلزامي لمنع الاحتيال وضمان تشغيل مجتمع آمن. شكراً لتعاونكم.',
        'btn-register': 'تسجيل',
        'search-title': 'البحث عن ملفات',
        'btn-search': 'بحث',
        'stats-title': 'إحصائيات'
      }
    };

    document.getElementById('language-selector').addEventListener('change', function() {
      const lang = this.value;
      const trans = translations[lang];
      
      if (lang === 'ar') {
        document.body.setAttribute('dir', 'rtl');
      } else {
        document.body.setAttribute('dir', 'ltr');
      }
      
      // HTML 내용이 포함된 요소들
      const htmlElements = ['id-photo-instruction', 'safety-cooperation', 'vip-description', 'regular-description'];
      
      for (const [id, text] of Object.entries(trans)) {
        const elem = document.getElementById(id);
        if (elem) {
          if (elem.tagName === 'BUTTON') {
            const icon = elem.querySelector('i');
            if (icon) {
              elem.innerHTML = icon.outerHTML + ' <span class="hidden sm:inline">' + text + '</span>';
            } else {
              elem.innerHTML = text;
            }
          } else if (htmlElements.includes(id)) {
            // HTML 내용이 포함된 요소는 innerHTML 사용
            elem.innerHTML = text;
          } else {
            const icon = elem.querySelector('i');
            if (icon) {
              elem.innerHTML = icon.outerHTML + ' ' + text;
            } else {
              elem.textContent = text;
            }
          }
        }
      }
    });

    // 탭 전환
    function showTab(tab) {
      document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-white', 'text-pink-600');
        b.classList.add('bg-pink-100', 'text-gray-700');
      });
      
      document.getElementById(tab + '-tab').classList.remove('hidden');
      const btn = document.querySelector(\`button[onclick="showTab('\${tab}')"]\`);
      btn.classList.add('active', 'bg-white', 'text-pink-600');
      btn.classList.remove('bg-pink-100', 'text-gray-700');
      
      if (tab === 'stats') {
        loadStats();
      } else if (tab === 'search') {
        searchProfiles();
      }
    }

    // 사진 업로드 미리보기
    document.getElementById('idPhoto').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('previewImage').src = e.target.result;
          document.getElementById('photoPreview').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
    });

    // 프로필 등록
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const data = {
        name: document.getElementById('name').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        country: document.getElementById('country').value,
        about: document.getElementById('about').value,
        interests: document.getElementById('interests').value
      };
      
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          document.getElementById('registerResult').innerHTML = \`
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <p class="text-green-800"><i class="fas fa-check-circle"></i> 프로필이 성공적으로 등록되었습니다!</p>
            </div>
          \`;
          document.getElementById('registerResult').classList.remove('hidden');
          document.getElementById('registerForm').reset();
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        document.getElementById('registerResult').innerHTML = \`
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800"><i class="fas fa-exclamation-circle"></i> \${err.message}</p>
          </div>
        \`;
        document.getElementById('registerResult').classList.remove('hidden');
      }
    });

    // 프로필 검색
    async function searchProfiles() {
      const gender = document.getElementById('filterGender').value;
      const country = document.getElementById('filterCountry').value;
      
      let url = '/api/profiles?';
      if (gender) url += \`gender=\${gender}&\`;
      if (country) url += \`country=\${country}\`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        const container = document.getElementById('profileResults');
        container.innerHTML = '';
        
        if (data.profiles.length === 0) {
          container.innerHTML = '<p class="col-span-2 text-center text-gray-500">검색 결과가 없습니다.</p>';
          return;
        }
        
        data.profiles.forEach(profile => {
          const card = document.createElement('div');
          card.className = 'bg-pink-50 rounded-lg p-4 shadow hover:shadow-lg transition';
          card.innerHTML = \`
            <div class="flex items-center mb-2">
              <i class="fas fa-user-circle text-3xl text-pink-500 mr-3"></i>
              <div>
                <h3 class="font-bold text-lg">\${profile.name}</h3>
                <p class="text-sm text-gray-600">\${profile.age}세 · \${profile.gender} · \${profile.country}</p>
              </div>
            </div>
            <p class="text-gray-700 text-sm mb-2">\${profile.about || '자기소개 없음'}</p>
            <p class="text-gray-600 text-sm"><i class="fas fa-heart text-pink-400"></i> \${profile.interests || '관심사 없음'}</p>
          \`;
          container.appendChild(card);
        });
      } catch (err) {
        console.error('검색 실패:', err);
      }
    }

    // 통계 로드
    async function loadStats() {
      try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        const container = document.getElementById('statsContainer');
        container.innerHTML = \`
          <div class="bg-pink-50 rounded-lg p-4 text-center">
            <i class="fas fa-users text-3xl text-pink-500 mb-2"></i>
            <p class="text-2xl font-bold text-gray-800">\${stats.totalProfiles}</p>
            <p class="text-gray-600 text-sm">전체 회원</p>
          </div>
          <div class="bg-blue-50 rounded-lg p-4 text-center">
            <i class="fas fa-heart text-3xl text-blue-500 mb-2"></i>
            <p class="text-2xl font-bold text-gray-800">\${stats.totalMatches}</p>
            <p class="text-gray-600 text-sm">매칭 수</p>
          </div>
          <div class="bg-purple-50 rounded-lg p-4 text-center">
            <i class="fas fa-venus-mars text-3xl text-purple-500 mb-2"></i>
            <p class="text-2xl font-bold text-gray-800">\${stats.byGender.male} / \${stats.byGender.female}</p>
            <p class="text-gray-600 text-sm">남성 / 여성</p>
          </div>
          <div class="bg-green-50 rounded-lg p-4 text-center">
            <i class="fas fa-chart-pie text-3xl text-green-500 mb-2"></i>
            <p class="text-lg font-bold text-gray-800">\${stats.byAge['40s']}/\${stats.byAge['50s']}/\${stats.byAge['60s']}</p>
            <p class="text-gray-600 text-sm">40대/50대/60대</p>
          </div>
        \`;
      } catch (err) {
        console.error('통계 로드 실패:', err);
      }
    }

    // 페이지 로드시 초기화
    loadStats();
  </script>

  <!-- 챗봇 스타일 -->
  <style>
    .chatbot-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 120px;
      height: 120px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.6);
      z-index: 9998;
      transition: transform 0.3s ease;
    }
    .chatbot-button:hover { transform: scale(1.1); }
    .chatbot-button i { color: white; font-size: 56px; }
    .ai-badge {
      position: absolute;
      top: -10px;
      right: -10px;
      background: #ff4757;
      color: white;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      border: 4px solid white;
    }
    .chatbot-window {
      position: fixed;
      bottom: 150px;
      right: 20px;
      width: 760px;
      max-width: calc(100vw - 40px);
      height: 1000px;
      max-height: calc(100vh - 180px);
      background: white;
      border-radius: 24px;
      box-shadow: 0 16px 64px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    .chatbot-window.active { display: flex; }
    .chatbot-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .chatbot-header-left { display: flex; align-items: center; gap: 24px; }
    .chatbot-avatar {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chatbot-avatar i { color: #667eea; font-size: 48px; }
    .chatbot-title h3 { margin: 0; font-size: 32px; font-weight: bold; }
    .chatbot-title p { margin: 0; font-size: 24px; opacity: 0.9; }
    .chatbot-close { cursor: pointer; font-size: 48px; opacity: 0.8; transition: opacity 0.2s; }
    .chatbot-close:hover { opacity: 1; }
    .chatbot-body { flex: 1; overflow-y: auto; padding: 32px; background: #f7f9fc; }
    .faq-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 4px solid #e0e7ff;
    }
    .faq-header i { color: #667eea; font-size: 36px; }
    .faq-header h4 { margin: 0; color: #1e293b; font-size: 30px; font-weight: 600; }
    .faq-list { display: flex; flex-direction: column; gap: 16px; }
    .faq-item {
      background: white;
      padding: 24px 32px;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .faq-item:hover {
      background: #f1f5f9;
      border-color: #667eea;
      transform: translateX(8px);
    }
    .faq-item span { font-size: 28px; color: #334155; flex: 1; }
    .faq-item i { color: #94a3b8; font-size: 24px; }
    .chatbot-answer {
      background: #ede9fe;
      border-left: 8px solid #667eea;
      padding: 32px;
      border-radius: 16px;
      margin-top: 32px;
      display: none;
    }
    .chatbot-answer.active { display: block; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .answer-text { color: #1e293b; font-size: 28px; line-height: 1.8; white-space: pre-wrap; }
    .back-button {
      background: #667eea;
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 26px;
      margin-top: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: background 0.2s;
    }
    .back-button:hover { background: #5568d3; }
    @media (max-width: 768px) {
      .chatbot-window { width: calc(100vw - 20px); right: 10px; bottom: 140px; height: calc(100vh - 160px); }
      .chatbot-button { width: 112px; height: 112px; right: 15px; bottom: 15px; }
      .chatbot-button i { font-size: 48px; }
      .ai-badge { width: 40px; height: 40px; font-size: 16px; }
      .chatbot-header { padding: 20px; }
      .chatbot-avatar { width: 60px; height: 60px; }
      .chatbot-avatar i { font-size: 36px; }
      .chatbot-title h3 { font-size: 24px; }
      .chatbot-title p { font-size: 18px; }
      .chatbot-close { font-size: 36px; }
      .chatbot-body { padding: 20px; }
      .faq-header i { font-size: 28px; }
      .faq-header h4 { font-size: 24px; }
      .faq-item { padding: 18px 24px; }
      .faq-item span { font-size: 22px; }
      .faq-item i { font-size: 20px; }
      .answer-text { font-size: 22px; }
      .back-button { padding: 12px 24px; font-size: 20px; }
    }
  </style>

  <!-- 챗봇 HTML -->
  <div class="chatbot-button" onclick="toggleChatbot()">
    <i class="fas fa-robot"></i>
    <div class="ai-badge">AI</div>
  </div>

  <div class="chatbot-window" id="chatbotWindow">
    <div class="chatbot-header">
      <div class="chatbot-header-left">
        <div class="chatbot-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="chatbot-title">
          <h3 id="chatbot-title">챗봇</h3>
          <p id="chatbot-subtitle">궁금하신 질문은 운영자에게 문의하세요</p>
        </div>
      </div>
      <div class="chatbot-close" onclick="toggleChatbot()">
        <i class="fas fa-times"></i>
      </div>
    </div>
    
    <div class="chatbot-body">
      <div class="faq-header">
        <i class="fas fa-lightbulb"></i>
        <h4 id="faq-title">자주 묻는 질문</h4>
      </div>
      
      <div class="faq-list" id="faqList"></div>
      
      <div class="chatbot-answer" id="chatbotAnswer">
        <div class="answer-text" id="answerText"></div>
        <button class="back-button" onclick="showQuestions()">
          <i class="fas fa-arrow-left"></i>
          <span id="back-button-text">질문 목록으로</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    const chatbotFaqData = {
      "ko": {
        "title": "챗봇",
        "subtitle": "궁금하신 질문은 운영자에게 문의하세요",
        "faqTitle": "자주 묻는 질문",
        "backButton": "질문 목록으로",
        "questions": [
          {"q": "CoupleGate는 어떤 플랫폼인가요?", "a": "CoupleGate는 전 세계 사람들과 진지한 국제 연애·결혼을 연결하는 글로벌 매칭 플랫폼입니다. AI 기반 매칭, 실시간 번역, 화상통화 등 장거리·국제 연애에 필요한 기능을 모두 제공합니다."},
          {"q": "주 이용자는 어떤 사람들인가요?", "a": "40대·50대·60대 싱글, 돌싱, 글로벌 연애·결혼을 원하는 분들이 중심입니다. 신뢰성 있는 대화·매칭을 위해 엄격한 인증 시스템이 적용됩니다."},
          {"q": "무료 회원과 유료 회원 차이가 무엇인가요?", "a": "무료 회원: 메뉴·검색 일부 기능만 사용 가능\\n유료 회원: 모든 기능 개방 (매칭, 메시지, 화상통화, 번역, 고급 필터, 프로필 분석 등)\\n3개 이상 소셜 미디어 인증 필수 → 회원 자격 활성화"},
          {"q": "회원가입은 어떻게 하나요?", "a": "'Sign Up Free' 클릭 → 이메일 입력\\n3개 이상 SNS 계정 인증 (Facebook/Instagram/Kakao/X/Naver/Google/WeChat)\\n프로필 사진·자기소개 작성\\n무료 회원 자격 획득"},
          {"q": "SNS 인증은 왜 3개 이상 필요한가요?", "a": "국제 매칭 플랫폼에서 가장 중요한 요소는 신뢰성 확보입니다. 다중 SNS 인증은 사기 계정을 차단하고 안정적인 매칭을 제공합니다."},
          {"q": "어떤 계정들을 인증할 수 있나요?", "a": "Facebook, Instagram, Kakao, X(Twitter), Naver, Google, WeChat — 총 7개 중 3개 이상 인증해야 회원 가입 완료됩니다."},
          {"q": "얼굴 인증·신분증 인증은 무엇인가요?", "a": "AI 기반 얼굴 매칭·ID 인증을 통해 가짜 사진·도용을 방지하고 실제 본인임을 자동 검증합니다."},
          {"q": "AI 프로필 자동 검증 기능이 있나요?", "a": "예. Deepfake·합성·중복 사진을 AI가 자동 분석해 위험 계정을 걸러줍니다."},
          {"q": "AI 프로필 자동 작성 기능은 무엇인가요?", "a": "업로드한 사진·관심사를 분석해\\n자기소개 자동 생성\\n최고의 사진 조합 추천\\n매력적인 문장 리라이팅\\n등을 자동으로 도와줍니다."},
          {"q": "문화 차이 코칭 기능이 있나요?", "a": "있습니다. 국가별 데이트 매너·주의사항·금기사항을 자동 안내하여 오해 없이 관계를 유지할 수 있도록 도와줍니다. 예: 한국 남성 ↔ 베트남 여성 대화 팁 등"},
          {"q": "AI 번역 기능은 어떻게 동작하나요?", "a": "메시지를 보내면 자동으로 상대 국가 언어로 번역되며 원문 + 번역문이 함께 표시됩니다."},
          {"q": "상대방 응답이 느린 이유를 분석해주는 기능이 있나요?", "a": "있습니다. 메시지 패턴·감정 분석을 기반으로 '바빠서 지연', '관심도 낮음', '신중함' 등을 AI가 추정해줍니다."},
          {"q": "음성 메시지도 번역되나요?", "a": "가능합니다. 음성을 텍스트로 변환 → 번역 → 감정 분석까지 자동 처리됩니다."},
          {"q": "사진은 몇 장까지 업로드할 수 있나요?", "a": "최대 10장까지 가능합니다."},
          {"q": "동영상도 업로드할 수 있나요?", "a": "네, 최대 3개의 동영상을 업로드할 수 있습니다."},
          {"q": "프로필 매력도 점수 기능이 있나요?", "a": "있습니다. 사진·문장·관심사를 분석하여 Attractiveness Score를 제공하고 개선 팁까지 안내합니다."},
          {"q": "계정을 탈퇴하고 싶어요", "a": "앱 오른쪽 상단 메뉴 → Settings(설정) → Account(계정 관리) 선택 → 화면 맨 하단의 Delete Account(계정 삭제) 클릭 → 본인 인증 후 탈퇴 완료\\n※ 탈퇴 즉시 모든 프로필·매칭·메시지 기록이 삭제되며 복구가 불가능합니다."},
          {"q": "프리미엄 결제 후 환불을 받고 싶어요", "a": "결제 후 48시간 이내, 유료 기능을 사용하지 않은 경우 환불 가능합니다. 결제 오류 시에도 환불 가능합니다. 환불 문의는 고객센터로 영수증과 함께 제출해주세요."},
          {"q": "소셜 미디어 인증이 계속 실패해요", "a": "SNS 로그인 정보 오류, 동일 계정 중복 로그인, 권한 거부, 프로필 정보 부족, VPN 사용, 팝업 차단 등이 원인입니다. SNS 정상 로그인 확인, 팝업 허용, VPN 끄기, 기본정보 등록 후 다시 시도해주세요."}
        ]
      },
      "en": {
        "title": "Chatbot",
        "subtitle": "How can I help you?",
        "faqTitle": "Frequently Asked Questions",
        "backButton": "Back to questions",
        "questions": [
          {"q": "What is CoupleGate?", "a": "CoupleGate is a global matching platform connecting people worldwide for serious international dating and marriage. It provides AI-based matching, real-time translation, video calls, and all features necessary for long-distance international relationships."},
          {"q": "Who are the main users?", "a": "Singles and divorcees in their 40s, 50s, and 60s seeking global dating and marriage. A strict verification system is applied for reliable conversations and matching."},
          {"q": "What's the difference between free and premium?", "a": "Free members: Limited menu and search features\\nPremium members: Full access (matching, messaging, video calls, translation, advanced filters, profile analysis)\\n3+ social media verifications required"},
          {"q": "How do I sign up?", "a": "Click 'Sign Up Free' → Enter email → Verify 3+ SNS accounts (Facebook/Instagram/Kakao/X/Naver/Google/WeChat) → Add profile photo and bio → Complete free membership"},
          {"q": "Why do I need 3+ SNS verifications?", "a": "Trust is the most important element in international matching platforms. Multi-SNS verification blocks fraudulent accounts and provides stable matching."},
          {"q": "Which accounts can I verify?", "a": "Facebook, Instagram, Kakao, X(Twitter), Naver, Google, WeChat — You need to verify at least 3 out of 7 accounts to complete sign-up."},
          {"q": "What is face & ID verification?", "a": "AI-based face matching and ID verification automatically validates your identity to prevent fake photos and identity theft."},
          {"q": "Is there automatic profile verification?", "a": "Yes. AI automatically analyzes Deepfake, composite, and duplicate photos to filter out risky accounts."},
          {"q": "What is automatic profile creation?", "a": "Analyzes uploaded photos and interests to:\\nAuto-generate bio\\nRecommend best photo combinations\\nRewrite attractive sentences\\nand more."},
          {"q": "Is there cultural difference coaching?", "a": "Yes. Provides automatic guidance on dating manners, precautions, and taboos by country to maintain relationships without misunderstandings. Example: Korean men ↔ Vietnamese women conversation tips"},
          {"q": "How does AI translation work?", "a": "Messages are automatically translated to the recipient's language, displaying both original and translated text together."},
          {"q": "Can you analyze why responses are slow?", "a": "Yes. Based on message patterns and emotion analysis, AI estimates reasons like 'busy delay', 'low interest', 'being careful', etc."},
          {"q": "Are voice messages translated too?", "a": "Yes. Voice is converted to text → translated → emotion analyzed automatically."},
          {"q": "How many photos can I upload?", "a": "Up to 10 photos."},
          {"q": "Can I upload videos too?", "a": "Yes, up to 3 videos."},
          {"q": "Is there a profile attractiveness score?", "a": "Yes. Analyzes photos, descriptions, and interests to provide an Attractiveness Score with improvement tips."},
          {"q": "How do I delete my account?", "a": "Top right menu → Settings → Account management → Delete Account at bottom → Verify identity → Complete deletion\\n※ All profile, match, and message records are permanently deleted and cannot be recovered."},
          {"q": "Can I get a refund after premium payment?", "a": "Refunds available within 48 hours if premium features weren't used. Also available for payment errors. Submit refund requests with receipt to customer service."},
          {"q": "Why does SNS verification keep failing?", "a": "Causes: Wrong SNS login info, duplicate logins on multiple devices, permission denied, missing profile info, VPN usage, popup blocked. Solutions: Verify SNS login, allow popups, disable VPN, add profile info, retry."}
        ]
      },
      "zh": {
        "title": "聊天机器人",
        "subtitle": "我能帮您什么？",
        "faqTitle": "常见问题",
        "backButton": "返回问题列表",
        "questions": [
          {"q": "CoupleGate是什么？", "a": "CoupleGate是一个全球配对平台，连接世界各地的人们进行认真的国际约会和婚姻。它提供基于AI的配对、实时翻译、视频通话等远距离国际关系所需的所有功能。"},
          {"q": "主要用户是谁？", "a": "40岁、50岁、60岁的单身者、离异者，希望全球约会和结婚的人为中心。为了可靠的对话和配对，应用了严格的认证系统。"},
          {"q": "免费会员和付费会员有什么区别？", "a": "免费会员：仅限部分菜单和搜索功能\\n付费会员：完全访问（配对、消息、视频通话、翻译、高级过滤器、个人资料分析）\\n需要3个以上社交媒体验证"},
          {"q": "如何注册？", "a": "点击'免费注册'→输入电子邮件→验证3个以上SNS帐户（Facebook/Instagram/Kakao/X/Naver/Google/WeChat）→添加个人资料照片和简介→完成免费会员资格"},
          {"q": "为什么需要3个以上的SNS验证？", "a": "信任是国际配对平台最重要的要素。多重SNS验证可以阻止欺诈帐户并提供稳定的配对。"},
          {"q": "可以验证哪些帐户？", "a": "Facebook、Instagram、Kakao、X(Twitter)、Naver、Google、WeChat — 需要验证7个中的至少3个才能完成注册。"},
          {"q": "什么是面部和身份证验证？", "a": "基于AI的面部匹配和ID验证自动验证您的身份，以防止假照片和身份盗用。"},
          {"q": "有自动个人资料验证吗？", "a": "有。AI自动分析Deepfake、合成和重复照片以过滤风险帐户。"},
          {"q": "什么是自动个人资料创建？", "a": "分析上传的照片和兴趣以：\\n自动生成简介\\n推荐最佳照片组合\\n重写有吸引力的句子\\n等。"},
          {"q": "有文化差异辅导吗？", "a": "有。自动提供各国约会礼仪、注意事项和禁忌指导，帮助维持关系而不产生误解。例如：韩国男性↔越南女性对话提示"},
          {"q": "AI翻译如何工作？", "a": "消息自动翻译为收件人的语言，同时显示原文和译文。"},
          {"q": "可以分析为什么响应慢吗？", "a": "可以。基于消息模式和情感分析，AI估计原因，如'忙碌延迟'、'兴趣低'、'谨慎'等。"},
          {"q": "语音消息也会被翻译吗？", "a": "是的。语音转换为文本→翻译→自动进行情感分析。"},
          {"q": "可以上传多少张照片？", "a": "最多10张照片。"},
          {"q": "也可以上传视频吗？", "a": "是的，最多3个视频。"},
          {"q": "有个人资料吸引力评分吗？", "a": "有。分析照片、描述和兴趣以提供吸引力评分和改进提示。"},
          {"q": "如何删除我的帐户？", "a": "右上角菜单→设置→帐户管理→底部删除帐户→验证身份→完成删除\\n※所有个人资料、匹配和消息记录将被永久删除，无法恢复。"},
          {"q": "付费后可以退款吗？", "a": "如果未使用付费功能，则可在付款后48小时内退款。付款错误时也可退款。请将退款请求与收据一起提交给客服。"},
          {"q": "为什么SNS验证一直失败？", "a": "原因：SNS登录信息错误、在多个设备上重复登录、权限被拒绝、缺少个人资料信息、使用VPN、弹出窗口被阻止。解决方案：验证SNS登录、允许弹出窗口、禁用VPN、添加个人资料信息、重试。"}
        ]
      },
      "ja": {
        "title": "チャットボット",
        "subtitle": "どのようにお手伝いできますか？",
        "faqTitle": "よくある質問",
        "backButton": "質問リストに戻る",
        "questions": [
          {"q": "CoupleGateとは何ですか？", "a": "CoupleGateは、世界中の人々と真剣な国際恋愛・結婚を結ぶグローバルマッチングプラットフォームです。AIベースのマッチング、リアルタイム翻訳、ビデオ通話など、遠距離・国際恋愛に必要な機能をすべて提供します。"},
          {"q": "主な利用者はどのような人ですか？", "a": "40代・50代・60代のシングル、バツイチ、グローバル恋愛・結婚を希望する方が中心です。信頼性のある会話・マッチングのため、厳格な認証システムが適用されます。"},
          {"q": "無料会員と有料会員の違いは？", "a": "無料会員：メニュー・検索の一部機能のみ利用可能\\n有料会員：すべての機能開放（マッチング、メッセージ、ビデオ通話、翻訳、高度なフィルター、プロフィール分析など）\\n3つ以上のソーシャルメディア認証が必須"},
          {"q": "登録方法は？", "a": "'無料登録'をクリック→メールアドレスを入力→3つ以上のSNSアカウントを認証（Facebook/Instagram/Kakao/X/Naver/Google/WeChat）→プロフィール写真と自己紹介を追加→無料会員登録完了"},
          {"q": "なぜ3つ以上のSNS認証が必要ですか？", "a": "信頼は国際マッチングプラットフォームで最も重要な要素です。複数のSNS認証により詐欺アカウントをブロックし、安定したマッチングを提供します。"},
          {"q": "どのアカウントを認証できますか？", "a": "Facebook、Instagram、Kakao、X(Twitter)、Naver、Google、WeChat — 7つのうち少なくとも3つを認証する必要があります。"},
          {"q": "顔認証とID認証とは何ですか？", "a": "AIベースの顔マッチングとID認証により、偽の写真や身元盗用を防ぎ、本人確認を自動的に検証します。"},
          {"q": "自動プロフィール検証機能はありますか？", "a": "はい。AIがDeepfake、合成、重複写真を自動分析して危険なアカウントをフィルタリングします。"},
          {"q": "自動プロフィール作成機能とは何ですか？", "a": "アップロードした写真と興味を分析して：\\n自己紹介の自動生成\\n最適な写真の組み合わせを推奨\\n魅力的な文章のリライト\\nなど。"},
          {"q": "文化の違いコーチング機能はありますか？", "a": "あります。国別のデートマナー、注意事項、タブーを自動的に案内し、誤解なく関係を維持できるようサポートします。例：韓国人男性↔ベトナム人女性の会話のヒント"},
          {"q": "AI翻訳はどのように機能しますか？", "a": "メッセージは自動的に受信者の言語に翻訳され、原文と翻訳文の両方が表示されます。"},
          {"q": "応答が遅い理由を分析できますか？", "a": "はい。メッセージパターンと感情分析に基づいて、'忙しくて遅延'、'関心度が低い'、'慎重'などをAIが推定します。"},
          {"q": "音声メッセージも翻訳されますか？", "a": "はい。音声をテキストに変換→翻訳→感情分析まで自動処理されます。"},
          {"q": "写真は何枚までアップロードできますか？", "a": "最大10枚まで可能です。"},
          {"q": "動画もアップロードできますか？", "a": "はい、最大3つの動画をアップロードできます。"},
          {"q": "プロフィール魅力スコア機能はありますか？", "a": "あります。写真、説明、興味を分析して魅力スコアと改善のヒントを提供します。"},
          {"q": "アカウントを削除したい", "a": "右上のメニュー→設定→アカウント管理→下部のアカウント削除→本人確認→削除完了\\n※すべてのプロフィール、マッチング、メッセージ記録が永久に削除され、復元できません。"},
          {"q": "プレミアム支払い後に返金できますか？", "a": "プレミアム機能を使用していない場合、支払い後48時間以内に返金可能です。支払いエラーの場合も返金可能です。領収書と一緒にカスタマーサービスに返金リクエストを提出してください。"},
          {"q": "SNS認証が失敗し続ける理由は？", "a": "原因：SNSログイン情報の誤り、複数のデバイスでの重複ログイン、権限拒否、プロフィール情報の欠落、VPN使用、ポップアップブロック。解決策：SNSログインの確認、ポップアップ許可、VPN無効化、プロフィール情報の追加、再試行。"}
        ]
      },
      "vi": {
        "title": "Chatbot",
        "subtitle": "Tôi có thể giúp gì cho bạn?",
        "faqTitle": "Câu hỏi thường gặp",
        "backButton": "Quay lại danh sách câu hỏi",
        "questions": [
          {"q": "CoupleGate là gì?", "a": "CoupleGate là nền tảng kết nối toàn cầu kết nối mọi người trên toàn thế giới để hẹn hò và kết hôn quốc tế nghiêm túc. Nó cung cấp kết nối dựa trên AI, dịch thuật thời gian thực, cuộc gọi video và tất cả các tính năng cần thiết cho các mối quan hệ quốc tế đường dài."},
          {"q": "Người dùng chính là ai?", "a": "Độc thân và ly hôn ở độ tuổi 40, 50, 60 tìm kiếm hẹn hò và kết hôn toàn cầu. Hệ thống xác minh nghiêm ngặt được áp dụng cho các cuộc trò chuyện và kết nối đáng tin cậy."},
          {"q": "Sự khác biệt giữa thành viên miễn phí và cao cấp?", "a": "Thành viên miễn phí: Giới hạn menu và tính năng tìm kiếm\\nThành viên cao cấp: Truy cập đầy đủ (kết nối, nhắn tin, cuộc gọi video, dịch thuật, bộ lọc nâng cao, phân tích hồ sơ)\\nYêu cầu 3+ xác minh mạng xã hội"},
          {"q": "Làm thế nào để đăng ký?", "a": "Nhấp 'Đăng ký miễn phí' → Nhập email → Xác minh 3+ tài khoản SNS (Facebook/Instagram/Kakao/X/Naver/Google/WeChat) → Thêm ảnh hồ sơ và tiểu sử → Hoàn tất đăng ký miễn phí"},
          {"q": "Tại sao cần 3+ xác minh SNS?", "a": "Tin cậy là yếu tố quan trọng nhất trong các nền tảng kết nối quốc tế. Xác minh đa SNS chặn các tài khoản gian lận và cung cấp kết nối ổn định."},
          {"q": "Tôi có thể xác minh tài khoản nào?", "a": "Facebook, Instagram, Kakao, X(Twitter), Naver, Google, WeChat — Bạn cần xác minh ít nhất 3 trong 7 tài khoản để hoàn tất đăng ký."},
          {"q": "Xác minh khuôn mặt và ID là gì?", "a": "Xác minh khuôn mặt và ID dựa trên AI tự động xác thực danh tính của bạn để ngăn chặn ảnh giả và trộm cắp danh tính."},
          {"q": "Có xác minh hồ sơ tự động không?", "a": "Có. AI tự động phân tích Deepfake, ảnh tổng hợp và trùng lặp để lọc các tài khoản rủi ro."},
          {"q": "Tạo hồ sơ tự động là gì?", "a": "Phân tích ảnh và sở thích đã tải lên để:\\nTự động tạo tiểu sử\\nĐề xuất kết hợp ảnh tốt nhất\\nViết lại câu hấp dẫn\\nvà hơn thế nữa."},
          {"q": "Có huấn luyện sự khác biệt văn hóa không?", "a": "Có. Cung cấp hướng dẫn tự động về phép lịch sự hẹn hò, biện pháp phòng ngừa và cấm kỵ theo quốc gia để duy trì mối quan hệ mà không hiểu lầm. Ví dụ: Mẹo trò chuyện giữa nam giới Hàn Quốc ↔ nữ giới Việt Nam"},
          {"q": "Dịch thuật AI hoạt động như thế nào?", "a": "Tin nhắn được tự động dịch sang ngôn ngữ của người nhận, hiển thị cả văn bản gốc và dịch cùng nhau."},
          {"q": "Có thể phân tích tại sao phản hồi chậm không?", "a": "Có. Dựa trên mẫu tin nhắn và phân tích cảm xúc, AI ước tính các lý do như 'bận rộn trì hoãn', 'quan tâm thấp', 'cẩn thận', v.v."},
          {"q": "Tin nhắn thoại cũng được dịch không?", "a": "Có. Giọng nói được chuyển đổi thành văn bản → dịch → phân tích cảm xúc tự động."},
          {"q": "Tôi có thể tải lên bao nhiêu ảnh?", "a": "Tối đa 10 ảnh."},
          {"q": "Tôi có thể tải lên video không?", "a": "Có, tối đa 3 video."},
          {"q": "Có điểm hấp dẫn hồ sơ không?", "a": "Có. Phân tích ảnh, mô tả và sở thích để cung cấp Điểm hấp dẫn với các mẹo cải thiện."},
          {"q": "Làm thế nào để xóa tài khoản của tôi?", "a": "Menu phía trên bên phải → Cài đặt → Quản lý tài khoản → Xóa tài khoản ở dưới cùng → Xác minh danh tính → Hoàn tất xóa\\n※ Tất cả hồ sơ, kết nối và hồ sơ tin nhắn sẽ bị xóa vĩnh viễn và không thể khôi phục."},
          {"q": "Tôi có thể được hoàn tiền sau khi thanh toán cao cấp không?", "a": "Hoàn tiền có sẵn trong vòng 48 giờ nếu các tính năng cao cấp chưa được sử dụng. Cũng có sẵn cho lỗi thanh toán. Gửi yêu cầu hoàn tiền với biên lai cho dịch vụ khách hàng."},
          {"q": "Tại sao xác minh SNS tiếp tục thất bại?", "a": "Nguyên nhân: Thông tin đăng nhập SNS sai, đăng nhập trùng lặp trên nhiều thiết bị, quyền bị từ chối, thiếu thông tin hồ sơ, sử dụng VPN, popup bị chặn. Giải pháp: Xác minh đăng nhập SNS, cho phép popup, tắt VPN, thêm thông tin hồ sơ, thử lại."}
        ]
      },
      "ar": {
        "title": "روبوت الدردشة",
        "subtitle": "كيف يمكنني مساعدتك؟",
        "faqTitle": "الأسئلة الشائعة",
        "backButton": "العودة إلى قائمة الأسئلة",
        "questions": [
          {"q": "ما هو CoupleGate؟", "a": "CoupleGate هو منصة مطابقة عالمية تربط الأشخاص في جميع أنحاء العالم للمواعدة والزواج الدولي الجاد. يوفر المطابقة المستندة إلى الذكاء الاصطناعي والترجمة في الوقت الفعلي ومكالمات الفيديو وجميع الميزات الضرورية للعلاقات الدولية بعيدة المدى."},
          {"q": "من هم المستخدمون الرئيسيون؟", "a": "العزاب والمطلقون في الأربعينيات والخمسينيات والستينيات الذين يبحثون عن المواعدة والزواج العالمي. يتم تطبيق نظام تحقق صارم للمحادثات والمطابقة الموثوقة."},
          {"q": "ما الفرق بين الأعضاء المجانيين والمميزين؟", "a": "الأعضاء المجانيون: قائمة محدودة وميزات البحث\\nالأعضاء المميزون: الوصول الكامل (المطابقة والمراسلة ومكالمات الفيديو والترجمة والمرشحات المتقدمة وتحليل الملف الشخصي)\\n3+ تحققات من وسائل التواصل الاجتماعي مطلوبة"},
          {"q": "كيف أقوم بالتسجيل؟", "a": "انقر فوق 'تسجيل مجاني' → أدخل البريد الإلكتروني → تحقق من 3+ حسابات SNS (Facebook/Instagram/Kakao/X/Naver/Google/WeChat) → أضف صورة الملف الشخصي والسيرة الذاتية → أكمل العضوية المجانية"},
          {"q": "لماذا أحتاج 3+ تحققات SNS؟", "a": "الثقة هي العنصر الأكثر أهمية في منصات المطابقة الدولية. يحظر التحقق المتعدد من SNS الحسابات الاحتيالية ويوفر مطابقة مستقرة."},
          {"q": "ما الحسابات التي يمكنني التحقق منها؟", "a": "Facebook و Instagram و Kakao و X (Twitter) و Naver و Google و WeChat — تحتاج إلى التحقق من 3 على الأقل من أصل 7 حسابات لإكمال التسجيل."},
          {"q": "ما هو التحقق من الوجه والهوية؟", "a": "يتحقق التحقق من الوجه والهوية المستند إلى الذكاء الاصطناعي تلقائيًا من هويتك لمنع الصور المزيفة وسرقة الهوية."},
          {"q": "هل يوجد تحقق تلقائي من الملف الشخصي؟", "a": "نعم. يقوم الذكاء الاصطناعي تلقائيًا بتحليل Deepfake والصور المركبة والمكررة لتصفية الحسابات الخطرة."},
          {"q": "ما هو إنشاء الملف الشخصي التلقائي؟", "a": "يحلل الصور والاهتمامات المحملة من أجل:\\nتوليد السيرة الذاتية تلقائيًا\\nالتوصية بأفضل مجموعات الصور\\nإعادة كتابة الجمل الجذابة\\nوأكثر."},
          {"q": "هل يوجد تدريب على الاختلافات الثقافية؟", "a": "نعم. يوفر إرشادات تلقائية حول آداب المواعدة والاحتياطات والمحرمات حسب البلد للحفاظ على العلاقات دون سوء فهم. مثال: نصائح المحادثة بين الرجال الكوريين ↔ النساء الفيتناميات"},
          {"q": "كيف تعمل الترجمة بالذكاء الاصطناعي؟", "a": "يتم ترجمة الرسائل تلقائيًا إلى لغة المستلم ، وعرض كل من النص الأصلي والمترجم معًا."},
          {"q": "هل يمكن تحليل سبب بطء الاستجابات؟", "a": "نعم. بناءً على أنماط الرسائل وتحليل المشاعر ، يقدر الذكاء الاصطناعي أسبابًا مثل 'تأخير مشغول' و 'اهتمام منخفض' و 'كونه حذرًا' وما إلى ذلك."},
          {"q": "هل يتم ترجمة الرسائل الصوتية أيضًا؟", "a": "نعم. يتم تحويل الصوت إلى نص → ترجمة → تحليل المشاعر تلقائيًا."},
          {"q": "كم عدد الصور التي يمكنني تحميلها؟", "a": "ما يصل إلى 10 صور."},
          {"q": "هل يمكنني تحميل مقاطع الفيديو أيضًا؟", "a": "نعم ، ما يصل إلى 3 مقاطع فيديو."},
          {"q": "هل هناك نقاط جاذبية الملف الشخصي؟", "a": "نعم. يحلل الصور والأوصاف والاهتمامات لتوفير نقاط الجاذبية مع نصائح التحسين."},
          {"q": "كيف أحذف حسابي؟", "a": "القائمة العلوية اليمنى → الإعدادات → إدارة الحساب → حذف الحساب في الأسفل → التحقق من الهوية → إكمال الحذف\\n※ يتم حذف جميع سجلات الملف الشخصي والمطابقة والرسائل بشكل دائم ولا يمكن استردادها."},
          {"q": "هل يمكنني الحصول على استرداد بعد الدفع المميز؟", "a": "الاستردادات متاحة في غضون 48 ساعة إذا لم يتم استخدام الميزات المميزة. متاح أيضًا لأخطاء الدفع. أرسل طلبات الاسترداد مع الإيصال إلى خدمة العملاء."},
          {"q": "لماذا يستمر فشل التحقق من SNS؟", "a": "الأسباب: معلومات تسجيل دخول SNS خاطئة ، تسجيلات دخول مكررة على أجهزة متعددة ، رفض الإذن ، معلومات ملف تعريف مفقودة ، استخدام VPN ، نافذة منبثقة محظورة. الحلول: تحقق من تسجيل دخول SNS ، السماح بالنوافذ المنبثقة ، تعطيل VPN ، إضافة معلومات الملف الشخصي ، إعادة المحاولة."}
        ]
      }
    };

    let currentChatbotLang = 'ko';

    function toggleChatbot() {
      const chatbot = document.getElementById('chatbotWindow');
      chatbot.classList.toggle('active');
      if (chatbot.classList.contains('active')) {
        showQuestions();
      }
    }

    function showQuestions() {
      const faqList = document.getElementById('faqList');
      const chatbotAnswer = document.getElementById('chatbotAnswer');
      
      faqList.style.display = 'flex';
      chatbotAnswer.classList.remove('active');
      
      loadChatbotFAQs();
    }

    function showAnswer(question, answer) {
      const faqList = document.getElementById('faqList');
      const chatbotAnswer = document.getElementById('chatbotAnswer');
      const answerText = document.getElementById('answerText');
      
      faqList.style.display = 'none';
      answerText.textContent = answer;
      chatbotAnswer.classList.add('active');
    }

    function loadChatbotFAQs() {
      const data = chatbotFaqData[currentChatbotLang];
      const faqList = document.getElementById('faqList');
      
      document.getElementById('chatbot-title').textContent = data.title;
      document.getElementById('chatbot-subtitle').textContent = data.subtitle;
      document.getElementById('faq-title').textContent = data.faqTitle;
      document.getElementById('back-button-text').textContent = data.backButton;
      
      faqList.innerHTML = '';
      data.questions.forEach((item, index) => {
        const faqItem = document.createElement('div');
        faqItem.className = 'faq-item';
        faqItem.innerHTML = \`
          <span>\${index + 1}. \${item.q}</span>
          <i class="fas fa-chevron-right"></i>
        \`;
        faqItem.onclick = () => showAnswer(item.q, item.a);
        faqList.appendChild(faqItem);
      });
    }

    // 언어 선택기와 챗봇 언어 동기화
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
      langSelector.addEventListener('change', function() {
        currentChatbotLang = this.value;
        if (document.getElementById('chatbotWindow').classList.contains('active')) {
          loadChatbotFAQs();
        }
      });
    }

    // DOM 준비 후 초기 챗봇 FAQ 데이터 로드
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        // DOM이 준비되면 초기 데이터 설정 (챗봇이 열릴 때 사용)
        if (document.getElementById('faqList')) {
          loadChatbotFAQs();
        }
      });
    } else {
      // 이미 DOM이 로드된 경우
      if (document.getElementById('faqList')) {
        loadChatbotFAQs();
      }
    }
  </script>
</body>
</html>`;
}

function getAdminPageHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Couple Gate - 관리자 페이지</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100 min-h-screen">
  <!-- 로그인 화면 -->
  <div id="loginScreen" class="min-h-screen flex items-center justify-center px-4">
    <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <h1 class="text-3xl font-bold text-center mb-6 text-pink-600">
        <i class="fas fa-lock"></i> 관리자 로그인
      </h1>
      <form id="loginForm">
        <div class="mb-4">
          <label class="block text-gray-700 font-semibold mb-2">아이디</label>
          <input type="text" id="username" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
        </div>
        <div class="mb-6">
          <label class="block text-gray-700 font-semibold mb-2">비밀번호</label>
          <input type="password" id="password" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
        </div>
        <button type="submit" class="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700">
          <i class="fas fa-sign-in-alt"></i> 로그인
        </button>
      </form>
      <div id="loginError" class="mt-4 hidden">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800 text-center"><i class="fas fa-exclamation-circle"></i> <span id="loginErrorMsg"></span></p>
        </div>
      </div>
    </div>
  </div>

  <!-- 관리자 대시보드 -->
  <div id="adminDashboard" class="hidden">
    <nav class="bg-pink-600 text-white p-4">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold">
          <i class="fas fa-heart"></i> Couple Gate 관리자
        </h1>
        <div class="flex gap-4">
          <a href="/" class="hover:text-pink-200"><i class="fas fa-home"></i> 메인</a>
          <button onclick="logout()" class="hover:text-pink-200"><i class="fas fa-sign-out-alt"></i> 로그아웃</button>
        </div>
      </div>
    </nav>

    <div class="container mx-auto px-4 py-8">
      <!-- 탭 메뉴 -->
      <div class="mb-6">
        <div class="flex flex-wrap gap-2">
          <button onclick="showAdminTab('members')" class="admin-tab-btn active px-6 py-3 bg-white text-pink-600 rounded-lg font-bold shadow-lg">
            <i class="fas fa-users"></i> 회원 관리
          </button>
          <button onclick="showAdminTab('matches')" class="admin-tab-btn px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold shadow">
            <i class="fas fa-heart"></i> 매칭 관리
          </button>
          <button onclick="showAdminTab('stats')" class="admin-tab-btn px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold shadow">
            <i class="fas fa-chart-bar"></i> 통계 대시보드
          </button>
          <button onclick="showAdminTab('notices')" class="admin-tab-btn px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold shadow">
            <i class="fas fa-bell"></i> 공지사항 관리
          </button>
        </div>
      </div>

      <!-- 회원 관리 탭 -->
      <div id="members-tab" class="admin-tab-content bg-white rounded-lg shadow-xl p-6">
        <h2 class="text-2xl font-bold mb-4"><i class="fas fa-users text-pink-500"></i> 회원 관리</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-pink-50">
              <tr>
                <th class="px-4 py-2 text-left">ID</th>
                <th class="px-4 py-2 text-left">이름</th>
                <th class="px-4 py-2 text-left">나이</th>
                <th class="px-4 py-2 text-left">성별</th>
                <th class="px-4 py-2 text-left">국가</th>
                <th class="px-4 py-2 text-left">가입일</th>
                <th class="px-4 py-2 text-left">관리</th>
              </tr>
            </thead>
            <tbody id="membersTableBody">
            </tbody>
          </table>
        </div>
      </div>

      <!-- 매칭 관리 탭 -->
      <div id="matches-tab" class="admin-tab-content hidden bg-white rounded-lg shadow-xl p-6">
        <h2 class="text-2xl font-bold mb-4"><i class="fas fa-heart text-pink-500"></i> 매칭 관리</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-pink-50">
              <tr>
                <th class="px-4 py-2 text-left">ID</th>
                <th class="px-4 py-2 text-left">신청자</th>
                <th class="px-4 py-2 text-left">대상자</th>
                <th class="px-4 py-2 text-left">상태</th>
                <th class="px-4 py-2 text-left">신청일</th>
              </tr>
            </thead>
            <tbody id="matchesTableBody">
            </tbody>
          </table>
        </div>
      </div>

      <!-- 통계 대시보드 탭 -->
      <div id="stats-tab" class="admin-tab-content hidden bg-white rounded-lg shadow-xl p-6">
        <h2 class="text-2xl font-bold mb-4"><i class="fas fa-chart-bar text-pink-500"></i> 상세 통계</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="adminStatsContainer">
        </div>
      </div>

      <!-- 공지사항 관리 탭 -->
      <div id="notices-tab" class="admin-tab-content hidden bg-white rounded-lg shadow-xl p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold"><i class="fas fa-bell text-pink-500"></i> 공지사항 관리</h2>
          <button onclick="showNoticeForm()" class="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-pink-700">
            <i class="fas fa-plus"></i> 새 공지사항
          </button>
        </div>

        <!-- 공지사항 작성 폼 -->
        <div id="noticeFormContainer" class="hidden mb-6 bg-pink-50 rounded-lg p-4">
          <form id="noticeForm">
            <input type="hidden" id="editNoticeId">
            <div class="mb-4">
              <label class="block font-semibold mb-2">제목</label>
              <input type="text" id="noticeTitle" required class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div class="mb-4">
              <label class="block font-semibold mb-2">내용</label>
              <textarea id="noticeContent" rows="5" required class="w-full px-4 py-2 border rounded-lg"></textarea>
            </div>
            <div class="mb-4">
              <label class="flex items-center">
                <input type="checkbox" id="noticeImportant" class="mr-2">
                <span class="font-semibold">중요 공지사항</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button type="submit" class="bg-pink-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-pink-700">
                <i class="fas fa-save"></i> 저장
              </button>
              <button type="button" onclick="hideNoticeForm()" class="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500">
                취소
              </button>
            </div>
          </form>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-pink-50">
              <tr>
                <th class="px-4 py-2 text-left">ID</th>
                <th class="px-4 py-2 text-left">제목</th>
                <th class="px-4 py-2 text-left">중요</th>
                <th class="px-4 py-2 text-left">작성일</th>
                <th class="px-4 py-2 text-left">관리</th>
              </tr>
            </thead>
            <tbody id="noticesTableBody">
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    let authToken = null;

    // 로그인
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          authToken = result.token;
          document.getElementById('loginScreen').classList.add('hidden');
          document.getElementById('adminDashboard').classList.remove('hidden');
          loadMembers();
        } else {
          document.getElementById('loginErrorMsg').textContent = result.error;
          document.getElementById('loginError').classList.remove('hidden');
        }
      } catch (err) {
        document.getElementById('loginErrorMsg').textContent = '로그인 실패';
        document.getElementById('loginError').classList.remove('hidden');
      }
    });

    // 로그아웃
    function logout() {
      authToken = null;
      document.getElementById('loginScreen').classList.remove('hidden');
      document.getElementById('adminDashboard').classList.add('hidden');
      document.getElementById('loginForm').reset();
    }

    // 탭 전환
    function showAdminTab(tab) {
      document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.add('hidden'));
      document.querySelectorAll('.admin-tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-white', 'text-pink-600');
        b.classList.add('bg-gray-200', 'text-gray-700');
      });
      
      document.getElementById(tab + '-tab').classList.remove('hidden');
      const btn = document.querySelector(\`button[onclick="showAdminTab('\${tab}')"]\`);
      btn.classList.add('active', 'bg-white', 'text-pink-600');
      btn.classList.remove('bg-gray-200', 'text-gray-700');
      
      if (tab === 'members') loadMembers();
      else if (tab === 'matches') loadMatches();
      else if (tab === 'stats') loadAdminStats();
      else if (tab === 'notices') loadNotices();
    }

    // 회원 목록 로드
    async function loadMembers() {
      try {
        const response = await fetch('/api/admin/members', {
          headers: { 'Authorization': \`Basic \${authToken}\` }
        });
        
        const data = await response.json();
        const tbody = document.getElementById('membersTableBody');
        tbody.innerHTML = '';
        
        data.members.forEach(member => {
          const tr = document.createElement('tr');
          tr.className = 'border-b hover:bg-gray-50';
          tr.innerHTML = \`
            <td class="px-4 py-2">\${member.id}</td>
            <td class="px-4 py-2">\${member.name}</td>
            <td class="px-4 py-2">\${member.age}</td>
            <td class="px-4 py-2">\${member.gender}</td>
            <td class="px-4 py-2">\${member.country}</td>
            <td class="px-4 py-2">\${new Date(member.createdAt).toLocaleDateString()}</td>
            <td class="px-4 py-2">
              <button onclick="deleteMember(\${member.id})" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i> 삭제
              </button>
            </td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('회원 목록 로드 실패:', err);
      }
    }

    // 회원 삭제
    async function deleteMember(id) {
      if (!confirm('정말 삭제하시겠습니까?')) return;
      
      try {
        const response = await fetch(\`/api/admin/members/\${id}\`, {
          method: 'DELETE',
          headers: { 'Authorization': \`Basic \${authToken}\` }
        });
        
        if (response.ok) {
          loadMembers();
        }
      } catch (err) {
        alert('삭제 실패');
      }
    }

    // 매칭 목록 로드
    async function loadMatches() {
      try {
        const response = await fetch('/api/admin/matches', {
          headers: { 'Authorization': \`Basic \${authToken}\` }
        });
        
        const data = await response.json();
        const tbody = document.getElementById('matchesTableBody');
        tbody.innerHTML = '';
        
        data.matches.forEach(match => {
          const tr = document.createElement('tr');
          tr.className = 'border-b hover:bg-gray-50';
          tr.innerHTML = \`
            <td class="px-4 py-2">\${match.id}</td>
            <td class="px-4 py-2">\${match.fromName}</td>
            <td class="px-4 py-2">\${match.toName}</td>
            <td class="px-4 py-2">
              <span class="px-2 py-1 rounded text-sm \${match.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : match.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                \${match.status}
              </span>
            </td>
            <td class="px-4 py-2">\${new Date(match.createdAt).toLocaleDateString()}</td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('매칭 목록 로드 실패:', err);
      }
    }

    // 관리자 통계 로드
    async function loadAdminStats() {
      try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        const container = document.getElementById('adminStatsContainer');
        container.innerHTML = \`
          <div class="bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg p-6 shadow">
            <i class="fas fa-users text-4xl text-pink-600 mb-2"></i>
            <p class="text-3xl font-bold text-gray-800">\${stats.totalProfiles}</p>
            <p class="text-gray-600">전체 회원 수</p>
          </div>
          <div class="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-6 shadow">
            <i class="fas fa-heart text-4xl text-blue-600 mb-2"></i>
            <p class="text-3xl font-bold text-gray-800">\${stats.totalMatches}</p>
            <p class="text-gray-600">총 매칭 수</p>
          </div>
          <div class="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-6 shadow">
            <i class="fas fa-venus-mars text-4xl text-purple-600 mb-2"></i>
            <p class="text-xl font-bold text-gray-800">남성: \${stats.byGender.male}</p>
            <p class="text-xl font-bold text-gray-800">여성: \${stats.byGender.female}</p>
          </div>
          <div class="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-6 shadow">
            <i class="fas fa-chart-pie text-4xl text-green-600 mb-2"></i>
            <p class="text-lg font-bold text-gray-800">40대: \${stats.byAge['40s']}</p>
            <p class="text-lg font-bold text-gray-800">50대: \${stats.byAge['50s']}</p>
            <p class="text-lg font-bold text-gray-800">60대: \${stats.byAge['60s']}</p>
          </div>
        \`;
      } catch (err) {
        console.error('통계 로드 실패:', err);
      }
    }

    // 공지사항 목록 로드
    async function loadNotices() {
      try {
        const response = await fetch('/api/notices');
        const data = await response.json();
        const tbody = document.getElementById('noticesTableBody');
        tbody.innerHTML = '';
        
        data.notices.forEach(notice => {
          const tr = document.createElement('tr');
          tr.className = 'border-b hover:bg-gray-50';
          tr.innerHTML = \`
            <td class="px-4 py-2">\${notice.id}</td>
            <td class="px-4 py-2">\${notice.title}</td>
            <td class="px-4 py-2">
              \${notice.important ? '<i class="fas fa-star text-yellow-500"></i>' : ''}
            </td>
            <td class="px-4 py-2">\${new Date(notice.createdAt).toLocaleDateString()}</td>
            <td class="px-4 py-2">
              <button onclick="editNotice(\${notice.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                <i class="fas fa-edit"></i> 수정
              </button>
              <button onclick="deleteNotice(\${notice.id})" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i> 삭제
              </button>
            </td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('공지사항 로드 실패:', err);
      }
    }

    // 공지사항 폼 표시
    function showNoticeForm() {
      document.getElementById('noticeFormContainer').classList.remove('hidden');
      document.getElementById('noticeForm').reset();
      document.getElementById('editNoticeId').value = '';
    }

    // 공지사항 폼 숨기기
    function hideNoticeForm() {
      document.getElementById('noticeFormContainer').classList.add('hidden');
    }

    // 공지사항 저장
    document.getElementById('noticeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('editNoticeId').value;
      const data = {
        title: document.getElementById('noticeTitle').value,
        content: document.getElementById('noticeContent').value,
        important: document.getElementById('noticeImportant').checked
      };
      
      try {
        const url = id ? \`/api/admin/notices/\${id}\` : '/api/admin/notices';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Basic \${authToken}\`
          },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          hideNoticeForm();
          loadNotices();
        }
      } catch (err) {
        alert('저장 실패');
      }
    });

    // 공지사항 수정
    async function editNotice(id) {
      try {
        const response = await fetch('/api/notices');
        const data = await response.json();
        const notice = data.notices.find(n => n.id === id);
        
        if (notice) {
          document.getElementById('editNoticeId').value = notice.id;
          document.getElementById('noticeTitle').value = notice.title;
          document.getElementById('noticeContent').value = notice.content;
          document.getElementById('noticeImportant').checked = notice.important;
          showNoticeForm();
        }
      } catch (err) {
        alert('공지사항 불러오기 실패');
      }
    }

    // 공지사항 삭제
    async function deleteNotice(id) {
      if (!confirm('정말 삭제하시겠습니까?')) return;
      
      try {
        const response = await fetch(\`/api/admin/notices/\${id}\`, {
          method: 'DELETE',
          headers: { 'Authorization': \`Basic \${authToken}\` }
        });
        
        if (response.ok) {
          loadNotices();
        }
      } catch (err) {
        alert('삭제 실패');
      }
    }
  </script>
</body>
</html>`;
}

function getNoticesPageHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>공지사항 - Couple Gate</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-pink-300 via-red-300 to-purple-400 min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <a href="/" class="text-white hover:text-pink-100">
        <i class="fas fa-arrow-left"></i> 메인으로 돌아가기
      </a>
    </div>

    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-6 md:p-8">
      <h1 class="text-3xl font-bold text-center mb-8 text-pink-600">
        <i class="fas fa-bell"></i> 공지사항
      </h1>

      <div id="noticesContainer" class="space-y-4">
      </div>
    </div>
  </div>

  <script>
    async function loadNotices() {
      try {
        const response = await fetch('/api/notices');
        const data = await response.json();
        const container = document.getElementById('noticesContainer');
        container.innerHTML = '';
        
        if (data.notices.length === 0) {
          container.innerHTML = '<p class="text-center text-gray-500">등록된 공지사항이 없습니다.</p>';
          return;
        }
        
        data.notices.forEach(notice => {
          const div = document.createElement('div');
          div.className = \`border rounded-lg p-4 \${notice.important ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}\`;
          div.innerHTML = \`
            <div class="flex items-start">
              \${notice.important ? '<i class="fas fa-star text-yellow-500 mt-1 mr-2"></i>' : '<i class="fas fa-bell text-pink-500 mt-1 mr-2"></i>'}
              <div class="flex-1">
                <h3 class="font-bold text-lg mb-2">\${notice.title}</h3>
                <p class="text-gray-700 whitespace-pre-wrap">\${notice.content}</p>
                <p class="text-sm text-gray-500 mt-2">
                  <i class="fas fa-calendar"></i> \${new Date(notice.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          \`;
          container.appendChild(div);
        });
      } catch (err) {
        console.error('공지사항 로드 실패:', err);
      }
    }

    loadNotices();
  </script>
</body>
</html>`;
}

export default app;
