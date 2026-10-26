// ==========================================
// デジタル・バレットジャーナル Supabase完全対応版
// ==========================================

// --- Supabase クライアント初期化 ---
const SUPABASE_URL = 'https://bopkvfzuuftgekcjxgej.supabase.co'; // お使いのSupabase URL
const SUPABASE_ANON_KEY = 'sb_publishable_bMr8qxjYHSke1KowDbkbYA_QAyTDC49'; // ※ご自身のanon/publicキーを入力してください

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // ドロワーUIの開閉ロジック
  // ==========================================
  const tabs = document.querySelectorAll('.tab-btn');
  const drawers = document.querySelectorAll('.drawer-panel');
  const overlay = document.getElementById('drawer-overlay');
  const closeBtns = document.querySelectorAll('.close-drawer-btn');

  function openDrawer(targetId) {
    closeAllDrawers();
    document.getElementById(targetId).classList.add('open');
    overlay.classList.add('show');
  }

  function closeAllDrawers() {
    drawers.forEach(drawer => drawer.classList.remove('open'));
    overlay.classList.remove('show');
    
    tabs.forEach(t => t.classList.remove('active'));
    const defaultTab = document.querySelector('[data-target="view-monthly"]');
    if (defaultTab) defaultTab.classList.add('active');
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = tab.getAttribute('data-target');
      
      if (targetId === 'view-monthly') {
        closeAllDrawers();
      } else {
        openDrawer(targetId);
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      }
    });
  });

  overlay.addEventListener('click', closeAllDrawers);
  closeBtns.forEach(btn => btn.addEventListener('click', closeAllDrawers));

  window.switchView = function(targetId) {
    if (targetId === 'view-monthly') {
      closeAllDrawers();
    } else {
      openDrawer(targetId);
      tabs.forEach(t => t.classList.remove('active'));
      const activeTab = document.querySelector(`[data-target="${targetId}"]`);
      if(activeTab) activeTab.classList.add('active');
    }
  };

  // ==========================================
  // 1. 共通データ管理 (Supabase)
  // ==========================================
  let journalData = [];
  let futureData = [];
  let customNotesData = [];

  // --- Daily Log 通信 ---
  async function loadJournals() {
    const { data, error } = await supabaseClient
      .from('journals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('journals load error:', error);
      return;
    }
    journalData = data || [];
    renderJournalList();
  }

  // --- Future Log 通信 ---
  async function loadFutureLogs() {
    const { data, error } = await supabaseClient
      .from('future_logs')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('future_logs load error:', error);
      return;
    }
    futureData = data || [];
    renderFutureGrid();
    renderMonthlyLog(); // タスク連携更新
  }

  // --- Custom Log (付箋) 通信 ---
  async function loadCustomNotes() {
    const { data, error } = await supabaseClient
      .from('custom_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('custom_notes load error:', error);
      return;
    }
    customNotesData = data || [];
    renderCustomNotes();
  }

  // --- Monthly Log 通信 ---
  let currentDate = new Date(); 
  const MONTH_NAMES_EN = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const DAY_NAMES_JA = ["S", "M", "T", "W", "T", "F", "S"];

  function getMonthKey() {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  async function loadMonthlyRecord(monthKey) {
    const { data, error } = await supabaseClient
      .from('monthly_data')
      .select('*')
      .eq('month_key', monthKey)
      .maybeSingle();

    if (error) console.error('monthly_data load error:', error);

    return data || {
      month_key: monthKey,
      logs: {},
      habit_items: [], // デフォルト空
      habit_data: {},
      graph_data: {},
      tasks: [{ id: 't1', text: '初期サンプルタスク', status: 0 }]
    };
  }

  async function updateMonthlyRecord(monthKey, payload) {
    const { error } = await supabaseClient
      .from('monthly_data')
      .upsert({ month_key: monthKey, ...payload });

    if (error) console.error('monthly_data save error:', error);
  }

  // ==========================================
  // 2. Monthly Log
  // ==========================================
  let activeModalDay = null;

  async function renderMonthlyLog() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); 
    const monthKey = getMonthKey();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const titleEn = document.getElementById('month-title-en');
    const titleJp = document.getElementById('month-title-jp');
    if(titleEn) titleEn.textContent = MONTH_NAMES_EN[month];
    if(titleJp) titleJp.textContent = `${year}年 ${month + 1}月`;

    const currentMonthly = await loadMonthlyRecord(monthKey);
    const logTexts = currentMonthly.logs || {};
    const habitItems = currentMonthly.habit_items || [];
    const habitData = currentMonthly.habit_data || {};
    const graphData = currentMonthly.graph_data || {};
    const taskList = currentMonthly.tasks || [];

    const dateLogsContainer = document.getElementById('date-log-rows-container');
    const habitHeaderRow = document.getElementById('habit-header-row');
    const habitRowsContainer = document.getElementById('habit-rows-container');
    
    if(!dateLogsContainer) return;

    dateLogsContainer.innerHTML = '';
    habitHeaderRow.innerHTML = '';
    habitRowsContainer.innerHTML = '';

    // 習慣ヘッダー
    habitItems.forEach((item, habitIdx) => {
      const hDiv = document.createElement('div');
      hDiv.className = 'habit-col-header';
      hDiv.textContent = item;
      hDiv.title = 'クリックで項目を削除';
      hDiv.addEventListener('click', async () => {
        if (confirm(`習慣項目「${item}」を削除しますか？`)) {
          habitItems.splice(habitIdx, 1);
          await updateMonthlyRecord(monthKey, { habit_items: habitItems });
          renderMonthlyLog();
        }
      });
      habitHeaderRow.appendChild(hDiv);
    });

    const addHBtn = document.createElement('button');
    addHBtn.className = 'habit-add-btn';
    addHBtn.textContent = '＋';
    addHBtn.addEventListener('click', async () => {
      const name = prompt('追加する習慣名を入力してください:');
      if (name && name.trim()) {
        habitItems.push(name.trim());
        await updateMonthlyRecord(monthKey, { habit_items: habitItems });
        renderMonthlyLog();
      }
    });
    habitHeaderRow.appendChild(addHBtn);

    // 各日の行生成
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay(); 
      const rowDiv = document.createElement('div');
      rowDiv.className = 'date-log-row';

      let dayClass = '';
      if (dayOfWeek === 0) dayClass = 'day-sun';
      if (dayOfWeek === 6) dayClass = 'day-sat';

      const dateCell = document.createElement('div');
      dateCell.className = `date-cell ${dayClass}`;
      dateCell.innerHTML = `<span class="day-num">${day}</span><span>${DAY_NAMES_JA[dayOfWeek]}</span>`;
      
      dateCell.title = 'この日の Daily Log を開く';
      dateCell.addEventListener('click', () => {
        const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (typeof window.setDailyDate === 'function') {
          window.setDailyDate(new Date(formattedDate));
        }
        window.switchView('view-daily');
      });

      const logInput = document.createElement('input');
      logInput.type = 'text';
      logInput.className = 'log-input';
      logInput.value = logTexts[day] || '';
      logInput.placeholder = '...';
      logInput.addEventListener('change', async (e) => {
        logTexts[day] = e.target.value;
        await updateMonthlyRecord(monthKey, { logs: logTexts });
      });

      rowDiv.appendChild(dateCell);
      rowDiv.appendChild(logInput);
      dateLogsContainer.appendChild(rowDiv);

      const hRowDiv = document.createElement('div');
      hRowDiv.className = 'habit-row';
      habitItems.forEach(item => {
        const cell = document.createElement('div');
        cell.className = 'habit-cell';
        const isFilled = habitData[day] && habitData[day][item];
        if (isFilled) cell.classList.add('filled');

        cell.addEventListener('click', async () => {
          if (!habitData[day]) habitData[day] = {};
          habitData[day][item] = !habitData[day][item];
          await updateMonthlyRecord(monthKey, { habit_data: habitData });
          cell.classList.toggle('filled');
        });
        hRowDiv.appendChild(cell);
      });
      habitRowsContainer.appendChild(hRowDiv);
    }

    // グラフBG
    const graphBgGrid = document.getElementById('graph-bg-grid');
    graphBgGrid.innerHTML = '';
    for (let day = 1; day <= daysInMonth; day++) {
      const gRow = document.createElement('div');
      gRow.className = 'graph-row';
      for (let c = 0; c < 4; c++) {
        const guide = document.createElement('div');
        guide.className = 'graph-col-guide';
        gRow.appendChild(guide);
      }
      gRow.addEventListener('click', () => openGraphModal(day, graphData[day] || {}));
      graphBgGrid.appendChild(gRow);
    }

    setTimeout(() => renderGraphSVG(daysInMonth, graphData), 50);
    renderTaskList(monthKey, taskList);
  }

  function renderGraphSVG(daysInMonth, graphData) {
    const svg = document.getElementById('graph-svg');
    const container = document.getElementById('graph-body');
    if(!svg || !container) return;
    
    const width = container.clientWidth;
    const rowHeight = 32; 

    svg.setAttribute('width', width);
    svg.setAttribute('height', daysInMonth * rowHeight);
    svg.innerHTML = '';

    const moodPoints = [];
    const sleepPoints = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const entry = graphData[day];
      const y = (day - 0.5) * rowHeight; 
      if (entry) {
        if (entry.mood !== undefined && entry.mood !== '') {
          const mVal = parseFloat(entry.mood);
          moodPoints.push({ x: ((mVal + 2) / 4) * (width - 24) + 12, y: y });
        }
        if (entry.sleep !== undefined && entry.sleep !== '') {
          const sVal = parseFloat(entry.sleep);
          sleepPoints.push({ x: ((sVal - 4) / 4) * (width - 24) + 12, y: y });
        }
      }
    }

    if (moodPoints.length > 1) {
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', moodPoints.map(p => `${p.x},${p.y}`).join(' '));
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', '#2b2b2b');
      polyline.setAttribute('stroke-width', '2');
      svg.appendChild(polyline);
    }
    moodPoints.forEach(p => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y);
      circle.setAttribute('r', '4'); circle.setAttribute('fill', '#2b2b2b');
      svg.appendChild(circle);
    });

    if (sleepPoints.length > 1) {
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', sleepPoints.map(p => `${p.x},${p.y}`).join(' '));
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', '#2b6cb0');
      polyline.setAttribute('stroke-width', '2');
      polyline.setAttribute('stroke-dasharray', '3,3');
      svg.appendChild(polyline);
    }
    sleepPoints.forEach(p => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y);
      circle.setAttribute('r', '4'); circle.setAttribute('fill', '#2b6cb0');
      svg.appendChild(circle);
    });
  }

  function renderTaskList(monthKey, taskList) {
    const ul = document.getElementById('task-list');
    if(!ul) return;
    ul.innerHTML = '';

    const thisMonthFutures = futureData.filter(f => f.target_month === monthKey);
    thisMonthFutures.forEach(f => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.innerHTML = `<span style="font-size:0.8rem; background:${f.color || 'var(--color-future)'}; color:white; padding:1px 6px; border-radius:10px;">Future</span>
                      <span class="task-text">${f.content}</span>`;
      ul.appendChild(li);
    });

    taskList.forEach((t, idx) => {
      const li = document.createElement('li');
      li.className = 'task-item';
      const box = document.createElement('div');
      box.className = `task-checkbox-box status-${t.status || 0}`;
      box.addEventListener('click', async () => {
        t.status = ((t.status || 0) + 1) % 3;
        await updateMonthlyRecord(monthKey, { tasks: taskList });
        renderTaskList(monthKey, taskList);
      });
      const span = document.createElement('span');
      span.className = `task-text ${t.status === 2 ? 'completed' : ''}`;
      span.textContent = t.text;
      const delBtn = document.createElement('button');
      delBtn.className = 'task-del-btn';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', async () => {
        taskList.splice(idx, 1);
        await updateMonthlyRecord(monthKey, { tasks: taskList });
        renderTaskList(monthKey, taskList);
      });
      li.appendChild(box); li.appendChild(span); li.appendChild(delBtn);
      ul.appendChild(li);
    });
  }

  const taskForm = document.getElementById('task-form');
  if(taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('task-input');
      if (!input.value.trim()) return;
      const monthKey = getMonthKey();
      const currentMonthly = await loadMonthlyRecord(monthKey);
      const taskList = currentMonthly.tasks || [];
      taskList.push({ id: 't_' + Date.now(), text: input.value.trim(), status: 0 });
      await updateMonthlyRecord(monthKey, { tasks: taskList });
      input.value = '';
      renderTaskList(monthKey, taskList);
    });
  }

  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  if(prevMonthBtn) prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderMonthlyLog(); });
  if(nextMonthBtn) nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderMonthlyLog(); });

  const modal = document.getElementById('graph-modal');
  const moodSelect = document.getElementById('mood-select');
  const sleepSelect = document.getElementById('sleep-select');
  
  window.openGraphModal = function(day, currentVal) {
    activeModalDay = day;
    document.getElementById('modal-date-title').textContent = `${currentDate.getMonth() + 1}月${day}日 の記録`;
    if(moodSelect) moodSelect.value = currentVal.mood !== undefined ? currentVal.mood : '';
    if(sleepSelect) sleepSelect.value = currentVal.sleep !== undefined ? currentVal.sleep : '';
    if(modal) modal.classList.add('show');
  };

  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');
  if(modalCancelBtn) modalCancelBtn.addEventListener('click', () => modal.classList.remove('show'));
  if(modalSaveBtn) {
    modalSaveBtn.addEventListener('click', async () => {
      if (!activeModalDay) return;
      const monthKey = getMonthKey();
      const currentMonthly = await loadMonthlyRecord(monthKey);
      const graphData = currentMonthly.graph_data || {};
      graphData[activeModalDay] = { mood: moodSelect.value, sleep: sleepSelect.value };
      await updateMonthlyRecord(monthKey, { graph_data: graphData });
      modal.classList.remove('show');
      renderMonthlyLog();
    });
  }

  // ==========================================
  // 3. Daily Log
  // ==========================================
  const journalForm = document.getElementById('journal-form');
  const journalInput = document.getElementById('journal-input');
  const journalList = document.getElementById('journal-list');
  const currentDailyDateDisplay = document.getElementById('current-daily-date');
  
  let currentDailyDate = new Date();
  
  window.setDailyDate = function(date) {
    currentDailyDate = date;
    renderJournalList();
  };

  function renderJournalList() {
    if(!journalList) return;
    journalList.innerHTML = '';
    
    if (currentDailyDateDisplay) {
      currentDailyDateDisplay.textContent = `${currentDailyDate.getFullYear()}年${currentDailyDate.getMonth() + 1}月${currentDailyDate.getDate()}日`;
    }
    const targetDateStr = `${currentDailyDate.getFullYear()}-${String(currentDailyDate.getMonth() + 1).padStart(2, '0')}-${String(currentDailyDate.getDate()).padStart(2, '0')}`;
    const dailyItems = journalData.filter(item => item.created_at.split('T')[0] === targetDateStr);

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

  if (journalList) {
    journalList.addEventListener('click', async (e) => {
      if (e.target.classList.contains('journal-delete')) {
        const id = e.target.getAttribute('data-id');
        if (confirm('この記録を削除してもよろしいですか？')) {
          const { error } = await supabaseClient
            .from('journals')
            .delete()
            .eq('id', id);

          if (!error) {
            journalData = journalData.filter(item => item.id !== id);
            renderJournalList();
          }
        }
      }
    });
  }

  if (journalForm) {
    journalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!journalInput.value.trim()) return;
      const selectedAttr = document.querySelector('input[name="attribute"]:checked').value;
      const saveDate = new Date(currentDailyDate);
      const now = new Date();
      saveDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const newJournal = {
        id: 'journal_' + Date.now(),
        content: journalInput.value.trim(),
        attribute: selectedAttr,
        created_at: saveDate.toISOString()
      };

      const { error } = await supabaseClient
        .from('journals')
        .insert([newJournal]);

      if (!error) {
        journalData.unshift(newJournal);
        journalInput.value = '';
        renderJournalList();
      }
    });
  }

  const prevDailyBtn = document.getElementById('prev-daily-btn');
  const nextDailyBtn = document.getElementById('next-daily-btn');
  if(prevDailyBtn) prevDailyBtn.addEventListener('click', () => { currentDailyDate.setDate(currentDailyDate.getDate() - 1); renderJournalList(); });
  if(nextDailyBtn) nextDailyBtn.addEventListener('click', () => { currentDailyDate.setDate(currentDailyDate.getDate() + 1); renderJournalList(); });

  // ==========================================
  // 4. Future Log
  // ==========================================
  const futureForm = document.getElementById('future-form');
  const futureSelect = document.getElementById('future-month-select');
  const futureInput = document.getElementById('future-input');
  const futureColorInput = document.getElementById('future-color-input');
  const futureGrid = document.getElementById('future-grid');

  function renderFutureGrid() {
    if(!futureGrid) return;
    
    if(futureSelect && futureSelect.options.length === 0) {
      const ty = new Date().getFullYear();
      const tm = new Date().getMonth();
      for (let i = 0; i < 6; i++) {
        const d = new Date(ty, tm + i, 1);
        const opt = document.createElement('option');
        opt.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        opt.textContent = `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
        futureSelect.appendChild(opt);
      }
    }

    futureGrid.innerHTML = '';
    Array.from(futureSelect.options).forEach(opt => {
      const box = document.createElement('div');
      box.className = 'future-month-box';
      box.innerHTML = `<div class="future-month-title">${opt.textContent}</div>`;
      
      const ul = document.createElement('ul');
      ul.className = 'future-list';
      const monthData = futureData.filter(item => item.target_month === opt.value);
      
      if (monthData.length === 0) {
        ul.innerHTML = '<li class="empty-item" style="color:#999; font-size:1rem;">予定なし</li>';
      } else {
        monthData.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = `
            <div style="display:flex; align-items:center;">
              <span class="color-dot" style="background-color:${item.color || '#9b59b6'};"></span>
              <span>${item.content}</span>
            </div>
            <button class="delete-btn" data-id="${item.id}">×</button>
          `;
          ul.appendChild(li);
        });
      }
      box.appendChild(ul);
      futureGrid.appendChild(box);
    });
  }

  if (futureGrid) {
    futureGrid.addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-btn')) {
        const id = e.target.getAttribute('data-id');
        if (confirm(`この予定を削除してもよろしいですか？`)) {
          const { error } = await supabaseClient
            .from('future_logs')
            .delete()
            .eq('id', id);

          if (!error) {
            futureData = futureData.filter(f => f.id !== id);
            renderFutureGrid();
            renderMonthlyLog();
          }
        }
      }
    });
  }

  if (futureForm) {
    futureForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!futureInput.value.trim()) return;

      const newFuture = {
        id: 'future_' + Date.now(),
        target_month: futureSelect.value,
        content: futureInput.value.trim(),
        color: futureColorInput ? futureColorInput.value : '#9b59b6',
        created_at: new Date().toISOString()
      };

      const { error } = await supabaseClient
        .from('future_logs')
        .insert([newFuture]);

      if (!error) {
        futureData.push(newFuture);
        futureInput.value = '';
        renderFutureGrid();
        renderMonthlyLog();
      }
    });
  }

  // ==========================================
  // 5. Custom Log
  // ==========================================
  const canvas = document.getElementById('drawing-canvas');
  const customNotesGallery = document.getElementById('custom-notes-gallery');

  function renderCustomNotes() {
    if (!customNotesGallery) return;
    customNotesGallery.innerHTML = '';
    
    customNotesData.forEach(note => {
      const card = document.createElement('div');
      card.style.cssText = "border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px; background: #fff; width: 220px; box-shadow: 2px 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 8px;";
      
      const dateObj = new Date(note.created_at);
      const dateStr = `${dateObj.getFullYear()}/${String(dateObj.getMonth()+1).padStart(2,'0')}/${String(dateObj.getDate()).padStart(2,'0')} ${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}`;
      
      let badgeColor = "#eee";
      if (note.category === 'アイデア案') badgeColor = "#ffeaa7";
      if (note.category === '落書き') badgeColor = "#81ecec";
      
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="background: ${badgeColor}; color: #333; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; font-weight: bold;">${note.category}</span>
          <button class="delete-note-btn" data-id="${note.id}" style="background: none; border: none; color: #ff7675; cursor: pointer; font-size: 1.2rem; line-height: 1;" title="削除">×</button>
        </div>
        <img src="${note.image}" style="width: 100%; height: auto; border: 1px solid #f1f2f6; border-radius: 4px; background: #fdfdfd;">
        <div style="font-size: 0.7rem; color: #999; text-align: right;">${dateStr}</div>
      `;
      customNotesGallery.appendChild(card);
    });
  }

  if (customNotesGallery) {
    customNotesGallery.addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-note-btn')) {
        const id = e.target.getAttribute('data-id');
        if (confirm('この付箋を削除してもよろしいですか？')) {
          const { error } = await supabaseClient
            .from('custom_notes')
            .delete()
            .eq('id', id);

          if (!error) {
            customNotesData = customNotesData.filter(n => n.id !== id);
            renderCustomNotes();
          }
        }
      }
    });
  }

  if (canvas) {
    const ctx = canvas.getContext('2d');
    const penColorInput = document.getElementById('pen-color');
    const penWidthInput = document.getElementById('pen-width');
    const eraserBtn = document.getElementById('eraser-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-canvas-btn');
    const categorySelect = document.getElementById('canvas-category');
    
    let isDrawing = false, isEraser = false, lastX = 0, lastY = 0;

    window.resizeCanvas = function() {
      const rect = canvas.getBoundingClientRect();
      if(rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    window.addEventListener('resize', window.resizeCanvas);

    function startDrawing(e) {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      lastY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    }

    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault(); 
      const rect = canvas.getBoundingClientRect();
      const currentX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const currentY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = isEraser ? '#ffffff' : penColorInput.value;
      ctx.lineWidth = isEraser ? Number(penWidthInput.value) * 3 : penWidthInput.value;
      ctx.stroke();

      lastX = currentX; lastY = currentY;
    }

    function stopDrawing() { isDrawing = false; }

    canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    if(eraserBtn) eraserBtn.addEventListener('click', () => { isEraser = !isEraser; eraserBtn.classList.toggle('active-tool', isEraser); });
    if(clearBtn) clearBtn.addEventListener('click', () => {
      if (confirm('キャンバスを全消去しますか？')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    if(penColorInput) penColorInput.addEventListener('input', () => { isEraser = false; eraserBtn.classList.remove('active-tool'); });

    if(saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const dataURL = canvas.toDataURL();
        const newNote = {
          id: 'c_note_' + Date.now(),
          image: dataURL,
          category: categorySelect ? categorySelect.value : 'その他',
          created_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
          .from('custom_notes')
          .insert([newNote]);

        if (!error) {
          customNotesData.unshift(newNote);
          renderCustomNotes();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    }
  } 

  // ==========================================
  // 初期化実行 (初回データ読み込み)
  // ==========================================
  window.addEventListener('resize', () => {
    const monthKey = getMonthKey();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    loadMonthlyRecord(monthKey).then(m => renderGraphSVG(daysInMonth, m.graph_data || {}));
  });

  async function initApp() {
    await loadJournals();
    await loadFutureLogs();
    await loadCustomNotes();
    await renderMonthlyLog();
    if (typeof window.resizeCanvas === 'function') {
      window.resizeCanvas();
    }

    const jumpDateStr = localStorage.getItem('jumpToDate');
    if (jumpDateStr) {
      window.setDailyDate(new Date(jumpDateStr));
      localStorage.removeItem('jumpToDate');
      window.switchView('view-daily');
    } else {
      window.switchView('view-monthly');
    }
  }

  initApp();

});
