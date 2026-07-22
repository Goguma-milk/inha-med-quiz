// =================================================================
// INHA MED 족보 퀴즈
// =================================================================

const allQuizData = [];
let currentFilteredQuestions = []; 
let currentQuestionIndex = 0;
let userAnswers = {};             
let bookmarkedQuestions = new Set(); 
let isIncorrectNoteSession = false; 
let retakeSessionTitle = ''; 

let currentAppMode = 'quiz'; 
let spectatorSplit = 1;      

// 다중 분할 모드의 개별 슬롯 인덱스 추적 및 팔레트 타겟
let currentSlotIndices = [];
let targetSlotForPalette = null; 

// 현재 조회 중인 과거 회차 인덱스 저장용
let currentViewedRecordIndex = null;
let currentViewedDisplayIndex = null;

// 전역 고유 식별자 생성기 (과목_연도_고유ID)
const getQKey = (q) => `${q.originSubject}_${q.originYear}_${q.id}`;

// [v3.0 추가] 파이어베이스 초기화 및 유저 상태
const firebaseConfig = {
    // 실제 서비스 배포 시 본인의 Firebase 프로젝트 설정으로 변경하세요
    apiKey: "AIzaSyCG-CrGQsFNgfqTMDnmwCEzbbCyJmwZknM",
    authDomain: "inha-med-quiz.firebaseapp.com",
    projectId: "inha-med-quiz"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const dbFirestore = firebase.firestore();
let currentUser = null; // null이면 게스트 모드

// --- IndexedDB 초기화 ---
let db;
const dbRequest = indexedDB.open("MedicalQuizDB", 1);
dbRequest.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("memos")) db.createObjectStore("memos", { keyPath: "id" });
};
dbRequest.onsuccess = (e) => { db = e.target.result; };
dbRequest.onerror = (e) => { console.error("IndexedDB 연결 에러", e); };

// --- DOM 캐싱 ---
const screens = {
    login: document.getElementById('login-screen'), // [v3.0 추가]
    home: document.getElementById('home-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
    dashboard: document.getElementById('dashboard-screen')
};

const dom = {
    // [v3.0 추가] 로그인 관련 DOM
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    loginIsNew: document.getElementById('login-is-new'),
    btnLoginSubmit: document.getElementById('btn-login-submit'),
    btnLoginGuest: document.getElementById('btn-login-guest'),
    headerUsername: document.getElementById('header-username'),
    // ... 이하 기존 dom 속성 유지 ...
    
    appContainer: document.getElementById('app'),
    themeToggles: document.querySelectorAll('.theme-checkbox'), 
    appModeRadios: document.querySelectorAll('input[name="appMode"]'), 
    spectatorOptions: document.getElementById('spectator-options'), 
    fSplitScreen: document.getElementById('f-split-screen'), 
    fSubject: document.getElementById('f-subject'),
    fYearContainer: document.getElementById('f-year-container'),
    fExaminer: document.getElementById('f-examiner'),
    fScope: document.getElementById('f-scope'),
    fIsIncorrectNote: document.getElementById('f-is-incorrect-note'),
    fErrorRate: document.getElementById('f-error-rate'),
    btnStartQuiz: document.getElementById('btn-start-quiz'),
    btnDashboard: document.getElementById('btn-dashboard'),
    liveCount: document.getElementById('live-question-count'),
    
    quizTitle: document.getElementById('quiz-title'),
    qNumber: document.getElementById('q-number'),
    qMultiBadge: document.getElementById('q-multi-badge'), 
    qText: document.getElementById('q-text'),
    qImageContainer: document.getElementById('q-image-container'),
    optionsContainer: document.getElementById('options-container'),
    btnCheckMultiAnswer: document.getElementById('btn-check-multi-answer'), 
    explanationContent: document.getElementById('explanation-content'),
    explanationPlaceholder: document.getElementById('explanation-placeholder'),
    aText: document.getElementById('a-text'),
    
    // [v2.5] 메타데이터 DOM 추가 캐싱
    eSubject: document.getElementById('e-subject'),
    eYear: document.getElementById('e-year'),
    eExaminer: document.getElementById('e-examiner'),
    eScope: document.getElementById('e-scope'),
    
    eText: document.getElementById('e-text'),
    eImageContainer: document.getElementById('e-image-container'),
    quizSplitContainer: document.getElementById('quiz-split-container'),
    spectatorMultiContainer: document.getElementById('spectator-multi-container'),

    navCenterControls: document.getElementById('nav-center-controls'),
    paletteModalTitle: document.getElementById('palette-modal-title'),

    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnExit: document.getElementById('btn-exit-quiz'),
    btnBookmark: document.getElementById('btn-bookmark'), 
    btnPalette: document.getElementById('btn-palette'),   
    fontSizeBtns: document.querySelectorAll('.btn-font'),

    totalScore: document.getElementById('total-score'),
    resWeakExTbody: document.getElementById('weak-examiner-tbody'),
    resWeakScTbody: document.getElementById('weak-scope-tbody'),
    resWeakQStatsTbody: document.getElementById('weak-qstats-tbody'), 
    btnGoHome: document.getElementById('btn-go-home'),
    dSubject: document.getElementById('d-subject'),
    dYear: document.getElementById('d-year'),
    dExaminer: document.getElementById('d-examiner'),
    dScope: document.getElementById('d-scope'),
    dashTotalScore: document.getElementById('dashboard-total-score'),
    dashWeakExTbody: document.getElementById('dashboard-examiner-tbody'),
    dashWeakScTbody: document.getElementById('dashboard-scope-tbody'),
    dashQStatsTbody: document.getElementById('dashboard-qstats-tbody'), 
    dashSessionTbody: document.getElementById('dashboard-session-tbody'), 
    btnDashHome: document.getElementById('btn-dash-home'),

    imageModal: document.getElementById('image-modal'),
    modalImg: document.getElementById('modal-img'),
    paneResizer: document.getElementById('pane-resizer'),
    leftPane: document.getElementById('left-pane'),
    paletteModal: document.getElementById('palette-modal'),
    paletteGrid: document.getElementById('palette-grid'),
    btnClosePalette: document.getElementById('btn-close-palette'),
    btnSubmitEarly: document.getElementById('btn-submit-early'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmMsg: document.getElementById('confirm-msg'),
    btnConfirmYes: document.getElementById('btn-confirm-yes'),
    btnConfirmNo: document.getElementById('btn-confirm-no'),
    sessionDetailModal: document.getElementById('session-detail-modal'),
    sessionDetailTitle: document.getElementById('session-detail-title'),
    sessionDetailGrid: document.getElementById('session-detail-grid'),
    btnCloseSessionDetail: document.getElementById('btn-close-session-detail'),
    btnRetakeIncorrect: document.getElementById('btn-retake-incorrect'), 
    
    btnVentChat: document.getElementById('btn-vent-chat'),
    chatModal: document.getElementById('chat-modal'),
    btnCloseChat: document.getElementById('btn-close-chat'),
    chatBody: document.getElementById('chat-body'),
    chatInput: document.getElementById('chat-input'),
    btnSendChat: document.getElementById('btn-send-chat'),
    chatProfessorName: document.getElementById('chat-professor-name'),
    btnMemo: document.getElementById('btn-memo'),
    memoModal: document.getElementById('memo-modal'),
    memoHeader: document.getElementById('memo-header'),
    memoTitle: document.getElementById('memo-title'),
    btnCloseMemo: document.getElementById('btn-close-memo'),
    memoTextarea: document.getElementById('memo-textarea'),
    btnSaveMemo: document.getElementById('btn-save-memo'),

    // [v3.2 추가] 패치노트 DOM
    btnOpenPatchnote: document.getElementById('btn-open-patchnote'),
    patchnoteModal: document.getElementById('patchnote-modal'),
    btnClosePatchnote: document.getElementById('btn-close-patchnote'),
    patchnoteContent: document.getElementById('patchnote-content')
};

// --- 유틸리티 함수 ---
const getHistory = () => JSON.parse(localStorage.getItem('medicalQuizHistory') || '[]');
// [v3.0 수정] 게스트면 로컬, 로그인 상태면 로컬+파이어베이스 동시 저장
const saveHistory = (data) => {
    localStorage.setItem('medicalQuizHistory', JSON.stringify(data));
    if (currentUser) {
        dbFirestore.collection('users').doc(currentUser).set({ history: data }, { merge: true })
            .catch(e => console.error("Firebase History 동기화 실패:", e));
    }
};
const calcRate = (correct, total) => total === 0 ? 0 : Math.round((correct / total) * 100);

function cleanHTML(htmlString) {
    if (!htmlString) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    tempDiv.querySelectorAll('*').forEach(el => {
        if (el.style) { el.style.fontSize = ''; el.style.lineHeight = ''; el.style.fontFamily = ''; }
    });
    return tempDiv.innerHTML;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function switchScreen(screenName) {
    Object.values(screens).forEach(screen => screen?.classList.remove('active'));
    screens[screenName]?.classList.add('active');
}

function checkHistoryExist() {
    if (dom.btnDashboard) dom.btnDashboard.disabled = getHistory().length === 0;
}

function resetCompactUI() {
    if(dom.appContainer) dom.appContainer.classList.remove('compact-ui');
}

function loadQuizData() {
    if (typeof quizFileList !== 'undefined' && Array.isArray(quizFileList)) {
        if (quizFileList.length === 0) {
            if (dom.liveCount) {
                dom.liveCount.textContent = `불러올 족보 파일이 없습니다. (file_list.js 확인 필요)`;
                dom.liveCount.style.color = 'var(--danger)';
            }
            alert("족보 파일 리스트(file_list.js)가 비어있습니다.\n파이썬 프로그램을 통해 족보 데이터를 먼저 가공 및 추가해 주세요.");
            finalizeLoading();
            return;
        }

        let loadedCount = 0;
        if (dom.liveCount) {
            dom.liveCount.textContent = `족보 데이터 불러오는 중... (0/${quizFileList.length})`;
            dom.liveCount.style.color = 'var(--primary)';
        }

        const promises = quizFileList.map(fileName => {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = `data/${fileName}`;
                script.onload = () => {
                    loadedCount++;
                    if (dom.liveCount) dom.liveCount.textContent = `족보 데이터 불러오는 중... (${loadedCount}/${quizFileList.length})`;
                    resolve();
                };
                script.onerror = () => {
                    console.error(`족보 데이터 로드 실패: ${fileName}`);
                    resolve(); 
                };
                document.head.appendChild(script);
            });
        });

        Promise.all(promises).then(() => {
            finalizeLoading();
        });
    } else {
        if (dom.liveCount) {
            dom.liveCount.textContent = `data/file_list.js 파일을 찾을 수 없습니다.`;
            dom.liveCount.style.color = 'var(--danger)';
        }
        alert("data/file_list.js 파일을 찾을 수 없거나 형식이 올바르지 않습니다.");
        finalizeLoading();
    }
}

function finalizeLoading() {
    for (let key in window) {
        if (key.startsWith('data_') && typeof window[key] === 'object' && window[key].metadata) {
            allQuizData.push(window[key]);
        }
    }
    if (typeof quizData !== 'undefined' && Array.isArray(quizData)) {
        allQuizData.push(...quizData);
    }
    
    allQuizData.forEach(quiz => {
        if (quiz.questions && Array.isArray(quiz.questions)) {
            quiz.questions = quiz.questions.filter(q => {
                const scopeStr = q.scope ? String(q.scope).replace(/\s+/g, '') : '';
                const isFailed = scopeStr.includes('복원실패');
                return !isFailed; 
            });
        }
    });
    
    init(); 
}

// --- 초기화 ---
function init() {
    document.querySelectorAll('body > .fixed-theme-toggle').forEach(el => el.remove());
    initTheme(); 
    populateHomeFilters();
    checkHistoryExist();
    setupEventListeners();
    updateLiveCount(); 
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (savedTheme === 'dark') dom.themeToggles?.forEach(t => t.checked = true);
    }
    
    dom.themeToggles?.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            dom.themeToggles.forEach(t => t.checked = isDark);
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    });
}

