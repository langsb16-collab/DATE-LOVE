import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS 활성화
app.use('/api/*', cors());

// 메모리 저장소 (실제로는 D1이나 KV 사용 권장)
interface Profile {
  id: number;
  name: string;
  age: number;
  gender: '남성' | '여성';
  country: string;
  about: string;
  interests: string;
  createdAt: string;
}

interface Match {
  id: number;
  fromId: number;
  toId: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  important: boolean;
}

const profiles = new Map<number, Profile>();
const matches = new Map<number, Match>();
const notices = new Map<number, Notice>();
let profileIdCounter = 1;
let matchIdCounter = 1;
let noticeIdCounter = 1;

// 관리자 인증 미들웨어
const adminAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || authHeader !== 'Basic YWRtaW46YWRtaW4xMjM0') { // admin:admin1234 Base64
    return c.json({ error: '인증 실패' }, 401);
  }
  await next();
};

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

    const profile: Profile = {
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

    const match: Match = {
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
  
  const notice: Notice = {
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
