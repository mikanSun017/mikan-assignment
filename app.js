// ==========================================
// 1. 共通データ管理 (ローカルストレージ)
// ==========================================
let journalData = [];
function loadJournals() {
  const storedData = localStorage.getItem('myJournals');
  if (storedData) journalData = JSON.parse(storedData);
  journalData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
function saveJournals() {
  localStorage.setItem('myJournals', JSON.stringify(journalData));
}
loadJournals();

let habitsData = {};
function loadHabits() {
  const stored = localStorage.getItem('myHabits');
  if (stored) habitsData = JSON.parse(stored);
}
function saveHabits() {
  localStorage.setItem('myHabits', JSON.stringify(habitsData));
}
loadHabits();

let futureData = [];
function loadFutureLogs() {
  const storedData = localStorage.getItem('myFutureLogs');
  if (storedData) {
    futureData = JSON.parse(storedData);
    let modified = false;
    futureData.forEach(item => {
      if (!item.id) {
        item.id = 'future_' + Math.random().toString(36).substr(2, 9);
        modified = true;
      }
    });
    if (modified) saveFutureLogs();
  }
}
function saveFutureLogs() {
  localStorage.setItem('myFutureLogs', JSON.stringify(futureData));
}
loadFutureLogs(); 


// ==========================================
// 2. Monthly Log ページ (カレンダー) の処理
// ==========================================
const calendarGrid = document.getElementById('calendar-grid');
const monthYearDisplay = document.getElementById('current-month-year');
const monthlyGoalsList = document.getElementById('monthly-goals-list'); 

if (calendarGrid && monthYearDisplay) {
  let currentMonthDate = new Date(); 

  function renderCalendar() {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    monthYearDisplay.textContent = `${year}年 ${month + 1}月`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    calendarGrid.innerHTML = ''; 
    
    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);

    // 今月のFuture Log項目を取得してタスク化する
    const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const thisMonthGoals = futureData.filter(item => item.targetMonth === targetMonthStr);
    
    // Future Logのタスクのみ設定
    const allTasksForMonth = thisMonthGoals.map(item => ({ 
      id: item.id, 
      label: item.content, 
      class: 'mark-monthly-solid' 
    }));

    for (let i = 0; i < firstDay; i++) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'calendar-day empty';
      calendarGrid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= lastDate; day++) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'calendar-day';
      
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const numSpan = document.createElement('span');
      numSpan.className = 'day-number';
      numSpan.textContent = day;
      dayDiv.appendChild(numSpan);
      
      const marksDiv = document.createElement('div');
      marksDiv.className = 'day-marks';
      
      const dayHabits = habitsData[dateString] || {};
      
      allTasksForMonth.forEach(task => {
        if (dayHabits[task.id]) {
          const mark = document.createElement('div');
          mark.className = `mark-icon ${task.class}`;
          marksDiv.appendChild(mark);
        }
      });
      dayDiv.appendChild(marksDiv);
      
      if (isCurrentMonth && day === today.getDate()) {
        dayDiv.classList.add('today');
      }
      calendarGrid.appendChild(dayDiv);
    }
    
    renderMonthlyGoals();
  }

  // Future Log項目を毎日の習慣トラッカーとして描画
  function renderMonthlyGoals() {
    if (!monthlyGoalsList) return;
    monthlyGoalsList.innerHTML = '';

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth() + 1;
    const targetMonthStr = `${year}-${String(month).padStart(2, '0')}`;

    const thisMonthGoals = futureData.filter(item => item.targetMonth === targetMonthStr);

    if (thisMonthGoals.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'empty-item';
      emptyLi.style.color = '#999';
      emptyLi.style.fontSize = '1.1rem';
      emptyLi.textContent = 'Future Log に追加された予定はありません';
      monthlyGoalsList.appendChild(emptyLi);
      return;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (!habitsData[todayStr]) habitsData[todayStr] = {};

    thisMonthGoals.forEach(item => {
      const li = document.createElement('li');
      li.className = 'task-item';

      const isCompleted = !!habitsData[todayStr][item.id];

      const btn = document.createElement('button');
      btn.className = `task-checkbox mark-monthly-solid ${isCompleted ? 'completed' : ''}`;

      const label = document.createElement('span');
      label.className = 'task-label';
      label.textContent = item.content;

      btn.addEventListener('click', () => {
        habitsData[todayStr][item.id] = !habitsData[todayStr][item.id];
        saveHabits();
        renderMonthlyGoals(); 
        renderCalendar();     
      });

      li.appendChild(btn);
      li.appendChild(label);
      monthlyGoalsList.appendChild(li);
    });
  }

  document.getElementById('prev-month').addEventListener('click', () => {
    currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    renderCalendar();
  });

  renderCalendar();
}