// [v2.8 수정] 과목 종속형(Cascading) 필터 렌더링 로직 추가
function populateHomeFilters() {
    if (allQuizData.length === 0) return;
    const subjects = new Set();

    allQuizData.forEach(quiz => subjects.add(quiz.metadata.subject));

    if (dom.fSubject) dom.fSubject.innerHTML = '<option value="all">전체 과목</option>';
    if (dom.dSubject) dom.dSubject.innerHTML = '<option value="all">전체 과목</option>';

    subjects.forEach(subj => {
        if (dom.fSubject) dom.fSubject.appendChild(new Option(subj, subj));
        if (dom.dSubject) dom.dSubject.appendChild(new Option(subj, subj));
    });

    updateDependentHomeFilters();
    updateDependentDashFilters();
}

function updateDependentHomeFilters() {
    if (allQuizData.length === 0) return;
    const selectedSubject = dom.fSubject ? dom.fSubject.value : 'all';
    const years = new Set(), examiners = new Set(), scopes = new Set();

    allQuizData.forEach(quiz => {
        if (selectedSubject !== 'all' && quiz.metadata.subject !== selectedSubject) return;
        years.add(quiz.metadata.year);
        quiz.questions.forEach(q => {
            if (q.examiner) examiners.add(q.examiner);
            // [v3.1 수정] 여러 범위가 섞여 있으면 파이프(|)로 쪼개어 각각 옵션으로 추가
            if (q.scope) {
                q.scope.split('|').forEach(s => scopes.add(s.trim()));
            }
        });
    });

    if (dom.fYearContainer) dom.fYearContainer.innerHTML = '';
    [...years].sort((a, b) => b - a).forEach(year => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="fYear" value="${year}" checked> ${year}년`;
        if (dom.fYearContainer) dom.fYearContainer.appendChild(label);
    });

    if (dom.fExaminer) {
        dom.fExaminer.innerHTML = '<option value="all">모든 출제자</option>';
        [...examiners].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).forEach(ex => dom.fExaminer.appendChild(new Option(ex, ex)));
    }
    if (dom.fScope) {
        dom.fScope.innerHTML = '<option value="all">전체 범위</option>';
        [...scopes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).forEach(sc => dom.fScope.appendChild(new Option(sc, sc)));
    }

    document.querySelectorAll('input[name="fYear"]').forEach(cb => cb.addEventListener('change', updateLiveCount));
}

function updateDependentDashFilters() {
    if (allQuizData.length === 0) return;
    const selectedSubject = dom.dSubject ? dom.dSubject.value : 'all';
    const years = new Set(), examiners = new Set(), scopes = new Set();

    allQuizData.forEach(quiz => {
        if (selectedSubject !== 'all' && quiz.metadata.subject !== selectedSubject) return;
        years.add(quiz.metadata.year);
        quiz.questions.forEach(q => {
            if (q.examiner) examiners.add(q.examiner);
            // [v3.1 수정] 여러 범위가 섞여 있으면 파이프(|)로 쪼개어 각각 옵션으로 추가
            if (q.scope) {
                q.scope.split('|').forEach(s => scopes.add(s.trim()));
            }
        });
    });

    if (dom.dYear) {
        dom.dYear.innerHTML = '<option value="all">전체 연도</option>';
        [...years].sort((a, b) => b - a).forEach(year => dom.dYear.appendChild(new Option(`${year}년`, year)));
    }
    if (dom.dExaminer) {
        dom.dExaminer.innerHTML = '<option value="all">모든 출제자</option>';
        [...examiners].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).forEach(ex => dom.dExaminer.appendChild(new Option(ex, ex)));
    }
    if (dom.dScope) {
        dom.dScope.innerHTML = '<option value="all">전체 범위</option>';
        [...scopes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).forEach(sc => dom.dScope.appendChild(new Option(sc, sc)));
    }
}

function extractQuestionsByFilters() {
    const targetSubject = dom.fSubject ? dom.fSubject.value : 'all';
    const targetExaminer = dom.fExaminer ? dom.fExaminer.value : 'all';
    const targetScope = dom.fScope ? dom.fScope.value : 'all';
    const checkedYears = Array.from(document.querySelectorAll('input[name="fYear"]:checked')).map(el => parseInt(el.value));
    const errorRateLimit = dom.fErrorRate ? parseInt(dom.fErrorRate.value) : 0;
    const isIncorrectMode = dom.fIsIncorrectNote ? dom.fIsIncorrectNote.checked : false;

    let qStats = {};
    if (isIncorrectMode) {
        getHistory().forEach(record => {
            if (!record.answers) return;
            Object.entries(record.answers).forEach(([key, ansData]) => {
                if (!qStats[key]) qStats[key] = { total: 0, wrong: 0 };
                qStats[key].total++;
                if (!ansData.isCorrect) qStats[key].wrong++;
            });
        });
    }

    return allQuizData.flatMap(quiz => {
        if (targetSubject !== 'all' && quiz.metadata.subject !== targetSubject) return [];
        if (!checkedYears.includes(quiz.metadata.year)) return [];

        return quiz.questions.filter(q => {
            if (targetExaminer !== 'all' && q.examiner !== targetExaminer) return false;
            // [v3.1 수정] 단일 일치(===)에서 포함(includes) 조건으로 유연하게 필터링
            if (targetScope !== 'all' && (!q.scope || !q.scope.includes(targetScope))) return false;

            if (isIncorrectMode) {
                const key = `${quiz.metadata.subject}_${quiz.metadata.year}_${q.id}`;
                const stat = qStats[key];
                if (!stat) return false;
                const rate = calcRate(stat.wrong, stat.total);
                return errorRateLimit === 0 ? stat.wrong > 0 : rate >= errorRateLimit;
            }
            return true;
        }).map(q => ({ ...q, originSubject: quiz.metadata.subject, originYear: quiz.metadata.year }));
    });
}

function updateLiveCount() {
    if (!dom.liveCount) return;
    const questions = extractQuestionsByFilters();
    dom.liveCount.textContent = `총 ${questions.length}문제 대기 중`;
    dom.liveCount.style.color = questions.length === 0 ? 'var(--danger)' : 'var(--primary)';
}

function startQuiz() {
    isIncorrectNoteSession = dom.fIsIncorrectNote ? dom.fIsIncorrectNote.checked : false;
    retakeSessionTitle = ''; 
    
    currentFilteredQuestions = extractQuestionsByFilters();
    
    if (currentFilteredQuestions.length === 0) {
        alert("선택하신 조건에 맞는 문제가 존재하지 않습니다.");
        return;
    }

    const modeRadio = document.querySelector('input[name="appMode"]:checked');
    currentAppMode = modeRadio ? modeRadio.value : 'quiz';
    spectatorSplit = currentAppMode === 'spectator' && dom.fSplitScreen ? parseInt(dom.fSplitScreen.value) : 1;

    if (document.querySelector('input[name="playMode"]:checked')?.value === 'shuffle') {
        shuffleArray(currentFilteredQuestions);
    }
    
    currentQuestionIndex = 0;
    userAnswers = {};
    bookmarkedQuestions.clear(); 
    targetSlotForPalette = null;
    
    const initialSlotCount = Math.min(spectatorSplit, currentFilteredQuestions.length);
    currentSlotIndices = Array.from({length: initialSlotCount}, (_, i) => i);

    if (spectatorSplit === 1) {
        resetCompactUI();
        if (dom.leftPane) dom.leftPane.style.width = '50%'; 
        dom.quizSplitContainer?.classList.remove('hidden');
        dom.spectatorMultiContainer?.classList.add('hidden');
        dom.navCenterControls?.classList.remove('hide-global-tools');
    } else {
        if(dom.appContainer) dom.appContainer.classList.add('compact-ui'); 
        dom.quizSplitContainer?.classList.add('hidden');
        if (dom.spectatorMultiContainer) {
            dom.spectatorMultiContainer.className = `multi-container spectator-grid-${spectatorSplit}`;
            dom.spectatorMultiContainer.classList.remove('hidden');
        }
        // [v2.7 수정] 다중 관전 모드에서도 하단 UI(팔레트 등)가 항상 보이도록 변경
        dom.navCenterControls?.classList.remove('hide-global-tools'); 
    }

    if (dom.quizTitle) {
        dom.quizTitle.textContent = isIncorrectNoteSession ? "📝 오답 노트 복습" : `${dom.fSubject?.value === 'all' ? '통합' : dom.fSubject?.value} 퀴즈`;
    }
    switchScreen('quiz');
    
    spectatorSplit === 1 ? renderQuestion() : renderMultiSpectatorView();
}

function renderImages(container, pathData) {
    if (!container || !pathData) return;
    (Array.isArray(pathData) ? pathData : [pathData]).forEach(path => {
        const img = document.createElement('img');
        img.src = path;
        img.style.marginBottom = '15px';
        img.onclick = (e) => {
            if(dom.modalImg) dom.modalImg.src = e.target.src;
            dom.imageModal?.classList.remove('hidden');
        };
        container.appendChild(img);
    });
}

function renderQuestion() {
    const q = currentFilteredQuestions[currentQuestionIndex];
    if (!q) return;
    const qKey = getQKey(q); 
    const isMulti = q.answer && q.answer.includes(','); 
    
    if (dom.qNumber) dom.qNumber.textContent = `Q. ${q.id}`; 
    if (dom.qMultiBadge) {
        if (isMulti) dom.qMultiBadge.classList.remove('hidden');
        else dom.qMultiBadge.classList.add('hidden');
    }

    if (dom.qText) dom.qText.innerHTML = cleanHTML(q.question_text);
    
    if (dom.qImageContainer) dom.qImageContainer.innerHTML = '';
    if (q.image_required?.has_question_image && dom.qImageContainer) renderImages(dom.qImageContainer, q.image_required.question_image_path);
    
    if (dom.optionsContainer) {
        dom.optionsContainer.innerHTML = '';
        
        const correctAnswers = isMulti ? q.answer.split(',').map(s => s.trim()) : [q.answer ? q.answer.trim() : ''];

        q.options.forEach((optText, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `${index + 1}. ${cleanHTML(optText.replace(/^((?:<[^>]+>)*\s*)\d+\)\s*/, '$1'))}`;
            
            if (currentAppMode === 'spectator') {
                btn.style.cursor = 'default';
                if (correctAnswers.includes((index + 1).toString())) {
                    btn.style.borderColor = 'var(--success)';
                    btn.style.backgroundColor = 'var(--success-bg)';
                }
            } else {
                const saved = userAnswers[qKey]; 
                
                if (isMulti) {
                    if (saved && saved.isGraded) {
                        const isAns = correctAnswers.includes((index + 1).toString());
                        if (isAns) {
                            btn.style.borderColor = 'var(--success)';
                            btn.style.backgroundColor = 'var(--success-bg)';
                        } else if (saved.selectedMulti && saved.selectedMulti.includes(index)) {
                            btn.style.borderColor = 'var(--danger)';
                            btn.style.backgroundColor = 'var(--danger-bg)';
                        }
                        btn.style.cursor = 'default';
                        btn.onclick = () => {}; 
                    } else if (saved && saved.selectedMulti && saved.selectedMulti.includes(index)) {
                        btn.classList.add('multi-selected'); 
                        btn.onclick = () => handleOptionClick(index, true);
                    } else {
                        btn.onclick = () => handleOptionClick(index, true);
                    }
                } else {
                    if (saved && index === saved.selectedIndex) {
                        btn.style.borderColor = saved.isCorrect ? 'var(--success)' : 'var(--danger)';
                        btn.style.backgroundColor = saved.isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)';
                    }
                    if (saved && (index + 1).toString() === q.answer.trim()) {
                        btn.style.borderColor = 'var(--success)';
                        btn.style.backgroundColor = 'var(--success-bg)';
                    }
                    btn.onclick = () => handleOptionClick(index, false);
                }
            }
            dom.optionsContainer.appendChild(btn);
        });
    }

    dom.btnBookmark?.classList.toggle('bookmarked', bookmarkedQuestions.has(qKey));
    
    if (dom.btnNext) {
        dom.btnNext.disabled = false;
        dom.btnNext.textContent = currentQuestionIndex === currentFilteredQuestions.length - 1 ? (currentAppMode === 'spectator' ? "종료 📊" : "제출하기 📊") : "다음 ➡";
    }
    if (dom.btnPrev) dom.btnPrev.disabled = currentQuestionIndex === 0;

    const savedState = userAnswers[qKey];
    if (currentAppMode === 'spectator' || (savedState && (!isMulti || savedState.isGraded))) {
        showExplanation(savedState?.isCorrect, q);
    } else {
        dom.explanationContent?.classList.add('hidden');
        dom.explanationPlaceholder?.classList.remove('hidden');
    }
    
    if (isMulti && currentAppMode !== 'spectator') {
        dom.btnCheckMultiAnswer?.classList.remove('hidden');
        if (savedState && savedState.isGraded) {
            if (dom.btnCheckMultiAnswer) {
                dom.btnCheckMultiAnswer.textContent = '답 수정 ✏️';
                dom.btnCheckMultiAnswer.classList.remove('btn-multi-check');
                dom.btnCheckMultiAnswer.classList.add('btn-multi-edit');
                dom.btnCheckMultiAnswer.onclick = handleMultiAnswerEdit;
            }
        } else {
            if (dom.btnCheckMultiAnswer) {
                dom.btnCheckMultiAnswer.textContent = '정답 확인 🧐';
                dom.btnCheckMultiAnswer.classList.remove('btn-multi-edit');
                dom.btnCheckMultiAnswer.classList.add('btn-multi-check');
                dom.btnCheckMultiAnswer.onclick = handleMultiAnswerCheck;
            }
        }
    } else {
        dom.btnCheckMultiAnswer?.classList.add('hidden');
    }

    // [v2.6.1 수정] 하단 진행도 텍스트 간소화
    if (dom.btnPalette) dom.btnPalette.textContent = `${currentQuestionIndex + 1}/${currentFilteredQuestions.length}`;

    // [v3.1 수정] 단일 모드 원본 PDF 팝업 로직 (page_number 변수 적용)

// [v3.4 수정] 커스텀 PDF 뷰어 호출 및 구간(Start~End) 파라미터 유동적 계산
    const btnPdf = document.getElementById('btn-view-pdf');
    if (btnPdf) {
        btnPdf.onclick = () => {
            const startPage = q.page_number || 1;
            let endPage = startPage;
            
            // explanation 배열 내부의 page 값을 순회하여 가장 마지막 페이지(최댓값) 찾기
            if (q.explanation && q.explanation.length > 0) {
                const expPages = q.explanation.map(exp => exp.page).filter(p => p != null);
                if (expPages.length > 0) {
                    endPage = Math.max(startPage, ...expPages);
                }
            }
            
            const pdfUrl = `viewer.html?file=${encodeURIComponent(`./족보원본/${q.originYear}_${q.originSubject}.pdf`)}&start=${startPage}&end=${endPage}`;
            window.open(pdfUrl, 'PDFViewerWindow', 'width=800,height=1000');
        };
    }
}

function renderMultiSpectatorView() {
    if (!dom.spectatorMultiContainer) return;
    dom.spectatorMultiContainer.innerHTML = '';
    
    currentSlotIndices.forEach((qIndex, slotDivIndex) => {
        const q = currentFilteredQuestions[qIndex];
        if (!q) return;
        const qKey = getQKey(q); 
        const isMulti = q.answer && q.answer.includes(',');
        const correctAnswers = isMulti ? q.answer.split(',').map(s => s.trim()) : [q.answer ? q.answer.trim() : ''];
        
        const card = document.createElement('div');
        card.className = 'multi-question-card';
        
        const bmkActive = bookmarkedQuestions.has(qKey) ? 'active-bookmarked' : '';
        
        let html = `
            <div class="slot-controls-bar">
                <div class="slot-nav-group">
                    <button class="btn-slot-action btn-change" data-slot="${slotDivIndex}">🔄 문제 변경</button>
                    <button class="btn-slot-action btn-prev-slot" data-slot="${slotDivIndex}" ${qIndex === 0 ? 'disabled' : ''}>&lt;</button>
                    <button class="btn-slot-action btn-next-slot" data-slot="${slotDivIndex}" ${qIndex >= currentFilteredQuestions.length - 1 ? 'disabled' : ''}>&gt;</button>
                </div>
                <div class="slot-tools-group">
                    <button class="btn-slot-tool btn-bmk-slot ${bmkActive}" data-slot="${slotDivIndex}" title="북마크">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                    <button class="btn-slot-tool btn-memo-slot" data-slot="${slotDivIndex}" title="메모">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-slot-tool btn-chat-slot" data-slot="${slotDivIndex}" title="화풀이">💬 화풀이</button>
                </div>
            </div>
        `;
        
        // [v3.1 수정] 다중 모드 카드 상단에도 PDF 버튼 렌더링
        html += `<div style="margin-bottom:1rem; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <span class="badge">Q. ${q.id}</span>
                        ${isMulti ? '<span class="badge" style="background-color: #8b5cf6; margin-left: 8px;">복수정답</span>' : ''}
                    </div>
                    <button class="btn-slot-action btn-view-pdf-slot" data-slot="${slotDivIndex}">📄 원본 PDF</button>
                 </div>`;
        html += `<div class="question-text">${cleanHTML(q.question_text)}</div>`;
        card.innerHTML = html;

        if (q.image_required?.has_question_image) {
            const qImgCont = document.createElement('div'); qImgCont.className = 'image-container';
            renderImages(qImgCont, q.image_required.question_image_path);
            card.appendChild(qImgCont);
        }

        const optCont = document.createElement('div'); optCont.className = 'options-container';
        q.options.forEach((optText, index) => {
            const isAns = correctAnswers.includes((index + 1).toString());
            const styleStr = isAns ? 'border-color:var(--success); background-color:var(--success-bg);' : '';
            optCont.innerHTML += `<div class="option-btn" style="cursor:default; ${styleStr}">${index + 1}. ${cleanHTML(optText.replace(/^((?:<[^>]+>)*\s*)\d+\)\s*/, '$1'))}</div>`;
        });
        card.appendChild(optCont);

        // [v2.5] 관전 모드 카드 하단의 메타데이터 패널에 과목명, 연도 추가
        const expCont = document.createElement('div'); expCont.className = 'explanation-content';
        expCont.innerHTML = `
            <h3 class="answer-text">정답: <span>${q.answer}</span></h3>
            <div class="meta-info" style="margin-top:0.5rem; flex-wrap: wrap;">
                <span class="meta-tag"><strong>과목:</strong> ${q.originSubject || '미지정'}</span>
                <span class="meta-tag"><strong>연도:</strong> ${q.originYear ? q.originYear + '년' : '미지정'}</span>
                <span class="meta-tag"><strong>출제자:</strong> ${q.examiner||'미지정'}</span>
                <span class="meta-tag"><strong>범위:</strong> ${q.scope ? q.scope.replace(/\|/g, ', ') : '미지정'}</span>
            </div>`;

        if (Array.isArray(q.explanation)) {
            q.explanation.forEach(item => {
                if(item.page) expCont.innerHTML += `<span class="badge" style="background:var(--text-muted); font-size:0.8rem;">Page ${item.page}</span><br>`;
                if(item.text) expCont.innerHTML += `<div class="explanation-text" style="margin-top:0.5rem;">${cleanHTML(item.text)}</div>`;
                if (item.images?.length > 0) {
                    const iCont = document.createElement('div'); iCont.className = 'image-container';
                    renderImages(iCont, item.images);
                    expCont.appendChild(iCont);
                }
            });
        } else {
            expCont.innerHTML += `<div class="explanation-text" style="margin-top:0.5rem;">${cleanHTML(q.explanation||'')}</div>`;
            if (q.image_required?.has_explanation_image) {
                const iCont = document.createElement('div'); iCont.className = 'image-container';
                renderImages(iCont, q.image_required.explanation_image_path);
                expCont.appendChild(iCont);
            }
        }
        card.appendChild(expCont);
        dom.spectatorMultiContainer.appendChild(card);
    });

    if (currentSlotIndices.length > 0) {
        const minIdx = Math.min(...currentSlotIndices);
        if (dom.btnPrev) dom.btnPrev.disabled = currentSlotIndices.every(i => i === 0);
        
        const hasNext = currentSlotIndices.some(i => i + spectatorSplit < currentFilteredQuestions.length);
        if (dom.btnNext) dom.btnNext.textContent = hasNext ? "다음 ➡" : "종료 📊";
        
        // [v2.7 수정] 화면에 렌더링된 문제들 중 가장 문제 번호(ID)가 작은 문제 찾기
        let targetMinIdIndex = currentSlotIndices[0];
        let minIdVal = Infinity;
        
        currentSlotIndices.forEach(idx => {
            if (currentFilteredQuestions[idx]) {
                // 문제 ID에서 숫자만 추출하여 크기 비교 (문자열 섞인 ID 대비)
                const numericId = Number(String(currentFilteredQuestions[idx].id).replace(/[^0-9]/g, ''));
                if (numericId < minIdVal) {
                    minIdVal = numericId;
                    targetMinIdIndex = idx;
                }
            }
        });

        // [v2.7 수정] 다중 분할 모드 하단 진행도 텍스트 간소화 (가장 빠른 ID 순서 기준)
        if (dom.btnPalette) {
            dom.btnPalette.textContent = `${targetMinIdIndex + 1}/${currentFilteredQuestions.length}`;
        }
    }
}

function handleOptionClick(index, isMulti) {
    if (currentAppMode === 'spectator') return; 
    const q = currentFilteredQuestions[currentQuestionIndex];
    if (!q) return;
    const qKey = getQKey(q);

    if (isMulti) {
        if (!userAnswers[qKey]) userAnswers[qKey] = { selectedMulti: [], isGraded: false, isCorrect: false };
        if (userAnswers[qKey].isGraded) return;

        const pos = userAnswers[qKey].selectedMulti.indexOf(index);
        if (pos === -1) userAnswers[qKey].selectedMulti.push(index);
        else userAnswers[qKey].selectedMulti.splice(pos, 1);
        
        renderQuestion();
    } else {
        const isCorrect = (index + 1).toString() === (q.answer ? q.answer.trim() : '');
        userAnswers[qKey] = { selectedIndex: index, isCorrect, isGraded: true };
        renderQuestion();
    }
}

function handleMultiAnswerCheck() {
    const q = currentFilteredQuestions[currentQuestionIndex];
    if (!q) return;
    const qKey = getQKey(q);
    const ans = userAnswers[qKey];
    
    if (!ans || !ans.selectedMulti || ans.selectedMulti.length === 0) {
        alert("정답을 최소 1개 이상 선택해주세요.");
        return;
    }
    
    const correctAnswers = q.answer.split(',').map(s => s.trim()).sort();
    const selectedAnswers = ans.selectedMulti.map(i => (i + 1).toString()).sort();
    
    const isCorrect = JSON.stringify(correctAnswers) === JSON.stringify(selectedAnswers);
    
    ans.isCorrect = isCorrect;
    ans.isGraded = true;
    
    renderQuestion(); 
}

function handleMultiAnswerEdit() {
    const q = currentFilteredQuestions[currentQuestionIndex];
    if (!q) return;
    const qKey = getQKey(q);
    const ans = userAnswers[qKey];
    
    if (ans) {
        ans.isGraded = false;
    }
    renderQuestion();
}

// [v2.5] 메타데이터 출력 부분에 과목명, 연도 추가 연동
function showExplanation(isCorrect, overrideQ = null) {
    const q = overrideQ || currentFilteredQuestions[currentQuestionIndex];
    dom.explanationPlaceholder?.classList.add('hidden');
    dom.explanationContent?.classList.remove('hidden');
    
    const badge = document.getElementById('result-badge');
    if (badge) {
        if (currentAppMode === 'spectator') {
            badge.textContent = '💡 관전 모드'; badge.style.backgroundColor = '#eff6ff'; badge.style.color = 'var(--primary)';
        } else {
            badge.textContent = isCorrect ? '✅ 정답입니다!' : '❌ 오답입니다.';
            badge.style.backgroundColor = isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)';
            badge.style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
        }
    }

    if (dom.aText) dom.aText.textContent = q.answer;
    
    // [v2.5] 메타 정보 주입
    if (dom.eSubject) dom.eSubject.textContent = q.originSubject || '미지정';
    if (dom.eYear) dom.eYear.textContent = q.originYear ? `${q.originYear}년` : '미지정';
    if (dom.eExaminer) dom.eExaminer.textContent = q.examiner || '미지정';
    // [v3.1 수정] 화면 출력 시 파이프(|) 기호를 쉼표(, )로 예쁘게 치환
    if (dom.eScope) dom.eScope.textContent = q.scope ? q.scope.replace(/\|/g, ', ') : '미지정';
    
    if (dom.eText) dom.eText.innerHTML = ''; 
    if (dom.eImageContainer) dom.eImageContainer.innerHTML = '';

    if (Array.isArray(q.explanation)) {
        q.explanation.forEach(item => {
            const blockDiv = document.createElement('div'); blockDiv.style.marginBottom = '2.5rem';
            if (item.page) blockDiv.innerHTML += `<span class="badge" style="background:var(--text-muted); font-size:0.8rem; margin-bottom:0.75rem;">Page ${item.page}</span>`;
            if (item.text) blockDiv.innerHTML += `<div class="explanation-text" style="margin-bottom:1rem;">${cleanHTML(item.text)}</div>`;
            if (item.images?.length > 0) {
                const imgContainer = document.createElement('div'); imgContainer.className = 'image-container';
                renderImages(imgContainer, item.images);
                blockDiv.appendChild(imgContainer);
            }
            dom.eText?.appendChild(blockDiv);
        });
    } else {
        if (dom.eText) dom.eText.innerHTML = cleanHTML(q.explanation || '');
        if (q.image_required?.has_explanation_image && dom.eImageContainer) {
            renderImages(dom.eImageContainer, q.image_required.explanation_image_path);
        }
    }
}

function buildPaletteGrid() {
    if (!dom.paletteGrid) return;
    dom.paletteGrid.innerHTML = '';
    
    if (targetSlotForPalette !== null) {
        if(dom.paletteModalTitle) dom.paletteModalTitle.textContent = `${targetSlotForPalette + 1}번 슬롯 문제 교체`;
        dom.btnSubmitEarly?.classList.add('hidden');
    } else {
        if(dom.paletteModalTitle) dom.paletteModalTitle.textContent = `전체 문제 이동`;
        dom.btnSubmitEarly?.classList.remove('hidden');
    }

    currentFilteredQuestions.forEach((q, idx) => {
        const qKey = getQKey(q);
        const btn = document.createElement('button');
        btn.className = 'palette-btn';
        btn.textContent = q.id; 
        
        if (userAnswers[qKey]) btn.classList.add('answered');
        
        if (targetSlotForPalette !== null) {
            if (currentSlotIndices[targetSlotForPalette] === idx) btn.classList.add('current');
        } else {
            if (spectatorSplit === 1 && idx === currentQuestionIndex) btn.classList.add('current');
            else if (spectatorSplit > 1 && currentSlotIndices.includes(idx)) btn.classList.add('current');
        }

        if (bookmarkedQuestions.has(qKey)) {
            btn.innerHTML += `<div class="palette-bookmark-icon"><svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></div>`;
        }

        btn.onclick = () => {
            if (targetSlotForPalette !== null) {
                currentSlotIndices[targetSlotForPalette] = idx;
                targetSlotForPalette = null;
                renderMultiSpectatorView();
            } else {
                currentQuestionIndex = spectatorSplit > 1 ? Math.floor(idx / spectatorSplit) * spectatorSplit : idx;
                if (spectatorSplit > 1) {
                    const slotCount = Math.min(spectatorSplit, currentFilteredQuestions.length);
                    currentSlotIndices = Array.from({length: slotCount}, (_, i) => Math.min(currentQuestionIndex + i, currentFilteredQuestions.length - 1));
                }
                spectatorSplit === 1 ? renderQuestion() : renderMultiSpectatorView();
            }
            dom.paletteModal?.classList.add('hidden'); 
        };
        dom.paletteGrid.appendChild(btn);
    });
}

function finishQuiz() {
    if (currentAppMode === 'spectator') return executeFinishQuiz(); 

    const unanswered = currentFilteredQuestions.filter(q => {
        const ans = userAnswers[getQKey(q)];
        if (!ans) return true; 
        if (q.answer && q.answer.includes(',') && !ans.isGraded) return true; 
        return false;
    }).map(q => q.id);
    
    if (unanswered.length > 0 && dom.confirmMsg && dom.confirmModal) {
        dom.confirmMsg.innerHTML = `<strong>${unanswered.join(', ')}번</strong> 문제를 아직 풀지 않았습니다.<br><br>풀지 않은 문제는 모두 틀린 것으로 처리됩니다.<br>정말 제출하시겠습니까?`;
        dom.confirmModal.classList.remove('hidden');
    } else {
        executeFinishQuiz();
    }
}

function executeFinishQuiz() {
    dom.confirmModal?.classList.add('hidden');

    let correctCount = 0;
    const stats = { scope: {}, examiner: {} };
    const answersToSave = {};

    currentFilteredQuestions.forEach((q) => {
        const qKey = getQKey(q);
        const isCorrect = currentAppMode === 'spectator' ? true : !!userAnswers[qKey]?.isCorrect;
        if (isCorrect) correctCount++;
        if (currentAppMode === 'quiz') answersToSave[qKey] = { isCorrect };

        ['scope', 'examiner'].forEach(key => {
            const val = q[key] || '미지정';
            if (!stats[key][val]) stats[key][val] = { total: 0, correct: 0 };
            stats[key][val].total++;
            if (isCorrect) stats[key][val].correct++;
        });
    });

    if (dom.totalScore) dom.totalScore.textContent = `${calcRate(correctCount, currentFilteredQuestions.length)}% (${correctCount} / ${currentFilteredQuestions.length})`;
    if (dom.resWeakExTbody) dom.resWeakExTbody.innerHTML = generateStatRows(stats.examiner, '출제자');
    if (dom.resWeakScTbody) dom.resWeakScTbody.innerHTML = generateStatRows(stats.scope, '범위');

    renderDashboardStats();

    if (currentAppMode === 'quiz') {
        try {
            const history = getHistory();
            const sessionTitle = isIncorrectNoteSession && retakeSessionTitle ? retakeSessionTitle : (dom.quizTitle ? dom.quizTitle.textContent : '결과');
            history.push({ id: `session_${Date.now()}`, date: new Date().toISOString(), title: sessionTitle, answers: answersToSave });
            saveHistory(history);
            renderDashboardStats(); 
        } catch (e) { console.error("저장 불가", e); }
    }

    switchScreen('result');
}

function generateStatRows(dataObj, typeLabel) {
    const list = Object.entries(dataObj).map(([name, data]) => ({ name, ...data, rate: calcRate(data.correct, data.total) })).sort((a, b) => a.rate - b.rate);
    if (list.length === 0) return '<tr><td colspan="2" style="text-align:center;">데이터가 없습니다.</td></tr>';

    return list.map(item => `
        <tr>
            <td><span class="badge" style="background:var(--text-muted); font-size:0.8rem;">${typeLabel}</span> <strong>${item.name}</strong></td>
            <td>
                <div>${item.rate}% (${item.correct}/${item.total})</div>
                <div class="progress-bar-bg" style="height: 6px;"><div class="progress-bar-fill" style="width: ${item.rate}%; background-color: ${item.rate <= 50 ? 'var(--danger)' : 'var(--primary)'};"></div></div>
            </td>
        </tr>`).join('');
}

function renderDashboardStats() {
    const history = getHistory();
    const { dSubject, dYear, dExaminer, dScope } = dom;
    
    const stats = { scope: {}, examiner: {} };
    let totalQ = 0, correctQ = 0;
    const sessionRenderList = [], qStatsObj = {}; 

    history.forEach((record, sessionIndex) => {
        if (!record.answers) return;
        let sessionTotal = 0, sessionCorrect = 0;
        let sessionSubjects = new Set();

        Object.entries(record.answers).forEach(([key, ansData]) => {
            const [subject, year, qId] = key.split('_');
            if (dSubject && dSubject.value !== 'all' && subject !== dSubject.value) return;
            if (dYear && dYear.value !== 'all' && year !== dYear.value) return;

            const originQuiz = allQuizData.find(d => d.metadata.subject === subject && d.metadata.year.toString() === year);
            const qData = originQuiz?.questions.find(q => q.id.toString() === qId);
            if (!qData) return;

            if (dExaminer && dExaminer.value !== 'all' && qData.examiner !== dExaminer.value) return;
            if (dScope && dScope.value !== 'all' && qData.scope !== dScope.value) return;

            totalQ++;
            if (ansData.isCorrect) correctQ++;
            
            ['scope', 'examiner'].forEach(statKey => {
                const val = qData[statKey] || '미지정';
                if (!stats[statKey][val]) stats[statKey][val] = { total: 0, correct: 0 };
                stats[statKey][val].total++;
                if (ansData.isCorrect) stats[statKey][val].correct++;
            });

            if (!qStatsObj[key]) qStatsObj[key] = { name: `${subject} ${year}년 ${qId}번`, scope: qData.scope || '미지정', total: 0, correct: 0 };
            qStatsObj[key].total++;
            if (ansData.isCorrect) qStatsObj[key].correct++;

            sessionTotal++;
            if (ansData.isCorrect) sessionCorrect++;
            sessionSubjects.add(subject);
        });

        if (sessionTotal > 0) {
            const d = new Date(record.date);
            const dateStr = `${d.getFullYear().toString().substr(-2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            sessionRenderList.push({ originalIndex: sessionIndex, index: sessionIndex + 1, dateStr, title: record.title || Array.from(sessionSubjects).join(', '), correct: sessionCorrect, total: sessionTotal, rate: calcRate(sessionCorrect, sessionTotal) });
        }
    });

    if (dom.dashTotalScore) dom.dashTotalScore.textContent = `${calcRate(correctQ, totalQ)}% (${correctQ} / ${totalQ})`;
    if (dom.dashWeakExTbody) dom.dashWeakExTbody.innerHTML = generateStatRows(stats.examiner, '출제자');
    if (dom.dashWeakScTbody) dom.dashWeakScTbody.innerHTML = generateStatRows(stats.scope, '범위');

    const qStatsList = Object.values(qStatsObj).map(data => ({ ...data, rate: calcRate(data.correct, data.total) })).sort((a, b) => a.rate - b.rate);
    const qStatsHtml = qStatsList.length === 0 ? '<tr><td colspan="2" style="text-align:center;">데이터가 없습니다.</td></tr>' : qStatsList.map(item => `
        <tr>
            <td style="font-size: 0.85rem;"><strong>${item.name}</strong><br><span style="color:var(--text-muted);">${item.scope}</span></td>
            <td>
                <div>${item.rate}% (${item.correct}/${item.total})</div>
                <div class="progress-bar-bg" style="height: 6px;"><div class="progress-bar-fill" style="width: ${item.rate}%; background-color: ${item.rate <= 50 ? 'var(--danger)' : 'var(--primary)'};"></div></div>
            </td>
        </tr>`).join('');
    
    if(dom.resWeakQStatsTbody) dom.resWeakQStatsTbody.innerHTML = qStatsHtml;
    if(dom.dashQStatsTbody) dom.dashQStatsTbody.innerHTML = qStatsHtml;

    if (dom.dashSessionTbody) {
        dom.dashSessionTbody.innerHTML = '';
        if (sessionRenderList.length === 0) {
            dom.dashSessionTbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">조건에 맞는 풀이 기록이 없습니다.</td></tr>';
        } else {
            sessionRenderList.reverse().forEach(s => {
                const tr = document.createElement('tr'); tr.className = 'session-row';
                tr.innerHTML = `
                    <td style="font-size: 0.9rem;"><strong>${s.index}회차</strong><br><span style="color:var(--text-muted);">${s.dateStr}</span></td>
                    <td style="font-size: 0.9rem; font-weight: 600; color: ${s.title && s.title.includes('[오답 복습]') ? '#8b5cf6' : 'inherit'}">${s.title || ''}</td>
                    <td>
                        <div>${s.rate}% (${s.correct}/${s.total})</div>
                        <div class="progress-bar-bg" style="height: 6px;"><div class="progress-bar-fill" style="width: ${s.rate}%; background-color: ${s.rate <= 50 ? 'var(--danger)' : 'var(--primary)'};"></div></div>
                    </td>`;
                tr.onclick = () => showSessionDetail(s.originalIndex, s.index);
                dom.dashSessionTbody.appendChild(tr);
            });
        }
    }
}

