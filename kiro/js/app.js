// Storage Keys
const STORAGE = {
  TASKS: 'kiro-tasks',
  LINKS: 'kiro-links',
  NAME: 'kiro-name',
  THEME: 'kiro-theme',
  TIMER_MINUTES: 'kiro-timer-minutes',
  DAILY_NOTE: 'kiro-daily-note',
  HABITS: 'kiro-habits',
  POMODORO_STATS: 'kiro-pomodoro-stats',
  ALARM: 'kiro-alarm'
};

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Unable to save data locally:', error);
  }
}

function readJsonStorage(key, fallback) {
  try {
    const value = readStorage(key, null);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  writeStorage(key, JSON.stringify(value));
}

// DOM Elements
const greetingText = document.getElementById('greeting-text');
const dateDisplay = document.getElementById('date-display');
const timeDisplay = document.getElementById('time-display');
const nameInput = document.getElementById('name-input');
const saveNameBtn = document.getElementById('save-name');
const themeToggle = document.getElementById('theme-toggle');
const timerValue = document.getElementById('timer-value');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const timerInput = document.getElementById('timer-input');
const updateTimerBtn = document.getElementById('update-timer');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task');
const taskList = document.getElementById('task-list');
const clearCompletedBtn = document.getElementById('clear-completed');
const noteInput = document.getElementById('daily-note');
const saveNoteBtn = document.getElementById('save-note');
const clearNoteBtn = document.getElementById('clear-note');
const habitInput = document.getElementById('habit-input');
const addHabitBtn = document.getElementById('add-habit');
const habitList = document.getElementById('habit-list');
const sessionsCount = document.getElementById('sessions-count');
const totalMinutes = document.getElementById('total-minutes');
const todaySessions = document.getElementById('today-sessions');
const alarmInput = document.getElementById('alarm-time');
const setAlarmBtn = document.getElementById('set-alarm');
const clearAlarmBtn = document.getElementById('clear-alarm');
const alarmStatus = document.getElementById('alarm-status');
const resetStatsBtn = document.getElementById('reset-stats');
const linkName = document.getElementById('link-name');
const linkUrl = document.getElementById('link-url');
const addLinkBtn = document.getElementById('add-link');
const linkList = document.getElementById('link-list');

// Timer State
let timerMinutes = parseInt(readStorage(STORAGE.TIMER_MINUTES, '25'), 10) || 25;
let totalSeconds = timerMinutes * 60;
let remainingSeconds = totalSeconds;
let timerId = null;
let isRunning = false;
let alarmTime = readStorage(STORAGE.ALARM, '');
let alarmTriggered = false;

// Initialize
function init() {
  loadTheme();
  updateGreeting();
  setupClock();
  renderTasks();
  renderLinks();
  loadDailyNote();
  renderHabits();
  renderStats();
  renderAlarm();
  setupEventListeners();
  timerInput.value = timerMinutes;
}

// ============ Greeting & Clock ============
function setupClock() {
  updateClock();
  setInterval(() => {
    updateClock();
    checkAlarm();
  }, 1000);
}

function updateClock() {
  const now = new Date();
  
  // Update time
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
  
  // Update date
  const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  dateDisplay.textContent = now.toLocaleDateString('en-US', dateOptions);
  
  updateGreeting();
}

function updateGreeting() {
  const hours = new Date().getHours();
  let greeting = 'Good Morning';
  
  if (hours >= 12 && hours < 18) greeting = 'Good Afternoon';
  if (hours >= 18) greeting = 'Good Evening';
  
  const name = readStorage(STORAGE.NAME, '');
  greetingText.textContent = name ? `${greeting}, ${name}` : greeting;
}

// ============ Theme Toggle ============
function loadTheme() {
  const theme = readStorage(STORAGE.THEME, 'light');
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  writeStorage(STORAGE.THEME, newTheme);
  themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// ============ Timer Functions ============
function updateTimerDisplay() {
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');
  timerValue.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  startBtn.disabled = true;
  
  timerId = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();
    
    if (remainingSeconds <= 0) {
      stopTimer();
      recordPomodoroSession();
      alert('Focus session complete! Great work! 🎉');
      resetTimer();
    }
  }, 1000);
}

function stopTimer() {
  isRunning = false;
  clearInterval(timerId);
  startBtn.disabled = false;
}

function resetTimer() {
  stopTimer();
  remainingSeconds = timerMinutes * 60;
  updateTimerDisplay();
}

function updateTimerMinutes() {
  const newMinutes = parseInt(timerInput.value);
  if (newMinutes > 0 && newMinutes <= 60) {
    timerMinutes = newMinutes;
    writeStorage(STORAGE.TIMER_MINUTES, String(timerMinutes));
    resetTimer();
  }
}

