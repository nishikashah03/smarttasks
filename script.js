document.addEventListener("DOMContentLoaded", () => {
  console.log("SmartTasks loaded.");

  ////////////////////////////////////
  // ELEMENT REFERENCES
  ////////////////////////////////////

  const smartBtn = document.getElementById("smart-add-btn");
  const smartOverlay = document.getElementById("smart-overlay");
  const smartInput = document.getElementById("smart-input");
  const smartCancel = document.getElementById("smart-cancel");
  const smartSubmit = document.getElementById("smart-submit");

  const taskList = document.getElementById("task-list");

  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalDeadline = document.getElementById("modal-deadline");
  const modalCategory = document.getElementById("modal-category");

  const addMainBtn = document.getElementById("add-task-main");
  const modalCancel = document.getElementById("modal-cancel");
  const modalAddBtn = document.getElementById("modal-add");

  let tasks = [];

  ////////////////////////////////////
  // UTILITY FUNCTIONS
  ////////////////////////////////////

  function toISO(d) {
    return d.toISOString().slice(0, 10);
  }

  function formatDisplayDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  ////////////////////////////////////
  // CATEGORY DETECTOR
  ////////////////////////////////////

  function detectCategory(text) {
    text = text.toLowerCase();
    if (/assignment|project|essay|exam|study|class/.test(text)) return "work";
    if (/call|gym|buy|groceries|clean|doctor/.test(text)) return "personal";
    if (/movie|game|party|chill|hangout/.test(text)) return "leisure";
    return "work";
  }

  ////////////////////////////////////
  // SIMPLE RULE-BASED DATE PARSER
  ////////////////////////////////////

  function parseTaskInput(text) {
    text = text.trim();
    console.log("Parsing:", text);

    let keyword = null;
    if (text.includes(" by ")) keyword = " by ";
    else if (text.includes(" due ")) keyword = " due ";

    let titlePart = text;
    let rawDate = null;

    if (keyword) {
      [titlePart, rawDate] = text.split(keyword);
      titlePart = titlePart.trim();
      rawDate = rawDate ? rawDate.trim() : null;
    }

    // -------------------------------
    // EXPLICIT YYYY-MM-DD
    // -------------------------------
    if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return {
        title: titlePart,
        deadline: rawDate,
        category: detectCategory(titlePart),
      };
    }

    // -------------------------------
    // EXPLICIT DD/MM/YYYY
    // -------------------------------
    if (rawDate && /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      let [dd, mm, yyyy] = rawDate.split("/");
      return {
        title: titlePart,
        deadline: `${yyyy}-${mm}-${dd}`,
        category: detectCategory(titlePart),
      };
    }

    let lower = text.toLowerCase();

    // -------------------------------
    // TODAY
    // -------------------------------
    if (lower.includes("today")) {
      let d = new Date();
      return {
        title: titlePart.replace(/today/i, "").trim(),
        deadline: toISO(d),
        category: detectCategory(titlePart),
      };
    }

    // -------------------------------
    // TOMORROW
    // -------------------------------
    if (lower.includes("tomorrow")) {
      let d = new Date();
      d.setDate(d.getDate() + 1);
      return {
        title: titlePart.replace(/tomorrow/i, "").trim(),
        deadline: toISO(d),
        category: detectCategory(titlePart),
      };
    }

    // -------------------------------
    // ❗ NO REAL DATE FOUND → AI FALLBACK
    // -------------------------------
    return null;
  }

  ////////////////////////////////////
  // SPLIT INTO LINES
  ////////////////////////////////////

  function extractLines(text) {
    return text
      .split(/[\n.;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  ////////////////////////////////////
  // RULE PARSE MULTIPLE TASKS
  ////////////////////////////////////

  function ruleParseParagraph(text) {
    let lines = extractLines(text);
    let results = [];

    for (let line of lines) {
      let parsed = parseTaskInput(line);
      if (parsed && parsed.deadline) {
        results.push(parsed);
      }
    }

    console.log("Rule parsed:", results);
    return results;
  }

  ////////////////////////////////////
  // SMART ADD HANDLER
  ////////////////////////////////////

  smartSubmit.addEventListener("click", async () => {
    console.log("Smart Submit triggered");

    const text = smartInput.value.trim();

    // Step 1: RULE PARSER
    const ruleTasks = ruleParseParagraph(text);

    if (ruleTasks.length === 0) {
      // Step 2: AI FALLBACK
      console.log("No valid rule tasks — using AI…");

      try {
        const response = await fetch("/api/parseTasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        const aiTasks = await response.json();
        console.log("AI tasks:", aiTasks);

        if (aiTasks.error) {
          alert("AI could not understand this.");
          return;
        }

        for (let t of aiTasks) {
          tasks.push({
            title: t.title,
            deadline: t.deadline,
            category: t.category,
            completed: false,
          });
        }

        sortTasks();
        renderTasks();
        smartOverlay.classList.add("hidden");
        return;
      } catch (err) {
        console.error("AI error:", err);
        alert("AI parsing failed.");
        return;
      }
    }

    // RULE PARSER SUCCEEDED
    for (let t of ruleTasks) {
      tasks.push({
        title: t.title,
        deadline: t.deadline,
        category: t.category,
        completed: false,
      });
    }

    sortTasks();
    renderTasks();
    smartOverlay.classList.add("hidden");
  });

  ////////////////////////////////////
  // NORMAL ADD TASK (MODAL)
  ////////////////////////////////////

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

    if (!title) {
      alert("Enter a task title.");
      return;
    }

    tasks.push({
      title,
      deadline,
      category,
      completed: false,
    });

    modalTitle.value = "";
    modalDeadline.value = "";
    modalOverlay.classList.add("hidden");

    sortTasks();
    renderTasks();
  });

  ////////////////////////////////////
  // SORT TASKS
  ////////////////////////////////////

  function sortTasks() {
    tasks.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  }

  ////////////////////////////////////
  // RENDER TASKS
  ////////////////////////////////////

  function renderTasks() {
    taskList.innerHTML = "";

    const active = tasks.filter((t) => !t.completed);

    active.forEach((task) => {
      const row = document.createElement("div");
      row.className = "task";

      const left = document.createElement("div");
      left.className = "task-left";

      left.innerHTML = `
        <span class="task-title">${task.title}</span>
        ${
          task.deadline
            ? `<span class="task-date">${formatDisplayDate(task.deadline)}</span>`
            : ""
        }
      `;

      const doneBtn = document.createElement("button");
      doneBtn.className = "secondary-btn";
      doneBtn.textContent = "Done";

      doneBtn.addEventListener("click", () => {
        task.completed = true;
        renderTasks();
        updateInsights();
      });

      row.appendChild(left);
      row.appendChild(doneBtn);
      taskList.appendChild(row);
    });

    updateInsights();
  }

  ////////////////////////////////////
  // INSIGHTS PANEL
  ////////////////////////////////////

  function updateInsights() {
    const today = toISO(new Date());

    document.getElementById("count-today").textContent =
      tasks.filter((t) => t.deadline === today && !t.completed).length;

    document.getElementById("count-completed").textContent =
      tasks.filter((t) => t.completed).length;

    document.getElementById("count-upcoming").textContent =
      tasks.filter((t) => t.deadline && t.deadline > today && !t.completed)
        .length;
  }

  ////////////////////////////////////
  // INITIAL RENDER
  ////////////////////////////////////

  renderTasks();

  ////////////////////////////////////
  // SMART ADD UI OPEN/CLOSE
  ////////////////////////////////////

  smartBtn.addEventListener("click", () => {
    smartOverlay.classList.remove("hidden");
    smartInput.value = "";
    smartInput.focus();
  });

  smartCancel.addEventListener("click", () => {
    smartOverlay.classList.add("hidden");
  });
});