function showSessionDetail(recordIndex, displayIndex) {
    const record = getHistory()[recordIndex];
    if (!record?.answers) return;
    
    currentViewedRecordIndex = recordIndex; 
    currentViewedDisplayIndex = displayIndex; 

    if (dom.sessionDetailTitle) dom.sessionDetailTitle.textContent = `${displayIndex}회차 상세 결과`;
    if (dom.sessionDetailGrid) dom.sessionDetailGrid.innerHTML = '';
    
    let incorrectCount = 0;

    Object.entries(record.answers).forEach(([key, ansData]) => {
        const qId = key.split('_')[2]; 
        const btn = document.createElement('div');
        btn.className = `palette-btn ${ansData.isCorrect ? 'correct' : 'incorrect'}`;
        btn.style.cssText = 'cursor:default; text-align:center;';
        btn.textContent = qId;
        if (dom.sessionDetailGrid) dom.sessionDetailGrid.appendChild(btn);
        
        if (!ansData.isCorrect) incorrectCount++;
    });
    
    if (dom.btnRetakeIncorrect) {
        if (incorrectCount === 0) {
            dom.btnRetakeIncorrect.classList.add('hidden');
        } else {
            dom.btnRetakeIncorrect.classList.remove('hidden');
            dom.btnRetakeIncorrect.textContent = `❌ 틀린 문제만 다시 풀기 (${incorrectCount}문제)`;
        }
    }

    dom.sessionDetailModal?.classList.remove('hidden');
}

