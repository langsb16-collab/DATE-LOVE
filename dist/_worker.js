// Couple Gate - 국제 연애·결혼 매칭 플랫폼
const profiles = new Map();
const matches = new Map();
let profileIdCounter = 1;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 메인 페이지
    if (path === '/') {
      return new Response(getHomePage(), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    // 프로필 등록 API
    if (path === '/api/register' && request.method === 'POST') {
      try {
        const data = await request.json();
        const { name, age, gender, country, about, interests } = data;

        if (!name || !age || !gender || !country) {
          return new Response(JSON.stringify({ error: '필수 정보를 입력해주세요' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const profile = {
          id: profileIdCounter++,
          name,
          age: parseInt(age),
          gender,
          country,
          about: about || '',
          interests: interests || '',
          createdAt: new Date().toISOString()
        };

        profiles.set(profile.id, profile);

        return new Response(JSON.stringify({
          success: true,
          profile
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: '서버 오류' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // 프로필 목록 조회 API
    if (path === '/api/profiles') {
      const gender = url.searchParams.get('gender');
      const country = url.searchParams.get('country');
      
      let profileList = Array.from(profiles.values());
      
      if (gender) {
        profileList = profileList.filter(p => p.gender !== gender);
      }
      
      if (country) {
        profileList = profileList.filter(p => p.country !== country);
      }

      return new Response(JSON.stringify({ profiles: profileList }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 매칭 요청 API
    if (path === '/api/match' && request.method === 'POST') {
      try {
        const data = await request.json();
        const { fromId, toId } = data;

        if (!profiles.has(fromId) || !profiles.has(toId)) {
          return new Response(JSON.stringify({ error: '프로필을 찾을 수 없습니다' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const matchKey = `${fromId}-${toId}`;
        matches.set(matchKey, {
          fromId,
          toId,
          createdAt: new Date().toISOString()
        });

        return new Response(JSON.stringify({
          success: true,
          message: '매칭 요청을 보냈습니다!'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: '서버 오류' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // 통계 API
    if (path === '/api/stats') {
      const stats = {
        totalProfiles: profiles.size,
        totalMatches: matches.size,
        byGender: {
          male: Array.from(profiles.values()).filter(p => p.gender === 'male').length,
          female: Array.from(profiles.values()).filter(p => p.gender === 'female').length
        },
        byAgeGroup: {
          '40s': Array.from(profiles.values()).filter(p => p.age >= 40 && p.age < 50).length,
          '50s': Array.from(profiles.values()).filter(p => p.age >= 50 && p.age < 60).length,
          '60s': Array.from(profiles.values()).filter(p => p.age >= 60).length
        }
      };

      return new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

function getHomePage() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Couple Gate - 국경을 넘어 사랑을 연결하는 국제 연애·결혼 매칭 플랫폼</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    /* 스크롤 부드럽게 */
    html {
      scroll-behavior: smooth;
    }
    
    /* 모바일 최적화 */
    @media (max-width: 640px) {
      .tab-button {
        font-size: 0.875rem;
        padding: 0.625rem 0.5rem;
      }
    }
    
    /* 반응형 컨테이너 */
    .responsive-container {
      max-height: calc(100vh - 280px);
      overflow-y: auto;
    }
    
    /* 스크롤바 스타일 */
    .responsive-container::-webkit-scrollbar {
      width: 8px;
    }
    
    .responsive-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .responsive-container::-webkit-scrollbar-thumb {
      background: #ec4899;
      border-radius: 10px;
    }
    
    .responsive-container::-webkit-scrollbar-thumb:hover {
      background: #db2777;
    }
  </style>
</head>
<body class="bg-gradient-to-br from-pink-400 via-red-400 to-purple-500 min-h-screen overflow-x-hidden">
  <div class="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
    <!-- 헤더 -->
    <header class="text-center text-white mb-6 sm:mb-8">
      <!-- 언어 선택 -->
      <div class="flex justify-end mb-3 sm:mb-4">
        <select id="language-selector" onchange="changeLanguage(this.value)" 
          class="bg-white text-gray-800 border-2 border-pink-300 rounded-lg px-3 py-2 text-sm font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer hover:bg-pink-50 transition">
          <option value="ko" class="text-gray-800">🇰🇷 한국어</option>
          <option value="en" class="text-gray-800">🇺🇸 English</option>
          <option value="zh" class="text-gray-800">🇨🇳 中文</option>
          <option value="ja" class="text-gray-800">🇯🇵 日本語</option>
          <option value="vi" class="text-gray-800">🇻🇳 Tiếng Việt</option>
          <option value="ar" class="text-gray-800">🇸🇦 العربية</option>
        </select>
      </div>
      
      <!-- 제목 - 30% 축소 -->
      <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3">
        <i class="fas fa-heart text-xl sm:text-2xl md:text-3xl lg:text-4xl"></i> 
        <span id="site-title">Couple Gate</span>
      </h1>
      
      <!-- 부제목 - 20% 축소 -->
      <p class="text-sm sm:text-base md:text-lg lg:text-xl mb-1.5 sm:mb-2 opacity-95" id="site-subtitle">
        국경을 넘어 사랑을 연결하는 국제 연애·결혼 매칭 플랫폼
      </p>
      
      <!-- 타겟 설명 - 굵은 글씨, 검정색 -->
      <p class="text-sm sm:text-base md:text-lg font-bold text-gray-900" id="site-target">
        40대·50대·60대 싱글·돌싱 글로벌 국제 연애·결혼
      </p>
    </header>

    <!-- 탭 메뉴 -->
    <div class="max-w-6xl mx-auto mb-4 sm:mb-6">
      <div class="flex flex-col sm:flex-row gap-2 bg-white/20 p-1 sm:p-1.5 rounded-lg backdrop-blur-sm">
        <button onclick="showTab('register')" id="tab-register" class="tab-button flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-white transition bg-white/30 text-sm sm:text-base">
          <i class="fas fa-user-plus"></i> <span id="tab-register-text">프로필 등록</span>
        </button>
        <button onclick="showTab('browse')" id="tab-browse" class="tab-button flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-white transition hover:bg-white/20 text-sm sm:text-base">
          <i class="fas fa-search"></i> <span id="tab-browse-text">프로필 찾기</span>
        </button>
        <button onclick="showTab('stats')" id="tab-stats" class="tab-button flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-white transition hover:bg-white/20 text-sm sm:text-base">
          <i class="fas fa-chart-bar"></i> <span id="tab-stats-text">통계</span>
        </button>
      </div>
    </div>

    <!-- 프로필 등록 탭 -->
    <div id="content-register" class="max-w-4xl mx-auto">
      <div class="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 responsive-container">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
          <i class="fas fa-user-plus text-pink-500"></i> <span id="register-title">프로필 등록</span>
        </h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <label class="block text-gray-700 font-semibold mb-2 text-sm sm:text-base" id="label-name">이름 *</label>
            <input type="text" id="name" placeholder="홍길동" 
              class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm sm:text-base" />
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2 text-sm sm:text-base" id="label-age">나이 *</label>
            <input type="number" id="age" placeholder="45" min="40" max="70"
              class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm sm:text-base" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <label class="block text-gray-700 font-semibold mb-2 text-sm sm:text-base" id="label-gender">성별 *</label>
            <select id="gender" class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm sm:text-base">
              <option value="" id="gender-select">선택하세요</option>
              <option value="male" id="gender-male">남성</option>
              <option value="female" id="gender-female">여성</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2 text-sm sm:text-base" id="label-country">국가 *</label>
            <select id="country" class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm sm:text-base">
              <option value="" id="country-select">선택하세요</option>
              <option value="한국">🇰🇷 한국</option>
              <option value="미국">🇺🇸 미국</option>
              <option value="일본">🇯🇵 일본</option>
              <option value="중국">🇨🇳 중국</option>
              <option value="베트남">🇻🇳 베트남</option>
              <option value="필리핀">🇵🇭 필리핀</option>
              <option value="태국">🇹🇭 태국</option>
              <option value="캐나다">🇨🇦 캐나다</option>
              <option value="호주">🇦🇺 호주</option>
              <option value="기타">🌏 기타</option>
            </select>
          </div>
        </div>

        <div class="mb-3 sm:mb-4">
          <label class="block text-gray-700 font-semibold mb-2 text-sm sm:text-base" id="label-about">자기소개</label>
          <textarea id="about" rows="3" placeholder="자신을 소개해주세요..."
            class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm sm:text-base"></textarea>
        </div>

        <div class="mb-4 sm:mb-6">
          <label class="block text-gray-700 font-semibold mb-2 text-sm sm:text-base" id="label-interests">관심사</label>
          <input type="text" id="interests" placeholder="여행, 요리, 운동, 영화..." 
            class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm sm:text-base" />
        </div>

        <button onclick="registerProfile()" 
          class="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg hover:from-pink-600 hover:to-red-600 transition duration-200 text-base sm:text-lg">
          <i class="fas fa-heart"></i> <span id="btn-register">프로필 등록하기</span>
        </button>

        <div id="register-result" class="mt-4 sm:mt-6 hidden"></div>
      </div>
    </div>

    <!-- 프로필 찾기 탭 -->
    <div id="content-browse" class="max-w-6xl mx-auto hidden">
      <div class="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
          <i class="fas fa-search text-pink-500"></i> <span id="browse-title">프로필 찾기</span>
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <label class="block text-gray-700 font-semibold mb-2 text-sm sm:text-base" id="filter-gender-label">성별 필터</label>
            <select id="filter-gender" onchange="loadProfiles()" class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base">
              <option value="" id="filter-all">전체</option>
              <option value="male" id="filter-male">남성 찾기</option>
              <option value="female" id="filter-female">여성 찾기</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2 text-sm sm:text-base" id="filter-country-label">국가 필터</label>
            <select id="filter-country" onchange="loadProfiles()" class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base">
              <option value="">전체</option>
              <option value="한국">🇰🇷 한국</option>
              <option value="미국">🇺🇸 미국</option>
              <option value="일본">🇯🇵 일본</option>
              <option value="중국">🇨🇳 중국</option>
              <option value="베트남">🇻🇳 베트남</option>
            </select>
          </div>
        </div>

        <div id="profiles-list" class="responsive-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <!-- 프로필 카드들이 여기에 표시됩니다 -->
        </div>
      </div>
    </div>

    <!-- 통계 탭 -->
    <div id="content-stats" class="max-w-6xl mx-auto hidden">
      <div class="responsive-container">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div class="bg-white rounded-xl shadow-xl p-4 sm:p-6 text-center">
            <i class="fas fa-users text-3xl sm:text-4xl md:text-5xl text-pink-500 mb-2 sm:mb-3"></i>
            <p class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800" id="stat-total">0</p>
            <p class="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base" id="stat-total-label">전체 회원</p>
          </div>
          <div class="bg-white rounded-xl shadow-xl p-4 sm:p-6 text-center">
            <i class="fas fa-heart text-3xl sm:text-4xl md:text-5xl text-red-500 mb-2 sm:mb-3"></i>
            <p class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800" id="stat-matches">0</p>
            <p class="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base" id="stat-matches-label">매칭 성공</p>
          </div>
          <div class="bg-white rounded-xl shadow-xl p-4 sm:p-6 text-center">
            <i class="fas fa-male text-3xl sm:text-4xl md:text-5xl text-blue-500 mb-2 sm:mb-3"></i>
            <p class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800" id="stat-male">0</p>
            <p class="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base" id="stat-male-label">남성 회원</p>
          </div>
          <div class="bg-white rounded-xl shadow-xl p-4 sm:p-6 text-center">
            <i class="fas fa-female text-3xl sm:text-4xl md:text-5xl text-purple-500 mb-2 sm:mb-3"></i>
            <p class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800" id="stat-female">0</p>
            <p class="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base" id="stat-female-label">여성 회원</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div class="bg-white rounded-xl shadow-xl p-4 sm:p-6">
            <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
              <i class="fas fa-birthday-cake text-pink-500"></i> <span id="age-group-label">연령대별</span>
            </h3>
            <div class="space-y-2 sm:space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-700 text-sm sm:text-base">40대</span>
                <span class="text-xl sm:text-2xl font-bold text-pink-500" id="stat-40s">0</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700 text-sm sm:text-base">50대</span>
                <span class="text-xl sm:text-2xl font-bold text-red-500" id="stat-50s">0</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700 text-sm sm:text-base">60대+</span>
                <span class="text-xl sm:text-2xl font-bold text-purple-500" id="stat-60s">0</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-xl p-4 sm:p-6 md:col-span-2">
            <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
              <i class="fas fa-info-circle text-blue-500"></i> <span id="service-intro-label">서비스 소개</span>
            </h3>
            <div class="space-y-1.5 sm:space-y-2 text-gray-700 text-sm sm:text-base">
              <p><i class="fas fa-check text-green-500"></i> <span id="intro-1">40대, 50대, 60대 싱글·돌싱 전문 매칭</span></p>
              <p><i class="fas fa-check text-green-500"></i> <span id="intro-2">글로벌 국제 연애·결혼 매칭</span></p>
              <p><i class="fas fa-check text-green-500"></i> <span id="intro-3">안전하고 신뢰할 수 있는 플랫폼</span></p>
              <p><i class="fas fa-check text-green-500"></i> <span id="intro-4">24/7 실시간 매칭 서비스</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 푸터 -->
    <footer class="text-center text-white mt-6 sm:mt-8 opacity-75">
      <p class="text-xs sm:text-sm">
        <i class="fas fa-server"></i> Powered by Cloudflare Pages
      </p>
    </footer>
  </div>

  <script>
    let currentProfileId = null;
    let currentLang = 'ko';

    // 다국어 텍스트
    const translations = {
      ko: {
        siteTitle: 'Couple Gate',
        siteSubtitle: '국경을 넘어 사랑을 연결하는 국제 연애·결혼 매칭 플랫폼',
        siteTarget: '40대·50대·60대 싱글·돌싱 글로벌 국제 연애·결혼',
        tabRegister: '프로필 등록',
        tabBrowse: '프로필 찾기',
        tabStats: '통계',
        registerTitle: '프로필 등록',
        labelName: '이름 *',
        labelAge: '나이 *',
        labelGender: '성별 *',
        labelCountry: '국가 *',
        labelAbout: '자기소개',
        labelInterests: '관심사',
        btnRegister: '프로필 등록하기',
        genderSelect: '선택하세요',
        genderMale: '남성',
        genderFemale: '여성',
        countrySelect: '선택하세요',
        browseTitle: '프로필 찾기',
        filterGenderLabel: '성별 필터',
        filterCountryLabel: '국가 필터',
        filterAll: '전체',
        filterMale: '남성 찾기',
        filterFemale: '여성 찾기',
        statTotalLabel: '전체 회원',
        statMatchesLabel: '매칭 성공',
        statMaleLabel: '남성 회원',
        statFemaleLabel: '여성 회원',
        ageGroupLabel: '연령대별',
        serviceIntroLabel: '서비스 소개',
        intro1: '40대, 50대, 60대 싱글·돌싱 전문 매칭',
        intro2: '글로벌 국제 연애·결혼 매칭',
        intro3: '안전하고 신뢰할 수 있는 플랫폼',
        intro4: '24/7 실시간 매칭 서비스'
      },
      en: {
        siteTitle: 'Couple Gate',
        siteSubtitle: 'Your Gateway to International Love & Marriage',
        siteTarget: '40s·50s·60s Singles & Divorced - Global Dating',
        tabRegister: 'Register',
        tabBrowse: 'Browse',
        tabStats: 'Statistics',
        registerTitle: 'Profile Registration',
        labelName: 'Name *',
        labelAge: 'Age *',
        labelGender: 'Gender *',
        labelCountry: 'Country *',
        labelAbout: 'About Me',
        labelInterests: 'Interests',
        btnRegister: 'Register Profile',
        genderSelect: 'Select',
        genderMale: 'Male',
        genderFemale: 'Female',
        countrySelect: 'Select',
        browseTitle: 'Find Profiles',
        filterGenderLabel: 'Gender Filter',
        filterCountryLabel: 'Country Filter',
        filterAll: 'All',
        filterMale: 'Find Men',
        filterFemale: 'Find Women',
        statTotalLabel: 'Total Members',
        statMatchesLabel: 'Matches',
        statMaleLabel: 'Male Members',
        statFemaleLabel: 'Female Members',
        ageGroupLabel: 'By Age',
        serviceIntroLabel: 'Our Services',
        intro1: '40s, 50s, 60s Singles & Divorced Matching',
        intro2: 'Global International Dating & Marriage',
        intro3: 'Safe and Reliable Platform',
        intro4: '24/7 Real-time Matching Service'
      },
      zh: {
        siteTitle: 'Couple Gate',
        siteSubtitle: '跨越国界，连接爱情的国际交友婚恋平台',
        siteTarget: '40岁·50岁·60岁单身·离异者国际交友婚恋',
        tabRegister: '注册资料',
        tabBrowse: '查找',
        tabStats: '统计',
        registerTitle: '注册个人资料',
        labelName: '姓名 *',
        labelAge: '年龄 *',
        labelGender: '性别 *',
        labelCountry: '国家 *',
        labelAbout: '自我介绍',
        labelInterests: '兴趣爱好',
        btnRegister: '注册资料',
        genderSelect: '请选择',
        genderMale: '男性',
        genderFemale: '女性',
        countrySelect: '请选择',
        browseTitle: '查找资料',
        filterGenderLabel: '性别筛选',
        filterCountryLabel: '国家筛选',
        filterAll: '全部',
        filterMale: '查找男性',
        filterFemale: '查找女性',
        statTotalLabel: '总会员',
        statMatchesLabel: '配对成功',
        statMaleLabel: '男性会员',
        statFemaleLabel: '女性会员',
        ageGroupLabel: '年龄段',
        serviceIntroLabel: '服务介绍',
        intro1: '40岁、50岁、60岁单身·离异专业配对',
        intro2: '全球国际交友婚恋配对',
        intro3: '安全可靠的平台',
        intro4: '24/7实时配对服务'
      },
      ja: {
        siteTitle: 'Couple Gate',
        siteSubtitle: '国境を越えて愛を繋ぐ国際恋愛・結婚マッチングプラットフォーム',
        siteTarget: '40代・50代・60代シングル・バツイチ国際恋愛・結婚',
        tabRegister: '登録',
        tabBrowse: '検索',
        tabStats: '統計',
        registerTitle: 'プロフィール登録',
        labelName: '名前 *',
        labelAge: '年齢 *',
        labelGender: '性別 *',
        labelCountry: '国 *',
        labelAbout: '自己紹介',
        labelInterests: '趣味',
        btnRegister: 'プロフィール登録',
        genderSelect: '選択してください',
        genderMale: '男性',
        genderFemale: '女性',
        countrySelect: '選択してください',
        browseTitle: 'プロフィール検索',
        filterGenderLabel: '性別フィルター',
        filterCountryLabel: '国フィルター',
        filterAll: 'すべて',
        filterMale: '男性を探す',
        filterFemale: '女性を探す',
        statTotalLabel: '総会員数',
        statMatchesLabel: 'マッチング成功',
        statMaleLabel: '男性会員',
        statFemaleLabel: '女性会員',
        ageGroupLabel: '年齢層別',
        serviceIntroLabel: 'サービス紹介',
        intro1: '40代、50代、60代シングル・バツイチ専門マッチング',
        intro2: 'グローバル国際恋愛・結婚マッチング',
        intro3: '安全で信頼できるプラットフォーム',
        intro4: '24/7リアルタイムマッチングサービス'
      },
      vi: {
        siteTitle: 'Couple Gate',
        siteSubtitle: 'Nền tảng hẹn hò và kết hôn quốc tế vượt biên giới',
        siteTarget: 'Hẹn hò quốc tế cho độc thân 40-50-60 tuổi',
        tabRegister: 'Đăng ký',
        tabBrowse: 'Tìm kiếm',
        tabStats: 'Thống kê',
        registerTitle: 'Đăng ký hồ sơ',
        labelName: 'Tên *',
        labelAge: 'Tuổi *',
        labelGender: 'Giới tính *',
        labelCountry: 'Quốc gia *',
        labelAbout: 'Giới thiệu bản thân',
        labelInterests: 'Sở thích',
        btnRegister: 'Đăng ký hồ sơ',
        genderSelect: 'Chọn',
        genderMale: 'Nam',
        genderFemale: 'Nữ',
        countrySelect: 'Chọn',
        browseTitle: 'Tìm hồ sơ',
        filterGenderLabel: 'Lọc giới tính',
        filterCountryLabel: 'Lọc quốc gia',
        filterAll: 'Tất cả',
        filterMale: 'Tìm nam',
        filterFemale: 'Tìm nữ',
        statTotalLabel: 'Tổng thành viên',
        statMatchesLabel: 'Ghép đôi thành công',
        statMaleLabel: 'Thành viên nam',
        statFemaleLabel: 'Thành viên nữ',
        ageGroupLabel: 'Theo độ tuổi',
        serviceIntroLabel: 'Giới thiệu dịch vụ',
        intro1: 'Chuyên ghép đôi độc thân 40, 50, 60 tuổi',
        intro2: 'Hẹn hò và kết hôn quốc tế toàn cầu',
        intro3: 'Nền tảng an toàn và đáng tin cậy',
        intro4: 'Dịch vụ ghép đôi 24/7'
      },
      ar: {
        siteTitle: 'Couple Gate',
        siteSubtitle: 'منصة التعارف والزواج الدولي عبر الحدود',
        siteTarget: 'مواعدة دولية للعزاب 40-50-60 سنة',
        tabRegister: 'تسجيل',
        tabBrowse: 'بحث',
        tabStats: 'إحصائيات',
        registerTitle: 'تسجيل الملف الشخصي',
        labelName: 'الاسم *',
        labelAge: 'العمر *',
        labelGender: 'الجنس *',
        labelCountry: 'البلد *',
        labelAbout: 'عن نفسي',
        labelInterests: 'الاهتمامات',
        btnRegister: 'تسجيل الملف',
        genderSelect: 'اختر',
        genderMale: 'ذكر',
        genderFemale: 'أنثى',
        countrySelect: 'اختر',
        browseTitle: 'البحث عن ملفات',
        filterGenderLabel: 'فلتر الجنس',
        filterCountryLabel: 'فلتر البلد',
        filterAll: 'الكل',
        filterMale: 'البحث عن رجال',
        filterFemale: 'البحث عن نساء',
        statTotalLabel: 'إجمالي الأعضاء',
        statMatchesLabel: 'التطابقات الناجحة',
        statMaleLabel: 'الأعضاء الذكور',
        statFemaleLabel: 'الأعضاء الإناث',
        ageGroupLabel: 'حسب العمر',
        serviceIntroLabel: 'عن خدماتنا',
        intro1: 'تطابق متخصص للعزاب 40، 50، 60 سنة',
        intro2: 'مواعدة وزواج دولي عالمي',
        intro3: 'منصة آمنة وموثوقة',
        intro4: 'خدمة تطابق على مدار الساعة'
      }
    };

    function changeLanguage(lang) {
      currentLang = lang;
      const t = translations[lang];
      
      // 헤더
      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      document.getElementById('site-target').textContent = t.siteTarget;
      
      // 탭
      document.getElementById('tab-register-text').textContent = t.tabRegister;
      document.getElementById('tab-browse-text').textContent = t.tabBrowse;
      document.getElementById('tab-stats-text').textContent = t.tabStats;
      
      // 등록 폼
      document.getElementById('register-title').textContent = t.registerTitle;
      document.getElementById('label-name').textContent = t.labelName;
      document.getElementById('label-age').textContent = t.labelAge;
      document.getElementById('label-gender').textContent = t.labelGender;
      document.getElementById('label-country').textContent = t.labelCountry;
      document.getElementById('label-about').textContent = t.labelAbout;
      document.getElementById('label-interests').textContent = t.labelInterests;
      document.getElementById('btn-register').textContent = t.btnRegister;
      document.getElementById('gender-select').textContent = t.genderSelect;
      document.getElementById('gender-male').textContent = t.genderMale;
      document.getElementById('gender-female').textContent = t.genderFemale;
      document.getElementById('country-select').textContent = t.countrySelect;
      
      // 찾기
      document.getElementById('browse-title').textContent = t.browseTitle;
      document.getElementById('filter-gender-label').textContent = t.filterGenderLabel;
      document.getElementById('filter-country-label').textContent = t.filterCountryLabel;
      document.getElementById('filter-all').textContent = t.filterAll;
      document.getElementById('filter-male').textContent = t.filterMale;
      document.getElementById('filter-female').textContent = t.filterFemale;
      
      // 통계
      document.getElementById('stat-total-label').textContent = t.statTotalLabel;
      document.getElementById('stat-matches-label').textContent = t.statMatchesLabel;
      document.getElementById('stat-male-label').textContent = t.statMaleLabel;
      document.getElementById('stat-female-label').textContent = t.statFemaleLabel;
      document.getElementById('age-group-label').textContent = t.ageGroupLabel;
      document.getElementById('service-intro-label').textContent = t.serviceIntroLabel;
      document.getElementById('intro-1').textContent = t.intro1;
      document.getElementById('intro-2').textContent = t.intro2;
      document.getElementById('intro-3').textContent = t.intro3;
      document.getElementById('intro-4').textContent = t.intro4;
      
      // 아랍어는 RTL
      if (lang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
      }
    }

    function showTab(tab) {
      document.getElementById('content-register').classList.add('hidden');
      document.getElementById('content-browse').classList.add('hidden');
      document.getElementById('content-stats').classList.add('hidden');

      document.getElementById('tab-register').classList.remove('bg-white/30');
      document.getElementById('tab-browse').classList.remove('bg-white/30');
      document.getElementById('tab-stats').classList.remove('bg-white/30');

      document.getElementById('content-' + tab).classList.remove('hidden');
      document.getElementById('tab-' + tab).classList.add('bg-white/30');

      if (tab === 'browse') {
        loadProfiles();
      } else if (tab === 'stats') {
        loadStats();
      }
    }

    async function registerProfile() {
      const name = document.getElementById('name').value;
      const age = document.getElementById('age').value;
      const gender = document.getElementById('gender').value;
      const country = document.getElementById('country').value;
      const about = document.getElementById('about').value;
      const interests = document.getElementById('interests').value;

      if (!name || !age || !gender || !country) {
        showMessage('register-result', '필수 정보를 모두 입력해주세요', 'error');
        return;
      }

      if (age < 40 || age > 70) {
        showMessage('register-result', '40세~70세만 가입 가능합니다', 'error');
        return;
      }

      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, age, gender, country, about, interests })
        });

        const data = await response.json();

        if (response.ok) {
          currentProfileId = data.profile.id;
          showMessage('register-result', 
            \`✅ 프로필이 등록되었습니다! 이제 "프로필 찾기" 탭에서 매칭을 시작하세요.\`, 
            'success');
          
          document.getElementById('name').value = '';
          document.getElementById('age').value = '';
          document.getElementById('gender').value = '';
          document.getElementById('country').value = '';
          document.getElementById('about').value = '';
          document.getElementById('interests').value = '';
        } else {
          showMessage('register-result', data.error || '등록 실패', 'error');
        }
      } catch (err) {
        showMessage('register-result', '서버 연결 실패', 'error');
      }
    }

    async function loadProfiles() {
      const gender = document.getElementById('filter-gender').value;
      const country = document.getElementById('filter-country').value;
      
      try {
        let url = '/api/profiles?';
        if (gender) url += 'gender=' + gender + '&';
        if (country) url += 'country=' + country;

        const response = await fetch(url);
        const data = await response.json();

        const container = document.getElementById('profiles-list');
        
        if (data.profiles.length === 0) {
          container.innerHTML = \`
            <div class="col-span-full text-center py-8 sm:py-12">
              <i class="fas fa-search text-4xl sm:text-5xl md:text-6xl text-gray-300 mb-3 sm:mb-4"></i>
              <p class="text-gray-500 text-base sm:text-lg">프로필이 없습니다</p>
            </div>
          \`;
          return;
        }

        container.innerHTML = data.profiles.map(profile => \`
          <div class="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
            <div class="flex items-center mb-3 sm:mb-4">
              <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                \${profile.name.charAt(0)}
              </div>
              <div class="ml-3 sm:ml-4">
                <h3 class="text-lg sm:text-xl font-bold text-gray-800">\${profile.name}</h3>
                <p class="text-sm sm:text-base text-gray-600">\${profile.age}세 · \${profile.gender === 'male' ? '남성' : '여성'}</p>
              </div>
            </div>
            
            <div class="mb-2 sm:mb-3">
              <p class="text-xs sm:text-sm text-gray-500 mb-1"><i class="fas fa-globe"></i> 국가</p>
              <p class="text-sm sm:text-base text-gray-800 font-semibold">\${profile.country}</p>
            </div>
            
            \${profile.about ? \`
              <div class="mb-2 sm:mb-3">
                <p class="text-xs sm:text-sm text-gray-500 mb-1"><i class="fas fa-user"></i> 소개</p>
                <p class="text-xs sm:text-sm text-gray-700">\${profile.about}</p>
              </div>
            \` : ''}
            
            \${profile.interests ? \`
              <div class="mb-3 sm:mb-4">
                <p class="text-xs sm:text-sm text-gray-500 mb-1"><i class="fas fa-heart"></i> 관심사</p>
                <p class="text-xs sm:text-sm text-gray-700">\${profile.interests}</p>
              </div>
            \` : ''}
            
            <button onclick="sendMatch(\${profile.id}, '\${profile.name}')" 
              class="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold py-2 px-3 sm:px-4 rounded-lg hover:from-pink-600 hover:to-red-600 transition text-sm sm:text-base">
              <i class="fas fa-heart"></i> 매칭 요청
            </button>
          </div>
        \`).join('');
      } catch (err) {
        console.error('프로필 로드 실패:', err);
      }
    }

    async function sendMatch(toId, name) {
      if (!currentProfileId) {
        alert('먼저 프로필을 등록해주세요!');
        showTab('register');
        return;
      }

      try {
        const response = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromId: currentProfileId, toId })
        });

        const data = await response.json();

        if (response.ok) {
          alert(\`✅ \${name}님께 매칭 요청을 보냈습니다!\`);
        } else {
          alert(data.error || '매칭 실패');
        }
      } catch (err) {
        alert('서버 연결 실패');
      }
    }

    async function loadStats() {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        document.getElementById('stat-total').textContent = data.totalProfiles;
        document.getElementById('stat-matches').textContent = data.totalMatches;
        document.getElementById('stat-male').textContent = data.byGender.male;
        document.getElementById('stat-female').textContent = data.byGender.female;
        document.getElementById('stat-40s').textContent = data.byAgeGroup['40s'];
        document.getElementById('stat-50s').textContent = data.byAgeGroup['50s'];
        document.getElementById('stat-60s').textContent = data.byAgeGroup['60s'];
      } catch (err) {
        console.error('통계 로드 실패:', err);
      }
    }

    function showMessage(elementId, message, type) {
      const element = document.getElementById(elementId);
      element.classList.remove('hidden');
      
      if (type === 'success') {
        element.innerHTML = \`
          <div class="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
            <p class="text-green-800 text-sm sm:text-base">\${message}</p>
          </div>
        \`;
      } else {
        element.innerHTML = \`
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <p class="text-red-800 text-sm sm:text-base"><i class="fas fa-exclamation-circle"></i> \${message}</p>
          </div>
        \`;
      }
    }

    // 페이지 로드시 초기화
    loadStats();
  </script>
</body>
</html>`;
}

function get404Page() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>404 - Not Found</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center">
  <div class="text-center px-4">
    <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold text-red-600 mb-4">404</h1>
    <p class="text-lg sm:text-xl md:text-2xl text-gray-700 mb-4">단축 URL을 찾을 수 없습니다</p>
    <a href="/" class="text-blue-600 hover:underline text-base sm:text-lg">홈으로 돌아가기</a>
  </div>
</body>
</html>`;
}
