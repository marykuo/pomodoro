class PomodoroTimer {
  constructor() {
    this.settings = {
      focusTime: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakInterval: 4,
      autoStartPomodoro: false,
      autoStartBreaks: false,
      alarmEnabled: true,
    };

    this.currentState = "focus"; // 'focus', 'shortBreak', 'longBreak'
    this.currentSession = 1;
    this.isRunning = false;
    this.timeLeft = this.settings.focusTime * 60;
    this.timer = null;

    this.initializeElements();
    this.loadSettings();
    this.updateDisplay();
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
  }

  bindEvents() {
    this.startBtn.addEventListener("click", () => this.startTimer());
    this.pauseBtn.addEventListener("click", () => this.pauseTimer());
    this.resetBtn.addEventListener("click", () => this.resetTimer());
    this.nextBtn.addEventListener("click", () => this.nextSession());

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
    this.alarmEnabledInput.addEventListener("change", () =>
      this.saveSettings()
    );
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
    this.settings.alarmEnabled = this.alarmEnabledInput.checked;

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
    this.alarmEnabledInput.checked = this.settings.alarmEnabled;
  }

  startTimer() {
    this.isRunning = true;
    this.startBtn.disabled = true;
    this.pauseBtn.disabled = false;
    this.nextBtn.disabled = false;
    this.timerCircle.classList.add("active");

    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft <= 0) {
        this.completeSession();
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

  nextSession() {
    if (!this.isRunning) {
      return; // Only allow next when timer is running
    }

    // Stop current timer and immediately transition to next session
    this.pauseTimer();

    if (this.currentState === "focus") {
      // Moving from focus to break (but don't count as completed pomodoro)
      if (this.currentSession % this.settings.longBreakInterval === 0) {
        this.currentState = "longBreak";
        this.timeLeft = this.settings.longBreak * 60;
        this.showNotification(
          `Switching to ${this.settings.longBreak}-minute long break.`
        );
      } else {
        this.currentState = "shortBreak";
        this.timeLeft = this.settings.shortBreak * 60;
        this.showNotification(
          `Switching to ${this.settings.shortBreak}-minute short break.`
        );
      }
    } else {
      // Moving from break to focus
      this.currentState = "focus";
      this.timeLeft = this.settings.focusTime * 60;
      this.currentSession++;
      this.showNotification(
        `Switching to ${this.settings.focusTime}-minute focus session.`
      );
    }

    this.updateDisplay();
    this.updateTimerCircleClass();
  }

  completeSession() {
    this.pauseTimer();
    this.playNotification();

    if (this.currentState === "focus") {
      // Completed a focus session
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

    this.updateDisplay();
    this.updateTimerCircleClass();
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    this.timeDisplay.textContent = `${minutes
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

  playNotification() {
    // Try to play the audio notification only if alarms are enabled
    if (this.settings.alarmEnabled) {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch((e) => {
        console.log("Could not play notification sound:", e);
      });
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
}

// Initialize the Pomodoro Timer when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const pomodoro = new PomodoroTimer();
});