function startRetakeSession(recordIndex) {
    const record = getHistory()[recordIndex];
    if (!record || !record.answers) return;

    const incorrectKeys = Object.entries(record.answers)
        .filter(([key, ansData]) => !ansData.isCorrect)
        .map(([key]) => key);

    if (incorrectKeys.length === 0) {
        alert("틀린 문제가 없습니다!");
        return;
    }

    currentFilteredQuestions = [];
    allQuizData.forEach(quiz => {
        quiz.questions.forEach(q => {
            const tempQ = { ...q, originSubject: quiz.metadata.subject, originYear: quiz.metadata.year };
            if (incorrectKeys.includes(getQKey(tempQ))) {
                currentFilteredQuestions.push(tempQ);
            }
        });
    });

    if (currentFilteredQuestions.length === 0) {
        alert("해당 문제들의 원본 데이터를 찾을 수 없어 퀴즈를 시작할 수 없습니다.");
        return;
    }

    if (document.querySelector('input[name="playMode"]:checked')?.value === 'shuffle') {
        shuffleArray(currentFilteredQuestions);
    }

    retakeSessionTitle = `[오답 복습] ${currentViewedDisplayIndex}회차 연동 기록`;
    isIncorrectNoteSession = true;
    currentAppMode = 'quiz';
    spectatorSplit = 1;
    
    const quizRadio = document.querySelector('input[name="appMode"][value="quiz"]');
    if (quizRadio) quizRadio.checked = true;
    dom.spectatorOptions?.classList.add('hidden');

    currentQuestionIndex = 0;
    userAnswers = {};
    bookmarkedQuestions.clear();
    targetSlotForPalette = null;
    currentSlotIndices = [0];

    dom.sessionDetailModal?.classList.add('hidden');
    resetCompactUI();
    if (dom.leftPane) dom.leftPane.style.width = '50%';
    dom.quizSplitContainer?.classList.remove('hidden');
    dom.spectatorMultiContainer?.classList.add('hidden');
    dom.navCenterControls?.classList.remove('hide-global-tools');

    if (dom.quizTitle) dom.quizTitle.textContent = `📝 ${currentViewedDisplayIndex}회차 오답 복습`;
    
    switchScreen('quiz');
    renderQuestion();
}

