// ==========================================
// 1. 共通データ管理 (ローカルストレージ)
// ==========================================
let journalData = [];
function loadJournals() {
  const storedData = localStorage.getItem('myJournals');
  if (storedData) {
    journalData = JSON.parse(storedData);
    let modified = false;
    journalData.forEach(item => {
      if (!item.id) {
        item.id = 'journal_' + Math.random().toString(36).substr(2, 9);
        modified = true;
      }
    });
    if (modified) saveJournals();
  }
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
      // 過去のデータに色がない場合はデフォルトの紫色を設定
      if (!item.color) {
        item.color = '#9b59b6';
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

    const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const thisMonthGoals = futureData.filter(item => item.targetMonth === targetMonthStr);
    
    // カスタムカラーをタスクに渡す
    const allTasksForMonth = thisMonthGoals.map(item => ({ 
      id: item.id, 
      label: item.content, 
      color: item.color || '#9b59b6'
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
          mark.className = 'mark-icon'; 
          // 選択された色を直接背景色に設定
          mark.style.backgroundColor = task.color;
          marksDiv.appendChild(mark);
        }
      });
      dayDiv.appendChild(marksDiv);
      
      if (isCurrentMonth && day === today.getDate()) {
        dayDiv.classList.add('today');
      }

      dayDiv.style.cursor = 'pointer';
      dayDiv.addEventListener('click', () => {
        localStorage.setItem('jumpToDate', dateString);
        window.location.href = 'daily.html'; 
      });

      calendarGrid.appendChild(dayDiv);
    }
    
    renderMonthlyGoals();
  }

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
      const itemColor = item.color || '#9b59b6';

      const btn = document.createElement('button');
      btn.className = `task-checkbox ${isCompleted ? 'completed' : ''}`;
      
      // カスタムカラーを適用（枠線は常に色付き、完了時は背景も色付き）
      btn.style.border = `2px solid ${itemColor}`;
      if (isCompleted) {
        btn.style.backgroundColor = itemColor;
      } else {
        btn.style.backgroundColor = 'transparent';
      }

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

const prevDailyBtn = document.getElementById('prev-daily-btn');
const nextDailyBtn = document.getElementById('next-daily-btn');
const currentDailyDateDisplay = document.getElementById('current-daily-date');

if (journalForm && journalList) {
  let currentDailyDate = new Date(); 

  const jumpDateStr = localStorage.getItem('jumpToDate');
  if (jumpDateStr) {
    currentDailyDate = new Date(jumpDateStr);
    localStorage.removeItem('jumpToDate');
  }

  function formatDateToYMD(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function renderJournalList() {
    journalList.innerHTML = '';
    
    if (currentDailyDateDisplay) {
      currentDailyDateDisplay.textContent = `${currentDailyDate.getFullYear()}年${currentDailyDate.getMonth() + 1}月${currentDailyDate.getDate()}日`;
    }

    const targetDateStr = formatDateToYMD(currentDailyDate);

    const dailyItems = journalData.filter(item => {
      const itemDateStr = item.created_at.split('T')[0]; 
      return itemDateStr === targetDateStr;
    });

    if (dailyItems.length === 0) {
      journalList.innerHTML = '<li style="text-align:center; color:#888;">この日の記録はありません。</li>';
      return;
    }

    dailyItems.forEach(item => {
      const li = document.createElement('li');
      const date = new Date(item.created_at);
      const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

      let badgeClass = 'free';
      if (item.attribute === 'To-be') badgeClass = 'to-be';
      if (item.attribute === 'To-do') badgeClass = 'to-do';

      li.innerHTML = `
        <span class="attr-badge ${badgeClass}">${item.attribute || '自由欄'}</span>
        <span class="journal-content">${item.content}</span>
        <span class="journal-date">${timeStr}</span>
        <button class="delete-btn journal-delete" data-id="${item.id}">×</button>
      `;
      journalList.appendChild(li);
    });
  }

  journalList.addEventListener('click', (e) => {
    if (e.target.classList.contains('journal-delete')) {
      const id = e.target.getAttribute('data-id');
      if (confirm('この記録を削除してもよろしいですか？')) {
        journalData = journalData.filter(item => item.id !== id);
        saveJournals();
        renderJournalList();
      }
    }
  });

  if (prevDailyBtn) {
    prevDailyBtn.addEventListener('click', () => {
      currentDailyDate.setDate(currentDailyDate.getDate() - 1);
      renderJournalList();
    });
  }
  
  if (nextDailyBtn) {
    nextDailyBtn.addEventListener('click', () => {
      currentDailyDate.setDate(currentDailyDate.getDate() + 1);
      renderJournalList();
    });
  }

  renderJournalList();

  journalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = journalInput.value.trim();
    if (!content) return;
    const selectedAttr = document.querySelector('input[name="attribute"]:checked').value;
    
    const now = new Date();
    const saveDate = new Date(currentDailyDate);
    saveDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const offset = saveDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(saveDate.getTime() - offset)).toISOString().slice(0, -1);

    journalData.unshift({
      id: 'journal_' + Date.now(),
      content: content,
      attribute: selectedAttr,
      created_at: localISOTime
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
const futureColorInput = document.getElementById('future-color-input'); // カラー入力を取得
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
          
          // ▼ 追加：選択した色の色玉をテキストの横に表示 ▼
          const wrapDiv = document.createElement('div');
          wrapDiv.style.display = 'flex';
          wrapDiv.style.alignItems = 'center';

          const colorDot = document.createElement('span');
          colorDot.className = 'color-dot';
          colorDot.style.backgroundColor = item.color || '#9b59b6';
          
          const textSpan = document.createElement('span');
          textSpan.textContent = item.content;

          wrapDiv.appendChild(colorDot);
          wrapDiv.appendChild(textSpan);
          // ▲ 追加ここまで ▲

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-btn';
          deleteBtn.textContent = '×';
          deleteBtn.addEventListener('click', () => {
            if (confirm(`「${item.content}」を削除してもよろしいですか？`)) {
              futureData = futureData.filter(f => f.id !== item.id);
              saveFutureLogs();
              renderFutureGrid();
            }
          });

          li.appendChild(wrapDiv);
          li.appendChild(deleteBtn);
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
    
    // 選択された色を取得（未選択時は紫）
    const selectedColor = futureColorInput ? futureColorInput.value : '#9b59b6';

    futureData.push({
      id: 'future_' + Date.now(),
      targetMonth: targetMonth,
      content: content,
      color: selectedColor, // 色情報を保存
      created_at: new Date().toISOString()
    });
    saveFutureLogs();
    futureInput.value = '';
    renderFutureGrid();
  });
}