function recordPomodoroSession() {
  const stats = getPomodoroStats();
  const today = new Date().toISOString().slice(0, 10);
  stats.sessions += 1;
  stats.totalMinutes += timerMinutes;
  if (stats.lastCompletedDate !== today) {
    stats.todaySessions = 1;
  } else {
    stats.todaySessions += 1;
  }
  stats.lastCompletedDate = today;
  savePomodoroStats(stats);
  renderStats();
}

function getPomodoroStats() {
  return readJsonStorage(STORAGE.POMODORO_STATS, { sessions: 0, totalMinutes: 0, todaySessions: 0, lastCompletedDate: '' });
}

function savePomodoroStats(stats) {
  writeJsonStorage(STORAGE.POMODORO_STATS, stats);
}

function renderStats() {
  const stats = getPomodoroStats();
  const today = new Date().toISOString().slice(0, 10);
  if (stats.lastCompletedDate !== today) {
    stats.todaySessions = 0;
    stats.lastCompletedDate = today;
    savePomodoroStats(stats);
  }
  sessionsCount.textContent = stats.sessions;
  totalMinutes.textContent = stats.totalMinutes;
  todaySessions.textContent = stats.todaySessions;
}

function resetStats() {
  savePomodoroStats({ sessions: 0, totalMinutes: 0, todaySessions: 0, lastCompletedDate: '' });
  renderStats();
}

// ============ Task Functions ============
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  
  const tasks = getTasks();
  
  // Prevent duplicates
  if (tasks.some(t => t.text.toLowerCase() === text.toLowerCase())) {
    alert('This task already exists!');
    return;
  }
  
  tasks.unshift({
    id: Date.now(),
    text: text,
    completed: false
  });
  
  saveTasks(tasks);
  taskInput.value = '';
  renderTasks();
}

function deleteTask(id) {
  const tasks = getTasks();
  const filtered = tasks.filter(t => t.id !== id);
  saveTasks(filtered);
  renderTasks();
}

function toggleTask(id) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks(tasks);
    renderTasks();
  }
}

function getTasks() {
  return readJsonStorage(STORAGE.TASKS, []);
}

function saveTasks(tasks) {
  writeJsonStorage(STORAGE.TASKS, tasks);
}

function clearCompletedTasks() {
  const tasks = getTasks().filter(task => !task.completed);
  saveTasks(tasks);
  renderTasks();
}

function renderTasks() {
  const tasks = getTasks().sort((a, b) => {
    // Uncompleted tasks first
    if (a.completed !== b.completed) {
      return a.completed - b.completed;
    }
    // Most recent first
    return b.id - a.id;
  });
  
  taskList.innerHTML = '';
  
  if (tasks.length === 0) {
    taskList.innerHTML = '<li class="empty-state">No tasks yet. Add one to get started.</li>';
    return;
  }
  
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleTask(task.id));
    
    const textSpan = document.createElement('span');
    textSpan.className = `task-text ${task.completed ? 'completed' : ''}`;
    textSpan.textContent = task.text;
    
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    actions.appendChild(deleteBtn);
    
    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(actions);
    
    taskList.appendChild(li);
  });
}

// ============ Daily Note Functions ============
function loadDailyNote() {
  noteInput.value = readStorage(STORAGE.DAILY_NOTE, '');
}

function saveDailyNote() {
  writeStorage(STORAGE.DAILY_NOTE, noteInput.value);
}

function clearDailyNote() {
  noteInput.value = '';
  writeStorage(STORAGE.DAILY_NOTE, '');
}

// ============ Habit Functions ============
function addHabit() {
  const name = habitInput.value.trim();
  if (!name) return;

  const habits = getHabits();
  if (habits.some(habit => habit.name.toLowerCase() === name.toLowerCase())) {
    alert('This habit already exists!');
    return;
  }

  habits.push({ id: Date.now(), name, completedDates: [] });
  saveHabits(habits);
  habitInput.value = '';
  renderHabits();
}

function toggleHabit(id) {
  const habits = getHabits();
  const habit = habits.find(item => item.id === id);
  if (!habit) return;

  const today = new Date().toISOString().slice(0, 10);
  if (habit.completedDates.includes(today)) {
    habit.completedDates = habit.completedDates.filter(date => date !== today);
  } else {
    habit.completedDates.push(today);
  }

  saveHabits(habits);
  renderHabits();
}

function getHabits() {
  return readJsonStorage(STORAGE.HABITS, []);
}

function saveHabits(habits) {
  writeJsonStorage(STORAGE.HABITS, habits);
}