function openChatModal(qIndex) {
    const q = currentFilteredQuestions[qIndex];
    if(!q) return;
    if (dom.chatProfessorName) dom.chatProfessorName.textContent = q.examiner ? `${q.examiner} 교수` : '익명 교수';
    dom.chatModal?.classList.remove('hidden'); 
    dom.chatInput?.focus();
}

let isDraggingMemo = false, memoOffsetX = 0, memoOffsetY = 0, currentMemoKey = '', originalMemoText = '';
function openMemoModal(qIndex) {
    const q = currentFilteredQuestions[qIndex];
    if(!q) return;
    currentMemoKey = getQKey(q); 
    if (dom.memoTitle) dom.memoTitle.textContent = `📝 Q. ${q.id} 메모장`;
    if (dom.memoTextarea) { dom.memoTextarea.value = ''; originalMemoText = ''; }
    
    if (db && dom.memoTextarea) {
        const req = db.transaction("memos", "readonly").objectStore("memos").get(currentMemoKey);
        req.onsuccess = () => { if (req.result) { dom.memoTextarea.value = req.result.content; originalMemoText = req.result.content; } };
    }
    dom.memoModal?.classList.remove('hidden'); dom.memoTextarea?.focus();
}

// 모든 이벤트 리스너에 방어적 null 체크 적용 (HTML 구조 불일치 시 JS 먹통 방지)
function setupEventListeners() {
    // [v3.0 추가] 로그인 로직 및 유효성 검사
    const handleLogin = async () => {
        const username = dom.loginUsername.value.trim();
        const password = dom.loginPassword.value.trim();
        const isNew = dom.loginIsNew.checked;

        if (!/^[가-힣a-zA-Z]{1,10}$/.test(username)) {
            alert("사용자 이름은 10글자 이내의 띄어쓰기 없는 한글/영어만 가능합니다."); return;
        }
        if (!/^\d{4}$/.test(password)) {
            alert("패스워드는 4자리 숫자여야 합니다."); return;
        }

        const docId = `${username}_${password}`;
        const userRef = dbFirestore.collection('users').doc(docId);

        try {
            const docSnap = await userRef.get();
            if (isNew) {
                if (docSnap.exists) { alert("이미 존재하는 계정입니다."); return; }
                await userRef.set({ username, createdAt: new Date().toISOString(), history: [] });
                alert("가입 및 로그인 성공!");
            } else {
                if (!docSnap.exists) { alert("아이디 or 패스워드를 확인해주세요"); return; }
                // 기존 데이터 로컬에 동기화
                const data = docSnap.data();
                if (data.history) localStorage.setItem('medicalQuizHistory', JSON.stringify(data.history));
            }
            
            currentUser = docId;
            dom.headerUsername.textContent = username;
            switchScreen('home');
        } catch (e) {
            console.error(e); alert("서버 통신 에러가 발생했습니다.");
        }
    };

    if (dom.btnLoginSubmit) dom.btnLoginSubmit.onclick = handleLogin;

    // [엔터키 로그인 기능 추가] 입력창에서 Enter 누르면 handleLogin 실행
    const triggerLoginOnEnter = (e) => { if (e.key === 'Enter') handleLogin(); };
    if (dom.loginUsername) dom.loginUsername.onkeypress = triggerLoginOnEnter;
    if (dom.loginPassword) dom.loginPassword.onkeypress = triggerLoginOnEnter;

    if (dom.btnLoginGuest) dom.btnLoginGuest.onclick = () => {
        currentUser = null;
        dom.headerUsername.textContent = "게스트";
        switchScreen('home');
    };
    
    dom.appModeRadios?.forEach(radio => radio.addEventListener('change', (e) => dom.spectatorOptions?.classList.toggle('hidden', e.target.value !== 'spectator')));
    
    // [v2.8 수정] 과목 선택 시 하위 필터 재생성 이벤트 분리 연동
    [dom.fExaminer, dom.fScope, dom.fErrorRate].forEach(el => el?.addEventListener('change', updateLiveCount));
    dom.fSubject?.addEventListener('change', () => {
        updateDependentHomeFilters();
        updateLiveCount();
    });

    if (dom.fIsIncorrectNote) dom.fIsIncorrectNote.addEventListener('change', (e) => { if(dom.fErrorRate) dom.fErrorRate.disabled = !e.target.checked; updateLiveCount(); });
    
    if (dom.btnStartQuiz) dom.btnStartQuiz.onclick = startQuiz;
    
    if (dom.btnExit) dom.btnExit.onclick = () => { if (confirm("정말 종료하시겠습니까? 진행 상황은 유실됩니다.")) { checkHistoryExist(); resetCompactUI(); switchScreen('home'); } };
    if (dom.btnGoHome) dom.btnGoHome.onclick = () => { checkHistoryExist(); resetCompactUI(); switchScreen('home'); };
    if (dom.btnDashHome) dom.btnDashHome.onclick = () => { checkHistoryExist(); resetCompactUI(); switchScreen('home'); };
    if (dom.btnDashboard) dom.btnDashboard.onclick = () => { resetCompactUI(); renderDashboardStats(); switchScreen('dashboard'); };
    
    if (dom.btnPrev) dom.btnPrev.onclick = () => { 
        if (spectatorSplit === 1) {
            if (currentQuestionIndex > 0) { currentQuestionIndex--; renderQuestion(); }
        } else {
            currentSlotIndices = currentSlotIndices.map(i => Math.max(0, i - spectatorSplit));
            renderMultiSpectatorView();
        }
    };
    
    if (dom.btnNext) dom.btnNext.onclick = () => { 
        if (spectatorSplit === 1) {
            if (currentQuestionIndex + 1 < currentFilteredQuestions.length) { currentQuestionIndex++; renderQuestion(); } 
            else finishQuiz(); 
        } else {
            const hasNext = currentSlotIndices.some(i => i + spectatorSplit < currentFilteredQuestions.length);
            if (!hasNext) {
                finishQuiz();
            } else {
                currentSlotIndices = currentSlotIndices.map(i => Math.min(i + spectatorSplit, currentFilteredQuestions.length - 1));
                renderMultiSpectatorView();
            }
        }
    };
    
    if (dom.btnConfirmNo) dom.btnConfirmNo.onclick = () => dom.confirmModal?.classList.add('hidden');
    if (dom.btnConfirmYes) dom.btnConfirmYes.onclick = executeFinishQuiz;
    
    if (dom.btnBookmark) dom.btnBookmark.onclick = () => { 
        const qKey = getQKey(currentFilteredQuestions[currentQuestionIndex]);
        bookmarkedQuestions.has(qKey) ? bookmarkedQuestions.delete(qKey) : bookmarkedQuestions.add(qKey); 
        dom.btnBookmark.classList.toggle('bookmarked', bookmarkedQuestions.has(qKey)); 
    };
    
    if (dom.btnPalette) dom.btnPalette.onclick = () => { buildPaletteGrid(); dom.paletteModal?.classList.remove('hidden'); };
    
    if (dom.btnClosePalette) dom.btnClosePalette.onclick = () => { dom.paletteModal?.classList.add('hidden'); targetSlotForPalette = null; };
    if (dom.btnSubmitEarly) dom.btnSubmitEarly.onclick = () => { dom.paletteModal?.classList.add('hidden'); finishQuiz(); };
    if (dom.btnCloseSessionDetail) dom.btnCloseSessionDetail.onclick = () => dom.sessionDetailModal?.classList.add('hidden');
    
    if (dom.btnRetakeIncorrect) dom.btnRetakeIncorrect.onclick = () => startRetakeSession(currentViewedRecordIndex);
    

    document.querySelectorAll('.dash-tab').forEach(tab => {
        tab.onclick = (e) => {
            document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.dash-view').forEach(v => { v.classList.remove('active'); v.classList.add('hidden'); });
            e.target.classList.add('active');
            const targetView = document.getElementById(e.target.dataset.target);
            if (targetView) {
                targetView.classList.remove('hidden'); targetView.classList.add('active');
            }
        };
    });
    
    // [v2.8 수정] 대시보드 과목 선택 시 하위 필터 재생성 이벤트 분리 연동
    [dom.dYear, dom.dExaminer, dom.dScope].forEach(el => el?.addEventListener('change', renderDashboardStats));
    dom.dSubject?.addEventListener('change', () => {
        updateDependentDashFilters();
        renderDashboardStats();
    });

    dom.fontSizeBtns?.forEach(btn => {
        btn.onclick = (e) => {
            dom.fontSizeBtns.forEach(b => b.classList.remove('active'));
            const t = e.target.closest('.btn-font'); t.classList.add('active');
            screens.quiz?.classList.remove('text-size-small', 'text-size-large');
            if (t.dataset.size !== 'default') screens.quiz?.classList.add(`text-size-${t.dataset.size}`);
        };
    });

    // [v2.6 수정] 이미지 드래그(Panning) 및 줌 기능 통합
    let currentScale = 1;
    let imgTranslateX = 0;
    let imgTranslateY = 0;
    let isDraggingImg = false;
    let startDragX = 0, startDragY = 0;

    const updateImageTransform = () => {
        if (dom.modalImg) dom.modalImg.style.transform = `translate(${imgTranslateX}px, ${imgTranslateY}px) scale(${currentScale})`;
    };

    if (dom.imageModal) {
        dom.imageModal.onclick = (e) => { 
            if (e.target.id !== 'modal-img') { 
                dom.imageModal.classList.add('hidden'); 
                if(dom.modalImg) {
                    dom.modalImg.src = ''; 
                    currentScale = 1; 
                    imgTranslateX = 0; 
                    imgTranslateY = 0;
                    updateImageTransform();
                } 
            } 
        };
        
        dom.imageModal.addEventListener('wheel', (e) => {
            if (dom.imageModal.classList.contains('hidden')) return;
            e.preventDefault();
            currentScale = Math.min(Math.max(0.5, currentScale + (e.deltaY < 0 ? 0.1 : -0.1)), 4);
            updateImageTransform();
        }, { passive: false });

        if (dom.modalImg) {
            dom.modalImg.onmousedown = (e) => {
                isDraggingImg = true;
                startDragX = e.clientX - imgTranslateX;
                startDragY = e.clientY - imgTranslateY;
                dom.modalImg.style.cursor = 'grabbing';
                e.preventDefault(); // 기본 이미지 드래그 방지
            };
        }

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingImg || dom.imageModal.classList.contains('hidden')) return;
            imgTranslateX = e.clientX - startDragX;
            imgTranslateY = e.clientY - startDragY;
            updateImageTransform();
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingImg) {
                isDraggingImg = false;
                if (dom.modalImg) dom.modalImg.style.cursor = 'grab';
            }
        });
    }

