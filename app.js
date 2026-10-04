// HTML要素の取得
const form = document.getElementById('journal-form');
const input = document.getElementById('journal-input');
const list = document.getElementById('journal-list');
const calendarGrid = document.getElementById('calendar-grid');
const monthYearDisplay = document.getElementById('current-month-year');
const tabButtons = document.querySelectorAll('.tab-btn');

// アプリの状態
let journalData = []; 
let currentMonthDate = new Date(); 
let selectedDateString = null; 
let currentTabFilter = 'all'; // 現在選択されているタブ（all, To-be, To-do, 自由欄）

// ① データを読み込む関数（ダミーデータも属性付きに変更）
function loadJournals() {
  const storedData = localStorage.getItem('myJournals');
  
  if (storedData) {
    journalData = JSON.parse(storedData);
  } else {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    journalData = [
      { content: "スマホを見る代わりに書き出した", attribute: "自由欄", created_at: `${year}-${month}-01T10:00:00Z` },
      { content: "落ち着いて行動できる自分になる", attribute: "To-be", created_at: now.toISOString() },
      { content: "帰りの電車で本を10ページ読む", attribute: "To-do", created_at: now.toISOString() }
    ];
    saveJournals();
  }

  journalData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  renderCalendar();
  renderJournalList();
}

function saveJournals() {
  localStorage.setItem('myJournals', JSON.stringify(journalData));
}

// ② カレンダー描画 (変更なし)
function renderCalendar() {
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  monthYearDisplay.textContent = `${year}年 ${month + 1}月`;

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  calendarGrid.innerHTML = ''; 

  const recordDates = new Set(journalData.map(item => {
    const d = new Date(item.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }));

  for (let i = 0; i < firstDay; i++) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'calendar-day empty';
    calendarGrid.appendChild(emptyDiv);
  }

  for (let day = 1; day <= lastDate; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    dayDiv.textContent = day;

    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (recordDates.has(dateString)) dayDiv.classList.add('has-record');
    if (selectedDateString === dateString) dayDiv.classList.add('selected');

    dayDiv.addEventListener('click', () => {
      selectedDateString = (selectedDateString === dateString) ? null : dateString;
      renderCalendar(); 
      renderJournalList(); 
    });
    calendarGrid.appendChild(dayDiv);
  }
}

// ③ ジャーナリング一覧を描画する関数 (属性での絞り込みとバッジ表示を追加)
function renderJournalList() {
  list.innerHTML = '';
  let displayData = journalData;

  // 1. カレンダーの日付で絞り込み
  if (selectedDateString) {
    displayData = displayData.filter(item => {
      const d = new Date(item.created_at);
      const itemDateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return itemDateString === selectedDateString;
    });
  }

  // 2. タブ（属性）で絞り込み
  if (currentTabFilter !== 'all') {
    displayData = displayData.filter(item => item.attribute === currentTabFilter);
  }

  if (displayData.length === 0) {
    list.innerHTML = '<li style="text-align:center; color:#888;">この条件の記録はありません</li>';
    return;
  }

  displayData.forEach(item => {
    const li = document.createElement('li');
    const date = new Date(item.created_at);
    const dateStr = date.toLocaleString('ja-JP', { 
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    // 属性に応じたCSSクラスを判定
    let badgeClass = 'free';
    if (item.attribute === 'To-be') badgeClass = 'to-be';
    if (item.attribute === 'To-do') badgeClass = 'to-do';

    li.innerHTML = `
      <span class="attr-badge ${badgeClass}">${item.attribute || '自由欄'}</span>
      <span class="journal-content">${item.content}</span>
      <span class="journal-date" style="width: 100%;">${dateStr}</span>
    `;
    list.appendChild(li);
  });
}

// ④ フォーム送信時の処理 (選択された属性を保存)
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const content = input.value.trim();
  if (!content) return;

  // ラジオボタンで選択されている属性の値を取得
  const selectedAttr = document.querySelector('input[name="attribute"]:checked').value;

  journalData.unshift({
    content: content,
    attribute: selectedAttr,
    created_at: new Date().toISOString()
  });

  saveJournals(); 
  input.value = '';
  
  renderCalendar();
  renderJournalList();
});

// ⑤ タブボタンの切り替え処理
tabButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    // 全てのタブからactiveクラスを外し、クリックされたタブに付与
    tabButtons.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');

    // フィルター状態を更新してリストを再描画
    currentTabFilter = e.target.getAttribute('data-filter');
    renderJournalList();
  });
});

// ⑥ カレンダーの月切り替え処理
document.getElementById('prev-month').addEventListener('click', () => {
  currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('next-month').addEventListener('click', () => {
  currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
  renderCalendar();
});

// アプリ起動
loadJournals();
