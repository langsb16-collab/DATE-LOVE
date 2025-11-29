// Couple Gate 플랫폼 - 완전한 구현 (관리자 페이지 + 공지사항 포함)

const profiles = new Map();
const matches = new Map();
const notices = new Map();
let profileIdCounter = 1;
let matchIdCounter = 1;
let noticeIdCounter = 1;

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // OPTIONS 요청 처리 (CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API 라우팅
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, url);
    }

    // 페이지 라우팅
    if (url.pathname === '/admin') {
      return new Response(getAdminPageHTML(), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    if (url.pathname === '/notices') {
      return new Response(getNoticesPageHTML(), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    // 메인 페이지
    return new Response(getMainPageHTML(), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};

async function handleAPI(request, url) {
  const path = url.pathname;

  try {
    // 관리자 로그인
    if (path === '/api/admin/login' && request.method === 'POST') {
      const { username, password } = await request.json();
      if (username === 'admin' && password === 'admin1234') {
        return jsonResponse({ success: true, token: 'YWRtaW46YWRtaW4xMjM0' });
      }
      return jsonResponse({ error: '아이디 또는 비밀번호가 틀립니다' }, 401);
    }

    // 프로필 등록
    if (path === '/api/register' && request.method === 'POST') {
      const data = await request.json();
      if (!data.name || !data.age || !data.gender || !data.country) {
        return jsonResponse({ error: '필수 정보를 입력해주세요' }, 400);
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
      return jsonResponse({ success: true, profile });
    }

    // 프로필 목록 조회
    if (path === '/api/profiles' && request.method === 'GET') {
      const gender = url.searchParams.get('gender');
      const country = url.searchParams.get('country');
      let result = Array.from(profiles.values());
      if (gender) result = result.filter(p => p.gender === gender);
      if (country) result = result.filter(p => p.country === country);
      return jsonResponse({ profiles: result });
    }

    // 매칭 요청
    if (path === '/api/match' && request.method === 'POST') {
      const { fromId, toId } = await request.json();
      const fromProfile = profiles.get(fromId);
      const toProfile = profiles.get(toId);
      if (!fromProfile || !toProfile) {
        return jsonResponse({ error: '프로필을 찾을 수 없습니다' }, 404);
      }
      const match = {
        id: matchIdCounter++,
        fromId,
        toId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      matches.set(match.id, match);
      return jsonResponse({ success: true, match });
    }

    // 통계 조회
    if (path === '/api/stats' && request.method === 'GET') {
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
      return jsonResponse(stats);
    }

    // 관리자 API - 인증 확인
    const authHeader = request.headers.get('Authorization');
    const isAdmin = authHeader === 'Basic YWRtaW46YWRtaW4xMjM0';

    // 회원 관리
    if (path === '/api/admin/members' && request.method === 'GET') {
      if (!isAdmin) return jsonResponse({ error: '인증 실패' }, 401);
      return jsonResponse({ members: Array.from(profiles.values()) });
    }

    if (path.startsWith('/api/admin/members/') && request.method === 'DELETE') {
      if (!isAdmin) return jsonResponse({ error: '인증 실패' }, 401);
      const id = parseInt(path.split('/')[4]);
      if (!profiles.has(id)) {
        return jsonResponse({ error: '회원을 찾을 수 없습니다' }, 404);
      }
      profiles.delete(id);
      return jsonResponse({ success: true });
    }

    // 매칭 관리
    if (path === '/api/admin/matches' && request.method === 'GET') {
      if (!isAdmin) return jsonResponse({ error: '인증 실패' }, 401);
      const matchArray = Array.from(matches.values()).map(match => {
        const fromProfile = profiles.get(match.fromId);
        const toProfile = profiles.get(match.toId);
        return {
          ...match,
          fromName: fromProfile?.name || '알 수 없음',
          toName: toProfile?.name || '알 수 없음'
        };
      });
      return jsonResponse({ matches: matchArray });
    }

    // 공지사항 조회
    if (path === '/api/notices' && request.method === 'GET') {
      return jsonResponse({ notices: Array.from(notices.values()).reverse() });
    }

    // 공지사항 생성
    if (path === '/api/admin/notices' && request.method === 'POST') {
      if (!isAdmin) return jsonResponse({ error: '인증 실패' }, 401);
      const { title, content, important } = await request.json();
      const notice = {
        id: noticeIdCounter++,
        title,
        content,
        important: important || false,
        createdAt: new Date().toISOString()
      };
      notices.set(notice.id, notice);
      return jsonResponse({ success: true, notice });
    }

    // 공지사항 삭제
    if (path.startsWith('/api/admin/notices/') && request.method === 'DELETE') {
      if (!isAdmin) return jsonResponse({ error: '인증 실패' }, 401);
      const id = parseInt(path.split('/')[4]);
      if (!notices.has(id)) {
        return jsonResponse({ error: '공지사항을 찾을 수 없습니다' }, 404);
      }
      notices.delete(id);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  } catch (err) {
    return jsonResponse({ error: '서버 오류' }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// HTML 페이지 함수들은 다음 메시지에서 계속...
function getMainPageHTML() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Couple Gate - 국경을 넘어 사랑을 연결하는 국제 연애·결혼 매칭 플랫폼</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gradient-to-br from-pink-300 via-red-300 to-purple-400 min-h-screen"><div class="container mx-auto px-4 py-4 md:py-8"><div class="text-center text-white mb-6 md:mb-12"><div class="flex justify-end items-center mb-4"><a href="/notices" class="bg-white text-pink-600 px-4 py-2 rounded-lg shadow-lg hover:bg-pink-50 font-bold"><i class="fas fa-bell"></i> <span class="md:inline">공지사항</span></a></div><h1 class="text-3xl md:text-5xl font-bold mb-2 md:mb-4"><i class="fas fa-heart text-2xl md:text-4xl"></i> Couple Gate</h1><p class="text-lg md:text-2xl mb-2">국경을 넘어 사랑을 연결하는 국제 연애·결혼 매칭 플랫폼</p><p class="text-base md:text-xl font-bold text-gray-900">40대·50대·60대 싱글·돌싱 글로벌 국제 연애·결혼</p></div><div class="max-w-4xl mx-auto mb-6"><div class="flex flex-wrap gap-2 justify-center"><button onclick="showTab('register')" class="tab-btn active px-4 md:px-6 py-2 md:py-3 bg-white text-pink-600 rounded-lg font-bold shadow-lg"><i class="fas fa-user-plus"></i> <span class="sm:inline">프로필 등록</span></button><button onclick="showTab('search')" class="tab-btn px-4 md:px-6 py-2 md:py-3 bg-pink-100 text-gray-700 rounded-lg font-bold shadow"><i class="fas fa-search"></i> <span class="sm:inline">프로필 찾기</span></button><button onclick="showTab('stats')" class="tab-btn px-4 md:px-6 py-2 md:py-3 bg-pink-100 text-gray-700 rounded-lg font-bold shadow"><i class="fas fa-chart-bar"></i> <span class="sm:inline">통계</span></button></div></div><div id="register-tab" class="tab-content max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8"><h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4"><i class="fas fa-user-plus text-pink-500"></i> 프로필 등록</h2><form id="registerForm" class="space-y-4"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-gray-700 font-semibold mb-2">이름</label><input type="text" id="name" required class="w-full px-4 py-2 border rounded-lg"></div><div><label class="block text-gray-700 font-semibold mb-2">나이 (40-70세)</label><input type="number" id="age" min="40" max="70" required class="w-full px-4 py-2 border rounded-lg"></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-gray-700 font-semibold mb-2">성별</label><select id="gender" required class="w-full px-4 py-2 border rounded-lg"><option value="">선택하세요</option><option value="남성">남성</option><option value="여성">여성</option></select></div><div><label class="block text-gray-700 font-semibold mb-2">국가</label><select id="country" required class="w-full px-4 py-2 border rounded-lg"><option value="">선택하세요</option><option value="한국">한국</option><option value="미국">미국</option><option value="일본">일본</option><option value="중국">중국</option><option value="베트남">베트남</option></select></div></div><div><label class="block text-gray-700 font-semibold mb-2">자기소개</label><textarea id="about" rows="3" class="w-full px-4 py-2 border rounded-lg"></textarea></div><div><label class="block text-gray-700 font-semibold mb-2">관심사</label><input type="text" id="interests" class="w-full px-4 py-2 border rounded-lg"></div><button type="submit" class="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700"><i class="fas fa-paper-plane"></i> 등록하기</button></form><div id="registerResult" class="mt-4 hidden"></div></div><div id="search-tab" class="tab-content hidden max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8"><h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4"><i class="fas fa-search text-pink-500"></i> 프로필 찾기</h2><div class="flex flex-wrap gap-4 mb-6"><select id="filterGender" class="px-4 py-2 border rounded-lg"><option value="">모든 성별</option><option value="남성">남성</option><option value="여성">여성</option></select><select id="filterCountry" class="px-4 py-2 border rounded-lg"><option value="">모든 국가</option><option value="한국">한국</option><option value="미국">미국</option></select><button onclick="searchProfiles()" class="px-6 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700"><i class="fas fa-search"></i> 검색</button></div><div id="profileResults" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div></div><div id="stats-tab" class="tab-content hidden max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8"><h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4"><i class="fas fa-chart-bar text-pink-500"></i> 통계</h2><div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="statsContainer"></div></div></div><script>function showTab(tab){document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('active','bg-white','text-pink-600');b.classList.add('bg-pink-100','text-gray-700');});document.getElementById(tab+'-tab').classList.remove('hidden');document.querySelector(\`button[onclick="showTab('\${tab}')"]\`).classList.add('active','bg-white','text-pink-600');if(tab==='stats')loadStats();else if(tab==='search')searchProfiles();}document.getElementById('registerForm').addEventListener('submit',async(e)=>{e.preventDefault();const data={name:document.getElementById('name').value,age:document.getElementById('age').value,gender:document.getElementById('gender').value,country:document.getElementById('country').value,about:document.getElementById('about').value,interests:document.getElementById('interests').value};try{const response=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(response.ok){document.getElementById('registerResult').innerHTML=\`<div class="bg-green-50 border border-green-200 rounded-lg p-4"><p class="text-green-800"><i class="fas fa-check-circle"></i> 프로필이 성공적으로 등록되었습니다!</p></div>\`;document.getElementById('registerResult').classList.remove('hidden');document.getElementById('registerForm').reset();}else{throw new Error(result.error);}}catch(err){document.getElementById('registerResult').innerHTML=\`<div class="bg-red-50 border border-red-200 rounded-lg p-4"><p class="text-red-800"><i class="fas fa-exclamation-circle"></i> \${err.message}</p></div>\`;document.getElementById('registerResult').classList.remove('hidden');}});async function searchProfiles(){const gender=document.getElementById('filterGender').value;const country=document.getElementById('filterCountry').value;let url='/api/profiles?';if(gender)url+=\`gender=\${gender}&\`;if(country)url+=\`country=\${country}\`;try{const response=await fetch(url);const data=await response.json();const container=document.getElementById('profileResults');container.innerHTML='';if(data.profiles.length===0){container.innerHTML='<p class="col-span-2 text-center text-gray-500">검색 결과가 없습니다.</p>';return;}data.profiles.forEach(profile=>{const card=document.createElement('div');card.className='bg-pink-50 rounded-lg p-4 shadow';card.innerHTML=\`<div class="flex items-center mb-2"><i class="fas fa-user-circle text-3xl text-pink-500 mr-3"></i><div><h3 class="font-bold text-lg">\${profile.name}</h3><p class="text-sm text-gray-600">\${profile.age}세 · \${profile.gender} · \${profile.country}</p></div></div><p class="text-gray-700 text-sm mb-2">\${profile.about||'자기소개 없음'}</p><p class="text-gray-600 text-sm"><i class="fas fa-heart text-pink-400"></i> \${profile.interests||'관심사 없음'}</p>\`;container.appendChild(card);});}catch(err){console.error('검색 실패:',err);}}async function loadStats(){try{const response=await fetch('/api/stats');const stats=await response.json();const container=document.getElementById('statsContainer');container.innerHTML=\`<div class="bg-pink-50 rounded-lg p-4 text-center"><i class="fas fa-users text-3xl text-pink-500 mb-2"></i><p class="text-2xl font-bold text-gray-800">\${stats.totalProfiles}</p><p class="text-gray-600 text-sm">전체 회원</p></div><div class="bg-blue-50 rounded-lg p-4 text-center"><i class="fas fa-heart text-3xl text-blue-500 mb-2"></i><p class="text-2xl font-bold text-gray-800">\${stats.totalMatches}</p><p class="text-gray-600 text-sm">매칭 수</p></div><div class="bg-purple-50 rounded-lg p-4 text-center"><i class="fas fa-venus-mars text-3xl text-purple-500 mb-2"></i><p class="text-2xl font-bold text-gray-800">\${stats.byGender.male}/\${stats.byGender.female}</p><p class="text-gray-600 text-sm">남성/여성</p></div><div class="bg-green-50 rounded-lg p-4 text-center"><i class="fas fa-chart-pie text-3xl text-green-500 mb-2"></i><p class="text-lg font-bold text-gray-800">\${stats.byAge['40s']}/\${stats.byAge['50s']}/\${stats.byAge['60s']}</p><p class="text-gray-600 text-sm">40대/50대/60대</p></div>\`;}catch(err){console.error('통계 로드 실패:',err);}}loadStats();</script></body></html>`;
}

function getAdminPageHTML() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Couple Gate - 관리자</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gray-100 min-h-screen"><div id="loginScreen" class="min-h-screen flex items-center justify-center px-4"><div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full"><h1 class="text-3xl font-bold text-center mb-6 text-pink-600"><i class="fas fa-lock"></i> 관리자 로그인</h1><form id="loginForm"><div class="mb-4"><label class="block text-gray-700 font-semibold mb-2">아이디</label><input type="text" id="username" required class="w-full px-4 py-2 border rounded-lg"></div><div class="mb-6"><label class="block text-gray-700 font-semibold mb-2">비밀번호</label><input type="password" id="password" required class="w-full px-4 py-2 border rounded-lg"></div><button type="submit" class="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700"><i class="fas fa-sign-in-alt"></i> 로그인</button></form><div id="loginError" class="mt-4 hidden"><div class="bg-red-50 border border-red-200 rounded-lg p-4"><p class="text-red-800 text-center"><i class="fas fa-exclamation-circle"></i> <span id="loginErrorMsg"></span></p></div></div></div></div><div id="adminDashboard" class="hidden"><nav class="bg-pink-600 text-white p-4"><div class="container mx-auto flex justify-between items-center"><h1 class="text-2xl font-bold"><i class="fas fa-heart"></i> Couple Gate 관리자</h1><div class="flex gap-4"><a href="/" class="hover:text-pink-200"><i class="fas fa-home"></i> 메인</a><button onclick="logout()" class="hover:text-pink-200"><i class="fas fa-sign-out-alt"></i> 로그아웃</button></div></div></nav><div class="container mx-auto px-4 py-8"><div class="mb-6"><div class="flex flex-wrap gap-2"><button onclick="showAdminTab('members')" class="admin-tab-btn active px-6 py-3 bg-white text-pink-600 rounded-lg font-bold shadow-lg"><i class="fas fa-users"></i> 회원 관리</button><button onclick="showAdminTab('matches')" class="admin-tab-btn px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold shadow"><i class="fas fa-heart"></i> 매칭 관리</button><button onclick="showAdminTab('stats')" class="admin-tab-btn px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold shadow"><i class="fas fa-chart-bar"></i> 통계</button><button onclick="showAdminTab('notices')" class="admin-tab-btn px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold shadow"><i class="fas fa-bell"></i> 공지사항</button></div></div><div id="members-tab" class="admin-tab-content bg-white rounded-lg shadow-xl p-6"><h2 class="text-2xl font-bold mb-4"><i class="fas fa-users text-pink-500"></i> 회원 관리</h2><table class="w-full"><thead class="bg-pink-50"><tr><th class="px-4 py-2 text-left">ID</th><th class="px-4 py-2 text-left">이름</th><th class="px-4 py-2 text-left">나이</th><th class="px-4 py-2 text-left">성별</th><th class="px-4 py-2 text-left">국가</th><th class="px-4 py-2 text-left">관리</th></tr></thead><tbody id="membersTableBody"></tbody></table></div><div id="matches-tab" class="admin-tab-content hidden bg-white rounded-lg shadow-xl p-6"><h2 class="text-2xl font-bold mb-4"><i class="fas fa-heart text-pink-500"></i> 매칭 관리</h2><table class="w-full"><thead class="bg-pink-50"><tr><th class="px-4 py-2 text-left">ID</th><th class="px-4 py-2 text-left">신청자</th><th class="px-4 py-2 text-left">대상자</th><th class="px-4 py-2 text-left">상태</th></tr></thead><tbody id="matchesTableBody"></tbody></table></div><div id="stats-tab" class="admin-tab-content hidden bg-white rounded-lg shadow-xl p-6"><h2 class="text-2xl font-bold mb-4"><i class="fas fa-chart-bar text-pink-500"></i> 상세 통계</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="adminStatsContainer"></div></div><div id="notices-tab" class="admin-tab-content hidden bg-white rounded-lg shadow-xl p-6"><div class="flex justify-between items-center mb-4"><h2 class="text-2xl font-bold"><i class="fas fa-bell text-pink-500"></i> 공지사항</h2><button onclick="showNoticeForm()" class="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold"><i class="fas fa-plus"></i> 새 공지</button></div><div id="noticeFormContainer" class="hidden mb-6 bg-pink-50 rounded-lg p-4"><form id="noticeForm"><div class="mb-4"><label class="block font-semibold mb-2">제목</label><input type="text" id="noticeTitle" required class="w-full px-4 py-2 border rounded-lg"></div><div class="mb-4"><label class="block font-semibold mb-2">내용</label><textarea id="noticeContent" rows="5" required class="w-full px-4 py-2 border rounded-lg"></textarea></div><div class="flex gap-2"><button type="submit" class="bg-pink-600 text-white px-6 py-2 rounded-lg font-bold"><i class="fas fa-save"></i> 저장</button><button type="button" onclick="hideNoticeForm()" class="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold">취소</button></div></form></div><table class="w-full"><thead class="bg-pink-50"><tr><th class="px-4 py-2 text-left">ID</th><th class="px-4 py-2 text-left">제목</th><th class="px-4 py-2 text-left">작성일</th><th class="px-4 py-2 text-left">관리</th></tr></thead><tbody id="noticesTableBody"></tbody></table></div></div></div><script>let authToken=null;document.getElementById('loginForm').addEventListener('submit',async(e)=>{e.preventDefault();const username=document.getElementById('username').value;const password=document.getElementById('password').value;try{const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const result=await response.json();if(response.ok){authToken=result.token;document.getElementById('loginScreen').classList.add('hidden');document.getElementById('adminDashboard').classList.remove('hidden');loadMembers();}else{document.getElementById('loginErrorMsg').textContent=result.error;document.getElementById('loginError').classList.remove('hidden');}}catch(err){document.getElementById('loginErrorMsg').textContent='로그인 실패';document.getElementById('loginError').classList.remove('hidden');}});function logout(){authToken=null;document.getElementById('loginScreen').classList.remove('hidden');document.getElementById('adminDashboard').classList.add('hidden');}function showAdminTab(tab){document.querySelectorAll('.admin-tab-content').forEach(t=>t.classList.add('hidden'));document.querySelectorAll('.admin-tab-btn').forEach(b=>{b.classList.remove('active','bg-white','text-pink-600');b.classList.add('bg-gray-200','text-gray-700');});document.getElementById(tab+'-tab').classList.remove('hidden');document.querySelector(\`button[onclick="showAdminTab('\${tab}')"]\`).classList.add('active','bg-white','text-pink-600');if(tab==='members')loadMembers();else if(tab==='matches')loadMatches();else if(tab==='stats')loadAdminStats();else if(tab==='notices')loadNotices();}async function loadMembers(){try{const response=await fetch('/api/admin/members',{headers:{'Authorization':\`Basic \${authToken}\`}});const data=await response.json();const tbody=document.getElementById('membersTableBody');tbody.innerHTML='';data.members.forEach(member=>{const tr=document.createElement('tr');tr.className='border-b';tr.innerHTML=\`<td class="px-4 py-2">\${member.id}</td><td class="px-4 py-2">\${member.name}</td><td class="px-4 py-2">\${member.age}</td><td class="px-4 py-2">\${member.gender}</td><td class="px-4 py-2">\${member.country}</td><td class="px-4 py-2"><button onclick="deleteMember(\${member.id})" class="text-red-600"><i class="fas fa-trash"></i> 삭제</button></td>\`;tbody.appendChild(tr);});}catch(err){console.error(err);}}async function deleteMember(id){if(!confirm('삭제하시겠습니까?'))return;try{await fetch(\`/api/admin/members/\${id}\`,{method:'DELETE',headers:{'Authorization':\`Basic \${authToken}\`}});loadMembers();}catch(err){alert('삭제 실패');}}async function loadMatches(){try{const response=await fetch('/api/admin/matches',{headers:{'Authorization':\`Basic \${authToken}\`}});const data=await response.json();const tbody=document.getElementById('matchesTableBody');tbody.innerHTML='';data.matches.forEach(match=>{const tr=document.createElement('tr');tr.className='border-b';tr.innerHTML=\`<td class="px-4 py-2">\${match.id}</td><td class="px-4 py-2">\${match.fromName}</td><td class="px-4 py-2">\${match.toName}</td><td class="px-4 py-2">\${match.status}</td>\`;tbody.appendChild(tr);});}catch(err){console.error(err);}}async function loadAdminStats(){try{const response=await fetch('/api/stats');const stats=await response.json();document.getElementById('adminStatsContainer').innerHTML=\`<div class="bg-pink-100 rounded-lg p-6"><i class="fas fa-users text-4xl text-pink-600 mb-2"></i><p class="text-3xl font-bold">\${stats.totalProfiles}</p><p>전체 회원</p></div><div class="bg-blue-100 rounded-lg p-6"><i class="fas fa-heart text-4xl text-blue-600 mb-2"></i><p class="text-3xl font-bold">\${stats.totalMatches}</p><p>매칭 수</p></div><div class="bg-purple-100 rounded-lg p-6"><i class="fas fa-venus-mars text-4xl text-purple-600 mb-2"></i><p class="text-xl font-bold">남성: \${stats.byGender.male}</p><p class="text-xl font-bold">여성: \${stats.byGender.female}</p></div>\`;}catch(err){console.error(err);}}async function loadNotices(){try{const response=await fetch('/api/notices');const data=await response.json();const tbody=document.getElementById('noticesTableBody');tbody.innerHTML='';data.notices.forEach(notice=>{const tr=document.createElement('tr');tr.className='border-b';tr.innerHTML=\`<td class="px-4 py-2">\${notice.id}</td><td class="px-4 py-2">\${notice.title}</td><td class="px-4 py-2">\${new Date(notice.createdAt).toLocaleDateString()}</td><td class="px-4 py-2"><button onclick="deleteNotice(\${notice.id})" class="text-red-600"><i class="fas fa-trash"></i> 삭제</button></td>\`;tbody.appendChild(tr);});}catch(err){console.error(err);}}function showNoticeForm(){document.getElementById('noticeFormContainer').classList.remove('hidden');}function hideNoticeForm(){document.getElementById('noticeFormContainer').classList.add('hidden');}document.getElementById('noticeForm').addEventListener('submit',async(e)=>{e.preventDefault();const data={title:document.getElementById('noticeTitle').value,content:document.getElementById('noticeContent').value};try{await fetch('/api/admin/notices',{method:'POST',headers:{'Content-Type':'application/json','Authorization':\`Basic \${authToken}\`},body:JSON.stringify(data)});hideNoticeForm();loadNotices();document.getElementById('noticeForm').reset();}catch(err){alert('저장 실패');}});async function deleteNotice(id){if(!confirm('삭제하시겠습니까?'))return;try{await fetch(\`/api/admin/notices/\${id}\`,{method:'DELETE',headers:{'Authorization':\`Basic \${authToken}\`}});loadNotices();}catch(err){alert('삭제 실패');}}</script></body></html>`;
}

function getNoticesPageHTML() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>공지사항 - Couple Gate</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"></head><body class="bg-gradient-to-br from-pink-300 via-red-300 to-purple-400 min-h-screen"><div class="container mx-auto px-4 py-8"><div class="mb-6"><a href="/" class="text-white hover:text-pink-100"><i class="fas fa-arrow-left"></i> 메인으로</a></div><div class="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-6 md:p-8"><h1 class="text-3xl font-bold text-center mb-8 text-pink-600"><i class="fas fa-bell"></i> 공지사항</h1><div id="noticesContainer" class="space-y-4"></div></div></div><script>async function loadNotices(){try{const response=await fetch('/api/notices');const data=await response.json();const container=document.getElementById('noticesContainer');container.innerHTML='';if(data.notices.length===0){container.innerHTML='<p class="text-center text-gray-500">등록된 공지사항이 없습니다.</p>';return;}data.notices.forEach(notice=>{const div=document.createElement('div');div.className='border rounded-lg p-4 bg-gray-50';div.innerHTML=\`<div class="flex items-start"><i class="fas fa-bell text-pink-500 mt-1 mr-2"></i><div class="flex-1"><h3 class="font-bold text-lg mb-2">\${notice.title}</h3><p class="text-gray-700 whitespace-pre-wrap">\${notice.content}</p><p class="text-sm text-gray-500 mt-2"><i class="fas fa-calendar"></i> \${new Date(notice.createdAt).toLocaleString()}</p></div></div>\`;container.appendChild(div);});}catch(err){console.error(err);}}loadNotices();</script></body></html>`;
}