// [v3.3 수정] 리사이저 터치 및 마우스 드래그 이벤트 통합 지원
    let isDragging = false;
    if (dom.paneResizer) {
        const startResize = () => {
            isDragging = true;
            document.body.style.userSelect = 'none';
            dom.paneResizer.classList.add('dragging');
        };

        const performResize = (clientX) => {
            if (!isDragging || !dom.quizSplitContainer || !dom.leftPane) return;
            dom.leftPane.style.width = `${Math.max(20, Math.min(80, (clientX / dom.quizSplitContainer.offsetWidth) * 100))}%`;
        };

        const stopResize = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = '';
                dom.paneResizer?.classList.remove('dragging');
            }
        };

        // 데스크탑 마우스 이벤트
        dom.paneResizer.onmousedown = startResize;
        document.addEventListener('mousemove', (e) => performResize(e.clientX));
        document.addEventListener('mouseup', stopResize);

        // 태블릿/모바일 터치 이벤트
        dom.paneResizer.addEventListener('touchstart', startResize, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (isDragging) e.preventDefault(); // 스크롤 간섭 방지
            performResize(e.touches[0].clientX);
        }, { passive: false });
        document.addEventListener('touchend', stopResize);
    }

    document.addEventListener('keydown', (e) => {
        if (dom.confirmModal && !dom.confirmModal.classList.contains('hidden')) return;
        if (e.key === 'Escape') {
            if (dom.chatModal && !dom.chatModal.classList.contains('hidden')) dom.btnCloseChat?.click();
            else if (dom.memoModal && !dom.memoModal.classList.contains('hidden')) dom.btnCloseMemo?.click();
            else if (dom.paletteModal && !dom.paletteModal.classList.contains('hidden')) dom.btnClosePalette?.click();
            else if (dom.sessionDetailModal && !dom.sessionDetailModal.classList.contains('hidden')) dom.btnCloseSessionDetail?.click();
            return;
        }
        
        const isAnyModalOpen = (dom.imageModal && !dom.imageModal.classList.contains('hidden')) || 
                               (dom.paletteModal && !dom.paletteModal.classList.contains('hidden')) || 
                               (dom.sessionDetailModal && !dom.sessionDetailModal.classList.contains('hidden')) || 
                               (dom.chatModal && !dom.chatModal.classList.contains('hidden')) || 
                               (dom.memoModal && !dom.memoModal.classList.contains('hidden'));

        if (!screens.quiz?.classList.contains('active') || isAnyModalOpen) return;

        if (currentAppMode === 'quiz' && ['1', '2', '3', '4', '5'].includes(e.key)) {
            const optionBtns = document.querySelectorAll('.option-btn');
            if (optionBtns[parseInt(e.key) - 1]) optionBtns[parseInt(e.key) - 1].click();
        }
        if (e.key === 'ArrowLeft' && dom.btnPrev && !dom.btnPrev.disabled) dom.btnPrev.click();
        if (['ArrowRight', ' ', 'Enter'].includes(e.key)) { if (e.key !== 'ArrowRight') e.preventDefault(); if (dom.btnNext && !dom.btnNext.disabled) dom.btnNext.click(); }
    });

    if (dom.spectatorMultiContainer) {
        dom.spectatorMultiContainer.addEventListener('click', (e) => {
            const btnChange = e.target.closest('.btn-change');
            if (btnChange) {
                targetSlotForPalette = parseInt(btnChange.dataset.slot);
                buildPaletteGrid();
                dom.paletteModal?.classList.remove('hidden');
                return;
            }

            const btnPrevSlot = e.target.closest('.btn-prev-slot');
            if (btnPrevSlot) {
                const slotIndex = parseInt(btnPrevSlot.dataset.slot);
                if (currentSlotIndices[slotIndex] > 0) {
                    currentSlotIndices[slotIndex]--;
                    renderMultiSpectatorView();
                }
                return;
            }

            const btnNextSlot = e.target.closest('.btn-next-slot');
            if (btnNextSlot) {
                const slotIndex = parseInt(btnNextSlot.dataset.slot);
                if (currentSlotIndices[slotIndex] < currentFilteredQuestions.length - 1) {
                    currentSlotIndices[slotIndex]++;
                    renderMultiSpectatorView();
                }
                return;
            }

            const btnBmk = e.target.closest('.btn-bmk-slot');
            if (btnBmk) {
                const slotIndex = parseInt(btnBmk.dataset.slot);
                const qIdx = currentSlotIndices[slotIndex];
                const qKey = getQKey(currentFilteredQuestions[qIdx]); 
                bookmarkedQuestions.has(qKey) ? bookmarkedQuestions.delete(qKey) : bookmarkedQuestions.add(qKey);
                renderMultiSpectatorView(); 
                return;
            }

            const btnMemo = e.target.closest('.btn-memo-slot');
            if (btnMemo) {
                const slotIndex = parseInt(btnMemo.dataset.slot);
                openMemoModal(currentSlotIndices[slotIndex]);
                return;
            }

            const btnChat = e.target.closest('.btn-chat-slot');
            if (btnChat) {
                const slotIndex = parseInt(btnChat.dataset.slot);
                openChatModal(currentSlotIndices[slotIndex]);
                return;
            }

            // [v3.1 수정] 다중 관전 모드 원본 PDF 팝업 이벤트 (page_number 변수 적용)

// [v3.4 수정] 커스텀 PDF 뷰어 호출 및 구간(Start~End) 파라미터 유동적 계산
            const btnViewPdf = e.target.closest('.btn-view-pdf-slot');
            if (btnViewPdf) {
                const slotIndex = parseInt(btnViewPdf.dataset.slot);
                const targetQ = currentFilteredQuestions[currentSlotIndices[slotIndex]];
                if (targetQ) {
                    const startPage = targetQ.page_number || 1;
                    let endPage = startPage;
                    
                    // explanation 배열 내부의 page 값을 순회하여 가장 마지막 페이지 찾기
                    if (targetQ.explanation && targetQ.explanation.length > 0) {
                        const expPages = targetQ.explanation.map(exp => exp.page).filter(p => p != null);
                        if (expPages.length > 0) {
                            endPage = Math.max(startPage, ...expPages);
                        }
                    }
                    
                    const pdfUrl = `viewer.html?file=${encodeURIComponent(`./족보원본/${targetQ.originYear}_${targetQ.originSubject}.pdf`)}&start=${startPage}&end=${endPage}`;
                    window.open(pdfUrl, 'PDFViewerWindow', 'width=800,height=1000');
                }
                return;
            }
        });
    }

    if (dom.btnVentChat) dom.btnVentChat.onclick = () => openChatModal(currentQuestionIndex);
    if (dom.btnCloseChat) dom.btnCloseChat.onclick = () => { dom.chatModal?.classList.add('hidden'); if(dom.chatBody) dom.chatBody.innerHTML = '<div class="chat-notice">스트레스 해소용 화풀이 방입니다.<br>창을 닫으면 완전히 사라집니다.</div>'; if(dom.chatInput) dom.chatInput.value = ''; };
    
    const sendChat = () => {
        if(!dom.chatInput || !dom.chatBody) return;
        const text = dom.chatInput.value.trim(); if (!text) return;
        const bubble = document.createElement('div'); bubble.className = 'chat-bubble'; bubble.textContent = text;
        dom.chatBody.appendChild(bubble); dom.chatInput.value = ''; dom.chatBody.scrollTop = dom.chatBody.scrollHeight;
    };
    if (dom.btnSendChat) dom.btnSendChat.onclick = sendChat;
    if (dom.chatInput) dom.chatInput.onkeypress = (e) => { if (e.key === 'Enter') sendChat(); };

    if (dom.memoHeader) {
        dom.memoHeader.onmousedown = (e) => { isDraggingMemo = true; const rect = dom.memoModal.getBoundingClientRect(); memoOffsetX = e.clientX - rect.left; memoOffsetY = e.clientY - rect.top; dom.memoModal.style.margin = '0'; dom.memoModal.style.transform = 'none'; };
        document.addEventListener('mousemove', (e) => { if (!isDraggingMemo || !dom.memoModal) return; dom.memoModal.style.left = `${e.clientX - memoOffsetX}px`; dom.memoModal.style.top = `${e.clientY - memoOffsetY}px`; });
        document.addEventListener('mouseup', () => isDraggingMemo = false);
    }
    
    if (dom.btnMemo) dom.btnMemo.onclick = () => openMemoModal(currentQuestionIndex);
    if (dom.btnCloseMemo) dom.btnCloseMemo.onclick = () => { if (dom.memoTextarea && dom.memoTextarea.value !== originalMemoText && !confirm("저장되지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?")) return; dom.memoModal?.classList.add('hidden'); };
    if (dom.btnSaveMemo) dom.btnSaveMemo.onclick = () => {
        if (db && dom.memoTextarea) {
            const tx = db.transaction("memos", "readwrite");
            tx.objectStore("memos").put({ id: currentMemoKey, content: dom.memoTextarea.value });
            tx.oncomplete = () => { originalMemoText = dom.memoTextarea.value; alert('해당 문제의 메모가 브라우저에 영구 저장되었습니다!'); };
        }
    };

    // [v3.2 추가] 패치노트 모달 열기/닫기 로직
    if (dom.btnOpenPatchnote) {
        dom.btnOpenPatchnote.onclick = () => {
            if (dom.patchnoteContent) {
                dom.patchnoteContent.innerHTML = typeof PATCHNOTE_DATA !== 'undefined' ? PATCHNOTE_DATA : '패치노트 데이터가 없습니다.';
            }
            dom.patchnoteModal?.classList.remove('hidden');
        };
    }
    if (dom.btnClosePatchnote) {
        dom.btnClosePatchnote.onclick = () => dom.patchnoteModal?.classList.add('hidden');
    }
}

loadQuizData();