// ==========================================
// 5. Custom Log (お絵描きキャンバス) の処理
// ==========================================
const canvas = document.getElementById('drawing-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const penColorInput = document.getElementById('pen-color');
  const penWidthInput = document.getElementById('pen-width');
  const eraserBtn = document.getElementById('eraser-btn');
  const clearBtn = document.getElementById('clear-btn');

  let isDrawing = false;
  let isEraser = false;
  let lastX = 0;
  let lastY = 0;

  // キャンバスの解像度調整（高解像度ディスプレイ対応）
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // 保存されている画像があれば再描画
    loadCanvasImage();
  }

  function saveCanvasImage() {
    localStorage.setItem('customCanvasImage', canvas.toDataURL());
  }

  function loadCanvasImage() {
    const dataURL = localStorage.getItem('customCanvasImage');
    if (dataURL) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = dataURL;
    }
  }

  // 初期化時にサイズ調整
  window.addEventListener('resize', resizeCanvas);
  // 少し遅らせて初期化（要素のレンダリングを確実に待つ）
  setTimeout(resizeCanvas, 50);

  function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    lastX = clientX - rect.left;
    lastY = clientY - rect.top;
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault(); // スマホでの画面スクロール防止

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isEraser) {
      ctx.strokeStyle = '#ffffff'; // 消しゴムは白で塗りつぶす
      ctx.lineWidth = Number(penWidthInput.value) * 3; // 消しゴムは少し太め
    } else {
      ctx.strokeStyle = penColorInput.value;
      ctx.lineWidth = penWidthInput.value;
    }

    ctx.stroke();

    lastX = currentX;
    lastY = currentY;
  }

  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      saveCanvasImage(); // 描画が終わるたびに保存
    }
  }

  // マウスイベント
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // タッチイベント（スマホ・タブレット対応）
  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);

  // ツールボタンの操作
  eraserBtn.addEventListener('click', () => {
    isEraser = !isEraser;
    eraserBtn.classList.toggle('active-tool', isEraser);
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('キャンバスの絵をすべて消去してもよろしいですか？')) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      localStorage.removeItem('customCanvasImage');
    }
  });

  // 色や太さが変わったら消しゴムを解除
  penColorInput.addEventListener('input', () => {
    isEraser = false;
    eraserBtn.classList.remove('active-tool');
  });
}
