document.addEventListener("DOMContentLoaded", () => {
  console.log("SmartTasks loaded.");

  // -----------------------------
  // DOM ELEMENTS
  // -----------------------------
  const smartBtn = document.getElementById("smart-add-btn");
  const smartOverlay = document.getElementById("smart-overlay");
  const smartInput = document.getElementById("smart-input");
  const smartCancel = document.getElementById("smart-cancel");
  const smartSubmit = document.getElementById("smart-submit");

  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalDeadline = document.getElementById("modal-deadline");
  const modalCategory = document.getElementById("modal-category");
  const addMainBtn = document.getElementById("add-task-main");
  const modalCancel = document.getElementById("modal-cancel");
  const modalAddBtn = document.getElementById("modal-add");

  const taskList = document.getElementById("task-list");

  // Task storage
  let tasks = [];

  // -----------------------------
  // UTILITIES
  // -----------------------------
  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDisplayDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function detectCategory(text) {
    text = text.toLowerCase();
    if (/assignment|essay|project|study|report|exam|class/.test(text)) return "work";
    if (/call|buy|clean|gym|doctor|groceries/.test(text)) return "personal";
    if (/movie|game|party|hangout|chill/.test(text)) return "leisure";
    return "work";
  }

  // -----------------------------
  // RULE-BASED DATE PARSER
  // -----------------------------
  function parseTaskInput(text) {
    text = text.trim();
    let title = text;
    let deadline = null;

    // CASE 1: "by YYYY-MM-DD"
    let exact = text.match(/by (\d{4}-\d{2}-\d{2})/i);
    if (exact) {
      deadline = exact[1];
      title = text.replace(exact[0], "").trim();
      return { title, deadline, category: detectCategory(title) };
    }

    // CASE 2: "today"
    if (/today/i.test(text)) {
      deadline = todayISO();
      title = text.replace(/today/i, "").trim();
      return { title, deadline, category: detectCategory(title) };
    }

    // CASE 3: "tomorrow"
    if (/tomorrow/i.test(text)) {
      let d = new Date();
      d.setDate(d.getDate() + 1);
      deadline = d.toISOString().slice(0, 10);
      title = text.replace(/tomorrow/i, "").trim();
      return { title, deadline, category: detectCategory(title) };
    }

    // Nothing matched → return task WITHOUT deadline
    return { title, deadline: null, category: detectCategory(title) };
  }

  function extractTasks(text) {
    return text
      .split(/[\n\.;]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  function parseParagraph(text) {
    return extractTasks(text).map(parseTaskInput);
  }

  // -----------------------------
  // SMART ADD LOGIC
  // -----------------------------
  smartSubmit.addEventListener("click", async () => {
    console.log("Smart Submit triggered");

    const text = smartInput.value.trim();
    if (!text) return;

    let parsed = parseParagraph(text);
    console.log("Rule parsed:", parsed);

    const hasRealDate = parsed.some(t => t.deadline !== null);

    // -----------------------------
    // AI FALLBACK → if no dates found
    // -----------------------------
    if (!hasRealDate) {
      console.log("Rule parser failed → AI fallback triggered");

      try {
        const response = await fetch("/api/parseTasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });

        const ai = await response.json();
        console.log("AI result:", ai);

        if (ai.error) {
          alert("AI could not parse your text.");
          return;
        }

        parsed = ai; // use AI tasks

      } catch (err) {
        console.error("AI request error:", err);
        alert("AI parsing failed.");
        return;
      }
    }

    // -----------------------------
    // ADD ALL PARSED TASKS
    // -----------------------------
    for (let t of parsed) {
      tasks.push({
        title: t.title,
        deadline: t.deadline,
        category: t.category,
        completed: false
      });
    }

    smartOverlay.classList.add("hidden");
    renderTasks();
  });

  // -----------------------------
  // ADD TASK (NORMAL)
  // -----------------------------
  addMainBtn.addEventListener("click", () => {
    modalOverlay.classList.remove("hidden");
  });

  modalCancel.addEventListener("click", () => {
    modalOverlay.classList.add("hidden");
  });

  modalAddBtn.addEventListener("click", () => {
    const title = modalTitle.value.trim();
    const deadline = modalDeadline.value;
    const category = modalCategory.value;

    if (!title) return alert("Please enter a title");

    tasks.push({
      title,
      deadline,
      category,
      completed: false
    });

    modalTitle.value = "";
    modalDeadline.value = "";
    modalOverlay.classList.add("hidden");

    renderTasks();
  });

  // -----------------------------
  // RENDER TASKS
  // -----------------------------
  function renderTasks() {
    taskList.innerHTML = "";

    const active = tasks.filter(t => !t.completed);

    active.forEach(task => {
      const row = document.createElement("div");
      row.className = "task";

      row.innerHTML = `
        <div class="task-left">
          <span class="task-title">${task.title}</span>
          ${task.deadline ? `<span class="task-date">${formatDisplayDate(task.deadline)}</span>` : ""}
        </div>
        <button class="secondary-btn">Done</button>
      `;

      row.querySelector("button").addEventListener("click", () => {
        task.completed = true;
        renderTasks();
      });

      taskList.appendChild(row);
    });
  }

  renderTasks();
});
