(function () {
  "use strict";

  var STORAGE_KEY = "habits";
  var THEME_STORAGE_KEY = "habit-theme";
  var MILLISECONDS_PER_DAY = 86400000;
  var IST_OFFSET_MINUTES = 330;
  var state = loadHabits();

  var form = document.getElementById("habit-form");
  var nameInput = document.getElementById("habit-name");
  var dateInput = document.getElementById("start-date");
  var formMessage = document.getElementById("form-message");
  var habitsContainer = document.getElementById("habits-container");
  var themeToggle = document.getElementById("theme-toggle");
  var themeToggleText = document.getElementById("theme-toggle-text");

  function loadHabits() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return [];
      }

      var parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        resetHabitsStorage();
        return [];
      }

      var validHabits = parsed.filter(isValidHabit);

      if (validHabits.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validHabits));
      }

      return validHabits;
    } catch (error) {
      resetHabitsStorage();
      return [];
    }
  }

  function resetHabitsStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }

  function isValidHabit(item) {
    return (
      item &&
      typeof item.id === "number" &&
      Number.isFinite(item.id) &&
      typeof item.name === "string" &&
      item.name.trim().length > 0 &&
      typeof item.startDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.startDate)
    );
  }

  function saveHabits() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadTheme() {
    try {
      var storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

      if (storedTheme === "light" || storedTheme === "dark") {
        return storedTheme;
      }
    } catch (error) {
      return "light";
    }

    return "light";
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  function applyTheme(theme) {
    var resolvedTheme = theme === "dark" ? "dark" : "light";
    var nextLabel = resolvedTheme === "dark" ? "Light mode" : "Dark mode";

    document.body.setAttribute("data-theme", resolvedTheme);
    themeToggle.setAttribute("aria-pressed", String(resolvedTheme === "dark"));
    themeToggle.setAttribute("aria-label", "Switch to " + nextLabel.toLowerCase());
    themeToggleText.textContent = nextLabel;
  }

  function toggleTheme() {
    var currentTheme = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
    var nextTheme = currentTheme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);
    saveTheme(nextTheme);
  }

  function createISTMidnightTimestamp(year, month, day) {
    return Date.UTC(year, month - 1, day) - IST_OFFSET_MINUTES * 60 * 1000;
  }

  function getCurrentISTDateParts() {
    var formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    var parts = formatter.formatToParts(new Date());
    var year = "";
    var month = "";
    var day = "";

    parts.forEach(function (part) {
      if (part.type === "year") {
        year = part.value;
      } else if (part.type === "month") {
        month = part.value;
      } else if (part.type === "day") {
        day = part.value;
      }
    });

    return {
      year: Number(year),
      month: Number(month),
      day: Number(day)
    };
  }

  function getCurrentISTMidnight() {
    var istParts = getCurrentISTDateParts();

    return new Date(
      createISTMidnightTimestamp(
        istParts.year,
        istParts.month,
        istParts.day
      )
    );
  }

  function parseISTDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return null;
    }

    var parts = dateString.split("-");
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    var candidate = new Date(year, month - 1, day);

    if (
      candidate.getFullYear() !== year ||
      candidate.getMonth() !== month - 1 ||
      candidate.getDate() !== day
    ) {
      return null;
    }

    return new Date(createISTMidnightTimestamp(year, month, day));
  }

  function getTotalDays(startDate) {
    var startDateIST = parseISTDate(startDate);

    if (!startDateIST) {
      return null;
    }

    var todayIST = getCurrentISTMidnight();
    var difference = todayIST.getTime() - startDateIST.getTime();
    var totalDays = Math.floor(difference / MILLISECONDS_PER_DAY);

    if (totalDays < 0) {
      return null;
    }

    return totalDays;
  }

  function formatDisplayDate(dateString) {
    var parsedDate = parseISTDate(dateString);

    if (!parsedDate) {
      return dateString;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function setMessage(message, type) {
    formMessage.textContent = message || "";
    formMessage.className = "form-message" + (type === "success" ? " success" : "");
  }

  function render() {
    if (state.length === 0) {
      habitsContainer.innerHTML =
        '<div class="empty-state"><p>No habits yet. Start tracking your first milestone.</p></div>';
      return;
    }

    var cardsMarkup = state
      .slice()
      .sort(function (a, b) {
        return b.id - a.id;
      })
      .map(function (habit) {
        var totalDays = getTotalDays(habit.startDate);
        var safeDays = Number.isFinite(totalDays) ? totalDays : 0;

        return (
          '<article class="habit-card">' +
          '<button type="button" class="delete-button" data-id="' +
          String(habit.id) +
          '" aria-label="Delete ' +
          escapeAttribute(habit.name) +
          '">' +
          "&times;" +
          "</button>" +
          "<h3>" +
          escapeHtml(habit.name) +
          "</h3>" +
          '<p class="days-label">Total days</p>' +
          '<p class="days-count">' +
          String(safeDays) +
          "</p>" +
          '<p class="days-suffix">days tracked</p>' +
          '<p class="start-date">Started on ' +
          escapeHtml(formatDisplayDate(habit.startDate)) +
          "</p>" +
          "</article>"
        );
      })
      .join("");

    habitsContainer.innerHTML = '<div class="habit-grid">' + cardsMarkup + "</div>";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function handleSubmit(event) {
    event.preventDefault();

    var name = nameInput.value.trim();
    var startDate = dateInput.value;

    if (!name) {
      setMessage("Please enter a habit name.");
      nameInput.focus();
      return;
    }

    if (!startDate) {
      setMessage("Please select a start date.");
      dateInput.focus();
      return;
    }

    var totalDays = getTotalDays(startDate);

    if (totalDays === null) {
      setMessage("Start date cannot be in the future and must be a valid date.");
      dateInput.focus();
      return;
    }

    state.push({
      id: Date.now(),
      name: name,
      startDate: startDate
    });

    saveHabits();
    render();
    form.reset();
    setMessage("Habit added successfully.", "success");
    nameInput.focus();
  }

  function handleDelete(event) {
    var deleteButton = event.target.closest(".delete-button");

    if (!deleteButton) {
      return;
    }

    var id = Number(deleteButton.getAttribute("data-id"));

    state = state.filter(function (habit) {
      return habit.id !== id;
    });

    saveHabits();
    render();
    setMessage("Habit deleted.", "success");
  }

  dateInput.max = getTodayISTInputValue();
  applyTheme(loadTheme());
  form.addEventListener("submit", handleSubmit);
  habitsContainer.addEventListener("click", handleDelete);
  themeToggle.addEventListener("click", toggleTheme);

  render();

  function getTodayISTInputValue() {
    var istParts = getCurrentISTDateParts();
    var year = String(istParts.year);
    var month = String(istParts.month).padStart(2, "0");
    var day = String(istParts.day).padStart(2, "0");

    return year + "-" + month + "-" + day;
  }
})();