function renderHabits() {
  const habits = getHabits();
  habitList.innerHTML = '';

  if (habits.length === 0) {
    habitList.innerHTML = '<li class="empty-state">No habits yet. Add one to build momentum.</li>';
    return;
  }

  habits.forEach(habit => {
    const li = document.createElement('li');
    li.className = 'habit-item';

    const label = document.createElement('span');
    label.className = 'habit-name';
    label.textContent = habit.name;

    const meta = document.createElement('span');
    meta.className = 'habit-meta';
    meta.textContent = `${calculateStreak(habit.completedDates)} day streak`;

    const button = document.createElement('button');
    button.textContent = habit.completedDates.includes(new Date().toISOString().slice(0, 10)) ? 'Done' : 'Mark';
    button.className = habit.completedDates.includes(new Date().toISOString().slice(0, 10)) ? 'done' : '';
    button.addEventListener('click', () => toggleHabit(habit.id));

    li.appendChild(label);
    li.appendChild(meta);
    li.appendChild(button);
    habitList.appendChild(li);
  });
}

function calculateStreak(completedDates) {
  const uniqueDates = [...new Set(completedDates)].sort();
  if (!uniqueDates.length) return 0;

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (uniqueDates.includes(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ============ Alarm Functions ============
function renderAlarm() {
  alarmInput.value = alarmTime;
  if (!alarmTime) {
    alarmStatus.textContent = 'No alarm set.';
    return;
  }
  alarmStatus.textContent = `Alarm set for ${alarmTime}.`;
}

function setAlarm() {
  const value = alarmInput.value;
  alarmTime = value;
  writeStorage(STORAGE.ALARM, value);
  renderAlarm();

  if (value && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function clearAlarm() {
  alarmTime = '';
  writeStorage(STORAGE.ALARM, '');
  alarmInput.value = '';
  renderAlarm();
}

function checkAlarm() {
  if (!alarmTime) return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (currentTime === alarmTime && !alarmTriggered) {
    alarmTriggered = true;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus Alarm', { body: `Time to focus at ${alarmTime}.` });
    } else {
      alert(`Alarm triggered at ${alarmTime}`);
    }
  }

  if (currentTime !== alarmTime) {
    alarmTriggered = false;
  }
}

// ============ Link Functions ============
function addLink() {
  const name = linkName.value.trim();
  const url = linkUrl.value.trim();
  
  if (!name || !url) return;
  
  // Validate URL
  try {
    new URL(url);
  } catch {
    alert('Please enter a valid URL');
    return;
  }
  
  const links = getLinks();
  links.unshift({
    id: Date.now(),
    name: name,
    url: url
  });
  
  saveLinks(links);
  linkName.value = '';
  linkUrl.value = '';
  renderLinks();
}

function removeLink(id) {
  const links = getLinks();
  const filtered = links.filter(l => l.id !== id);
  saveLinks(filtered);
  renderLinks();
}

function getLinks() {
  return readJsonStorage(STORAGE.LINKS, []);
}

function saveLinks(links) {
  writeJsonStorage(STORAGE.LINKS, links);
}

function renderLinks() {
  let links = getLinks();
  
  // Default links if empty
  if (links.length === 0) {
    links = [
      { id: 1, name: 'Google', url: 'https://google.com' },
      { id: 2, name: 'Gmail', url: 'https://gmail.com' },
      { id: 3, name: 'Calendar', url: 'https://calendar.google.com' }
    ];
    saveLinks(links);
  }
  
  linkList.innerHTML = '';
  
  links.forEach(link => {
    const div = document.createElement('div');
    div.className = 'link-item';
    
    const btn = document.createElement('button');
    btn.className = 'link-btn';
    btn.textContent = link.name;
    btn.addEventListener('click', () => {
      window.open(link.url, '_blank');
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'link-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeLink(link.id);
    });
    
    div.appendChild(btn);
    div.appendChild(removeBtn);
    linkList.appendChild(div);
  });
}

// ============ Name Handler ============
function saveName() {
  const name = nameInput.value.trim();
  if (name) {
    writeStorage(STORAGE.NAME, name);
    updateGreeting();
    nameInput.value = '';
  }
}

// ============ Event Listeners ============
function setupEventListeners() {
  saveNameBtn.addEventListener('click', saveName);
  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveName();
  });
  
  themeToggle.addEventListener('click', toggleTheme);
  
  startBtn.addEventListener('click', startTimer);
  stopBtn.addEventListener('click', stopTimer);
  resetBtn.addEventListener('click', resetTimer);
  updateTimerBtn.addEventListener('click', updateTimerMinutes);
  timerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') updateTimerMinutes();
  });
  
  addTaskBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
  clearCompletedBtn.addEventListener('click', clearCompletedTasks);

  saveNoteBtn.addEventListener('click', saveDailyNote);
  clearNoteBtn.addEventListener('click', clearDailyNote);
  noteInput.addEventListener('input', saveDailyNote);

  addHabitBtn.addEventListener('click', addHabit);
  habitInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addHabit();
  });

  setAlarmBtn.addEventListener('click', setAlarm);
  clearAlarmBtn.addEventListener('click', clearAlarm);
  resetStatsBtn.addEventListener('click', resetStats);
  
  addLinkBtn.addEventListener('click', addLink);
  linkUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addLink();
  });
}

// Start the app
init();