// ==========================================
// 3. Daily Log ページ (書き込み) の処理
// ==========================================
const journalForm = document.getElementById('journal-form');
const journalInput = document.getElementById('journal-input');
const journalList = document.getElementById('journal-list');

if (journalForm && journalList) {
  function renderJournalList() {
    journalList.innerHTML = '';
    if (journalData.length === 0) {
      journalList.innerHTML = '<li style="text-align:center; color:#888;">まだ記録がありません。</li>';
      return;
    }
    journalData.forEach(item => {
      const li = document.createElement('li');
      const date = new Date(item.created_at);
      const dateStr = `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

      let badgeClass = 'free';
      if (item.attribute === 'To-be') badgeClass = 'to-be';
      if (item.attribute === 'To-do') badgeClass = 'to-do';

      li.innerHTML = `
        <span class="attr-badge ${badgeClass}">${item.attribute || '自由欄'}</span>
        <span class="journal-content">${item.content}</span>
        <span class="journal-date">${dateStr}</span>
      `;
      journalList.appendChild(li);
    });
  }

  renderJournalList();

  journalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = journalInput.value.trim();
    if (!content) return;
    const selectedAttr = document.querySelector('input[name="attribute"]:checked').value;
    journalData.unshift({
      content: content,
      attribute: selectedAttr,
      created_at: new Date().toISOString()
    });
    saveJournals();
    journalInput.value = '';
    renderJournalList();
  });
}

// ==========================================
// 4. Future Log ページ の処理
// ==========================================
const futureForm = document.getElementById('future-form');
const futureSelect = document.getElementById('future-month-select');
const futureInput = document.getElementById('future-input');
const futureGrid = document.getElementById('future-grid');

if (futureForm && futureGrid && futureSelect) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 

  const monthsList = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const yyyy = d.getFullYear();
    const mm = d.getMonth() + 1;
    const valueStr = `${yyyy}-${String(mm).padStart(2, '0')}`;
    const displayStr = `${yyyy}年 ${mm}月`;
    monthsList.push({ value: valueStr, display: displayStr });
  }

  monthsList.forEach(m => {
    const option = document.createElement('option');
    option.value = m.value;
    option.textContent = m.display;
    futureSelect.appendChild(option);
  });

  function renderFutureGrid() {
    futureGrid.innerHTML = '';
    monthsList.forEach(m => {
      const box = document.createElement('div');
      box.className = 'future-month-box';
      
      const title = document.createElement('div');
      title.className = 'future-month-title';
      title.textContent = m.display;
      box.appendChild(title);

      const ul = document.createElement('ul');
      ul.className = 'future-list';

      const monthData = futureData.filter(item => item.targetMonth === m.value);
      if (monthData.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.style.color = '#999';
        emptyLi.style.fontSize = '1rem';
        emptyLi.textContent = '予定なし';
        emptyLi.className = 'empty-item';
        ul.appendChild(emptyLi);
      } else {
        monthData.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item.content;
          ul.appendChild(li);
        });
      }
      box.appendChild(ul);
      futureGrid.appendChild(box);
    });
  }

  renderFutureGrid();

  futureForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = futureInput.value.trim();
    if (!content) return;
    const targetMonth = futureSelect.value;
    futureData.push({
      id: 'future_' + Date.now(),
      targetMonth: targetMonth,
      content: content,
      created_at: new Date().toISOString()
    });
    saveFutureLogs();
    futureInput.value = '';
    renderFutureGrid();
  });
}
