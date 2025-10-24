class PomodoroTimer {
  constructor() {
    this.settings = {
      focusTime: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakInterval: 4,
      autoStartPomodoro: false,
      autoStartBreaks: false,
      autoStopPomodoro: false,
      alarmEnabled: true,
      notificationSound: "Bell",
      timeFormat24h: true,
    };

    this.currentState = "focus"; // 'focus', 'shortBreak', 'longBreak'
    this.currentSession = 1;
    this.isRunning = false;
    this.timeLeft = this.settings.focusTime * 60;
    this.timer = null;

    this.stats = {
      totalPomodoros: 0,
      todayPomodoros: 0,
      totalFocusTime: 0,
      lastSessionDate: null,
      sessionHistory: [],
    };

    this.currentSessionStart = null;

    this.initializeElements();
    this.loadSettings();
    this.loadStats();
    this.updateDisplay();
    this.updateSessionHistoryTable();
    this.bindEvents();
  }

  initializeElements() {
    // Settings elements
    this.focusTimeInput = document.getElementById("focusTime");
    this.shortBreakInput = document.getElementById("shortBreak");
    this.longBreakInput = document.getElementById("longBreak");
    this.longBreakIntervalInput = document.getElementById("longBreakInterval");
    this.autoStartPomodoroInput = document.getElementById("autoStartPomodoro");
    this.autoStartBreaksInput = document.getElementById("autoStartBreaks");
    this.autoStopPomodoroInput = document.getElementById("autoStopPomodoro");
    this.alarmEnabledInput = document.getElementById("alarmEnabled");

    // Timer elements
    this.timeDisplay = document.getElementById("timeDisplay");
    this.currentSessionDisplay = document.getElementById("currentSession");
    this.timerCircle = document.querySelector(".timer-circle");
    this.startBtn = document.getElementById("startBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.nextBtn = document.getElementById("nextBtn");

    // Audio element
    this.notificationSound = document.getElementById("notificationSound");
    this.alarmSoundSelect = document.getElementById("alarmSoundSelect");
    this.darkModeSwitch = document.getElementById("darkModeSwitch");
    this.timeFormatSwitch = document.getElementById("timeFormatSwitch");

    // WebAudio context for generated tones (fallback to audio element)
    this.audioContext = null;

    // Stats elements
    this.totalPomodorosDisplay = document.getElementById("totalPomodoros");
    this.todayPomodorosDisplay = document.getElementById("todayPomodoros");
    this.totalFocusTimeDisplay = document.getElementById("totalFocusTime");
    this.resetStatsBtn = document.getElementById("resetStats");

    // Session history elements
    this.sessionHistoryBody = document.getElementById("sessionHistoryBody");
    this.noSessionsMessage = document.getElementById("noSessionsMessage");
    this.copyHistoryBtn = document.getElementById("copyHistoryBtn");

    // Tab elements
    this.tabButtons = document.querySelectorAll(".tab-button");
    this.tabContents = document.querySelectorAll(".tab-content");
  }

  bindEvents() {
    this.startBtn.addEventListener("click", () => this.startTimer());
    this.pauseBtn.addEventListener("click", () => this.pauseTimer());
    this.resetBtn.addEventListener("click", () => this.resetTimer());
    this.nextBtn.addEventListener("click", () => this.completeSession());
    this.resetStatsBtn.addEventListener("click", () => this.resetStats());

    // Auto-save settings on change
    this.focusTimeInput.addEventListener("change", () => this.saveSettings());
    this.shortBreakInput.addEventListener("change", () => this.saveSettings());
    this.longBreakInput.addEventListener("change", () => this.saveSettings());
    this.longBreakIntervalInput.addEventListener("change", () =>
      this.saveSettings()
    );
    this.autoStartPomodoroInput.addEventListener("change", () =>
      this.saveSettings()
    );
    this.autoStartBreaksInput.addEventListener("change", () =>
      this.saveSettings()
    );
    this.autoStopPomodoroInput.addEventListener("change", () =>
      this.saveSettings()
    );
    this.alarmEnabledInput.addEventListener("change", () =>
      this.saveSettings()
    );
    this.alarmSoundSelect.addEventListener("change", () => this.saveSettings());
    this.darkModeSwitch.addEventListener("change", () => {
      this.saveSettings();
      this.applyDarkMode();
    });
    this.timeFormatSwitch.addEventListener("change", () => {
      this.saveSettings();
      this.updateSessionHistoryTable();
    });

    this.copyHistoryBtn.addEventListener("click", () =>
      this.copySessionHistory()
    );

    // Tab switching events
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", (e) =>
        this.switchTab(e.target.dataset.tab)
      );
    });
  }

  saveSettings() {
    this.settings.focusTime = parseInt(this.focusTimeInput.value);
    this.settings.shortBreak = parseInt(this.shortBreakInput.value);
    this.settings.longBreak = parseInt(this.longBreakInput.value);
    this.settings.longBreakInterval = parseInt(
      this.longBreakIntervalInput.value
    );
    this.settings.autoStartPomodoro = this.autoStartPomodoroInput.checked;
    this.settings.autoStartBreaks = this.autoStartBreaksInput.checked;
    this.settings.autoStopPomodoro = this.autoStopPomodoroInput.checked;
    this.settings.alarmEnabled = this.alarmEnabledInput.checked;
    this.settings.notificationSound = this.alarmSoundSelect.value;
    this.settings.darkMode = this.darkModeSwitch.checked;
    this.settings.timeFormat24h = this.timeFormatSwitch.checked;

    localStorage.setItem("pomodoroSettings", JSON.stringify(this.settings));

    // Reset timer if not running
    if (!this.isRunning) {
      this.resetTimer();
    }

    this.showNotification("Settings saved!");
  }

  loadSettings() {
    const savedSettings = localStorage.getItem("pomodoroSettings");
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }

    // Update timeLeft to match the loaded focus time setting if timer is not running
    if (!this.isRunning && this.currentState === "focus") {
      this.timeLeft = this.settings.focusTime * 60;
    }

    this.focusTimeInput.value = this.settings.focusTime;
    this.shortBreakInput.value = this.settings.shortBreak;
    this.longBreakInput.value = this.settings.longBreak;
    this.longBreakIntervalInput.value = this.settings.longBreakInterval;
    this.autoStartPomodoroInput.checked = this.settings.autoStartPomodoro;
    this.autoStartBreaksInput.checked = this.settings.autoStartBreaks;
    this.autoStopPomodoroInput.checked = this.settings.autoStopPomodoro;
    this.alarmEnabledInput.checked = this.settings.alarmEnabled;
    this.alarmSoundSelect.value = this.settings.notificationSound || "Bell";
    if (this.darkModeSwitch) {
      this.darkModeSwitch.checked = !!this.settings.darkMode;
      this.applyDarkMode();
    }
    if (this.timeFormatSwitch) {
      this.timeFormatSwitch.checked = !!this.settings.timeFormat24h;
    }
  }

  applyDarkMode() {
    if (this.darkModeSwitch && this.darkModeSwitch.checked) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }

  saveStats() {
    localStorage.setItem("pomodoroStats", JSON.stringify(this.stats));
  }

  loadStats() {
    const savedStats = localStorage.getItem("pomodoroStats");
    if (savedStats) {
      const loadedStats = JSON.parse(savedStats);
      this.stats = { ...this.stats, ...loadedStats };
    }

    // Ensure sessionHistory exists
    if (!this.stats.sessionHistory) {
      this.stats.sessionHistory = [];
    }

    // Reset today's count if it's a new day
    const today = new Date().toDateString();
    if (this.stats.lastSessionDate !== today) {
      this.stats.todayPomodoros = 0;
      this.stats.lastSessionDate = today;
    }

    this.updateStatsDisplay();
  }

  startTimer() {
    this.isRunning = true;
    this.startBtn.disabled = true;
    this.pauseBtn.disabled = false;
    this.nextBtn.disabled = false;
    this.timerCircle.classList.add("active");

    // Record session start time for focus sessions
    if (this.currentState === "focus") {
      this.currentSessionStart = new Date();
    }

    this.playNotification();

    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft <= 0) {
        // If autoStopPomodoro is true, auto-complete the session when timer reaches 0.
        if (this.settings.autoStopPomodoro) {
          this.completeSession();
          return;
        }

        if (this.timeLeft === 0) {
          this.playNotification();
        }
      }
    }, 1000);
  }

  pauseTimer() {
    this.isRunning = false;
    this.startBtn.disabled = false;
    this.pauseBtn.disabled = true;
    this.nextBtn.disabled = true;
    this.timerCircle.classList.remove("active");

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  resetTimer() {
    this.pauseTimer();
    this.currentState = "focus";
    this.currentSession = 1;
    this.timeLeft = this.settings.focusTime * 60;
    this.updateDisplay();
    this.updateTimerCircleClass();
  }

  completeSession() {
    if (!this.isRunning) {
      return; // Only allow next when timer is running
    }

    // Calculate elapsed time and add to focus time if it's a focus session
    if (this.currentState === "focus") {
      const originalTime = this.settings.focusTime * 60;
      const elapsedTime = Math.ceil((originalTime - this.timeLeft) / 60); // Convert to minutes

      if (elapsedTime > 0) {
        if (elapsedTime > this.settings.focusTime) {
          this.stats.totalPomodoros++;
          this.stats.todayPomodoros++;
        }

        this.stats.totalFocusTime += elapsedTime;
        this.stats.lastSessionDate = new Date().toDateString();

        // Add to session history
        this.addSessionToHistory(elapsedTime);

        this.showNotification(
          `Added ${elapsedTime} minutes to your focus time!`
        );
      }
    }

    this.pauseTimer();
    this.playNotification();

    // Immediately transition to next session
    if (this.currentState === "focus") {
      if (this.currentSession % this.settings.longBreakInterval === 0) {
        this.currentState = "longBreak";
        this.timeLeft = this.settings.longBreak * 60;
        this.showNotification(
          `Great job! Take a ${this.settings.longBreak}-minute long break.`
        );
      } else {
        this.currentState = "shortBreak";
        this.timeLeft = this.settings.shortBreak * 60;
        this.showNotification(
          `Well done! Take a ${this.settings.shortBreak}-minute short break.`
        );
      }

      // Auto-start breaks if enabled after 3 seconds delay
      if (this.settings.autoStartBreaks) {
        setTimeout(() => {
          this.startTimer();
          this.showNotification("Break started automatically!");
        }, 3000);
      }
    } else {
      // Completed a break session
      this.currentState = "focus";
      this.timeLeft = this.settings.focusTime * 60;
      this.currentSession++;
      this.showNotification(
        `Break over! Time to focus for ${this.settings.focusTime} minutes.`
      );

      // Auto-start focus sessions if enabled after 3 seconds delay
      if (this.settings.autoStartPomodoro) {
        setTimeout(() => {
          this.startTimer();
          this.showNotification("Focus session started automatically!");
        }, 3000);
      }
    }

    this.saveStats();
    this.updateDisplay();
    this.updateStatsDisplay();
    this.updateTimerCircleClass();
  }

  updateDisplay() {
    const sign = this.timeLeft < 0 ? "-" : "";
    const absSeconds = Math.abs(this.timeLeft);
    const minutes = Math.floor(absSeconds / 60);
    const seconds = absSeconds % 60;
    this.timeDisplay.textContent = `${sign}${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    let sessionText = "";
    switch (this.currentState) {
      case "focus":
        sessionText = `Focus Time - Session ${this.currentSession}`;
        break;
      case "shortBreak":
        sessionText = "Short Break";
        break;
      case "longBreak":
        sessionText = "Long Break";
        break;
    }
    this.currentSessionDisplay.textContent = sessionText;

    // Update page title
    document.title = `${this.timeDisplay.textContent} - ${sessionText} | Pomodoro Timer`;
  }

  updateTimerCircleClass() {
    this.timerCircle.classList.remove("focus", "short-break", "long-break");
    switch (this.currentState) {
      case "focus":
        this.timerCircle.classList.add("focus");
        break;
      case "shortBreak":
        this.timerCircle.classList.add("short-break");
        break;
      case "longBreak":
        this.timerCircle.classList.add("long-break");
        break;
    }
  }

  updateStatsDisplay() {
    this.totalPomodorosDisplay.textContent = this.stats.totalPomodoros;
    this.todayPomodorosDisplay.textContent = this.stats.todayPomodoros;

    const hours = Math.floor(this.stats.totalFocusTime / 60);
    const minutes = this.stats.totalFocusTime % 60;
    this.totalFocusTimeDisplay.textContent = `${hours}h ${minutes}m`;
  }

  resetStats() {
    if (
      confirm(
        "Are you sure you want to reset all statistics? This action cannot be undone."
      )
    ) {
      this.stats = {
        totalPomodoros: 0,
        todayPomodoros: 0,
        totalFocusTime: 0,
        lastSessionDate: null,
        sessionHistory: [],
      };
      this.saveStats();
      this.updateStatsDisplay();
      this.updateSessionHistoryTable();
      this.showNotification("Statistics reset successfully!");
    }
  }

  playNotification() {
    // Try to play the audio notification only if alarms are enabled
    if (this.settings.alarmEnabled) {
      // Try WebAudio for short generated sounds; if unavailable, use audio element fallback
      try {
        if (!this.audioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) this.audioContext = new AudioContext();
        }

        const sound = this.settings.notificationSound || "Bell";

        if (this.audioContext) {
          const ctx = this.audioContext;
          const now = ctx.currentTime;

          // Simple implementations for a few named sounds using oscillators
          if (sound === "Bell") {
            const o1 = ctx.createOscillator();
            const o2 = ctx.createOscillator();
            const g = ctx.createGain();
            o1.type = "sine";
            o2.type = "sine";
            o1.frequency.setValueAtTime(1200, now);
            o2.frequency.setValueAtTime(600, now);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
            o1.connect(g);
            o2.connect(g);
            g.connect(ctx.destination);
            o1.start(now);
            o2.start(now);
            o1.stop(now + 1.0);
            o2.stop(now + 1.0);
          } else if (sound === "Beep") {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(1000, now);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(now);
            o.stop(now + 0.15);
          } else if (sound === "Chime") {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(880, now);
            o.frequency.exponentialRampToValueAtTime(440, now + 0.7);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(now);
            o.stop(now + 1.2);
          } else {
            // fallback to audio element
            this.notificationSound.currentTime = 0;
            this.notificationSound
              .play()
              .catch((e) => console.log("Could not play fallback sound:", e));
          }
        } else {
          // No WebAudio available, use existing audio element
          this.notificationSound.currentTime = 0;
          this.notificationSound
            .play()
            .catch((e) => console.log("Could not play audio element:", e));
        }
      } catch (e) {
        console.log("Error playing notification sound:", e);
      }
    }
  }

  showNotification(message) {
    // Create a simple toast notification
    const notification = document.createElement("div");
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4a5568;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = "translateX(400px)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  switchTab(tabId) {
    // Remove active class from all tab buttons and contents
    this.tabButtons.forEach((button) => button.classList.remove("active"));
    this.tabContents.forEach((content) => content.classList.remove("active"));

    // Add active class to clicked tab button
    const clickedButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (clickedButton) {
      clickedButton.classList.add("active");
    }

    // Show corresponding tab content
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
      targetTab.classList.add("active");
    }
  }

  addSessionToHistory(focusMinutes) {
    if (!this.currentSessionStart) {
      this.currentSessionStart = new Date(
        Date.now() - focusMinutes * 60 * 1000
      );
    }

    const endTime = new Date();
    const startTime = this.currentSessionStart;

    const sessionEntry = {
      date: startTime.toISOString().split("T")[0], // YYYY-MM-DD format
      startTime: startTime.toTimeString().slice(0, 5), // HH:MM format
      endTime: endTime.toTimeString().slice(0, 5), // HH:MM format
      focusMinutes: focusMinutes,
      remark: "",
    };

    this.stats.sessionHistory.unshift(sessionEntry); // Add to beginning

    // Keep only last 50 sessions to prevent excessive data
    if (this.stats.sessionHistory.length > 50) {
      this.stats.sessionHistory = this.stats.sessionHistory.slice(0, 50);
    }

    this.currentSessionStart = null;
    this.saveStats();
    this.updateSessionHistoryTable();
  }

  _formatTime(time24h) {
    // time24h should be in format "HH:MM"
    if (this.settings.timeFormat24h) {
      return time24h; // Keep 24-hour format
    }

    const [hours, minutes] = time24h.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  updateSessionHistoryTable() {
    const tbody = this.sessionHistoryBody;
    const noSessionsMsg = this.noSessionsMessage;

    // Clear existing rows
    tbody.innerHTML = "";

    if (this.stats.sessionHistory.length === 0) {
      noSessionsMsg.classList.add("show");
      return;
    }

    noSessionsMsg.classList.remove("show");

    // Add rows for each session
    this.stats.sessionHistory.forEach((session) => {
      // Create cells
      const dateTd = document.createElement("td");
      dateTd.textContent = session.date;

      const timeTd = document.createElement("td");
      const startFormatted = this._formatTime(session.startTime);
      const endFormatted = this._formatTime(session.endTime);
      timeTd.textContent = `${startFormatted}~${endFormatted}`;

      const focusTd = document.createElement("td");
      focusTd.textContent = session.focusMinutes;

      const remarkTd = document.createElement("td");
      const remarkInput = document.createElement("input");
      remarkInput.type = "text";
      remarkInput.className = "remark-input";
      remarkInput.value = session.remark || "";
      remarkInput.dataset.sessionDate = session.date;
      remarkTd.appendChild(remarkInput);

      // When remark changes, save it back to the sessionHistory and localStorage
      remarkInput.addEventListener("change", (e) => {
        const newRemark = e.target.value;
        // Find the session in the array (match by date + startTime + endTime)
        const idx = this.stats.sessionHistory.findIndex(
          (s) =>
            s.date === session.date &&
            s.startTime === session.startTime &&
            s.endTime === session.endTime &&
            s.focusMinutes === session.focusMinutes
        );
        if (idx !== -1) {
          this.stats.sessionHistory[idx].remark = newRemark;
          this.saveStats();
        }
      });

      // Create row and append cells
      const row = document.createElement("tr");
      row.appendChild(dateTd);
      row.appendChild(timeTd);
      row.appendChild(focusTd);
      row.appendChild(remarkTd);

      // append row to tbody
      tbody.appendChild(row);
    });
  }

  copySessionHistory() {
    if (!this.stats.sessionHistory || this.stats.sessionHistory.length === 0) {
      this.showNotification("No sessions to copy");
      return;
    }

    // Build pipe-separated rows: | date | start~end | minutes | remark |
    const rows = this.stats.sessionHistory.map((s) => {
      const remark = s.remark ? s.remark.replace(/\|/g, "\\|") : "";
      const startFormatted = this._formatTime(s.startTime);
      const endFormatted = this._formatTime(s.endTime);
      return `| ${s.date} | ${startFormatted}~${endFormatted} | ${s.focusMinutes} | ${remark} |`;
    });
    const text = rows.join("\n");

    // Try navigator.clipboard first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          this.showNotification("Session history copied to clipboard");
        })
        .catch(() => {
          this._fallbackCopy(text);
        });
    } else {
      this._fallbackCopy(text);
    }
  }

  _fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand("copy");
      if (ok) this.showNotification("Session history copied to clipboard");
      else this.showNotification("Copy failed");
    } catch (e) {
      this.showNotification("Copy not supported");
    }
    document.body.removeChild(ta);
  }
}

// Initialize the Pomodoro Timer when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const pomodoro = new PomodoroTimer();
});
