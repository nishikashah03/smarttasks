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
  // UTILS
  ////////////////////////////////////

  function toISO(date) {
    return date.toISOString().slice(0, 10);
  }

  function formatDisplayDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function detectCategory(text) {
    text = text.toLowerCase();

    if (/assignment|project|essay|exam|study|class|report/i.test(text))
      return "work";
    if (/call|gym|buy|groceries|clean|doctor|family/i.test(text))
      return "personal";
    if (/movie|game|party|hangout|chill/i.test(text))
      return "leisure";

    return "work";
  }

  ////////////////////////////////////
  // SIMPLE RULE PARSER
  ////////////////////////////////////
  function parseTaskInput(text) {
    console.log("---- parseTaskInput called ----");
    console.log("INPUT:", text);

    text = text.trim();
    let title = text;
    let date = null;

    // Case 1: YYYY-MM-DD
    let match = text.match(/by (\d{4}-\d{2}-\d{2})/i);
    if (match) {
        console.log("Matched explicit date:", match[1]);
        return {
            title: title.replace(match[0], "").trim(),
            deadline: match[1],
            category: detectCategory(title)
        };
    }

    // Case 2: TODAY
    if (/today/i.test(text)) {
        date = todayISO();
        console.log("Matched TODAY:", date);
        return {
            title: title.replace(/today/i, "").trim(),
            deadline: date,
            category: detectCategory(title)
        };
    }

    // Case 3: TOMORROW
    if (/tomorrow/i.test(text)) {
        let d = new Date();
        d.setDate(d.getDate() + 1);
        date = d.toISOString().slice(0, 10);
        console.log("Matched TOMORROW:", date);
        return {
            title: title.replace(/tomorrow/i, "").trim(),
            deadline: date,
            category: detectCategory(title)
        };
    }

    // ---------------------------
    // DEBUG LOG BEFORE RETURNING NULL
    // ---------------------------
    console.log("NO MATCH → returning NULL for AI fallback");
    return null;   // <----------- NECESSARY FOR AI FALLBACK
}

  

  function extractLines(text) {
    return text
      .split(/[\n.;]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  function ruleParseParagraph(text) {
    const lines = extractLines(text);
    const results = [];

    for (const line of lines) {
      let parsed = parseTaskInput(line);

      // Only accept rule-parsed tasks if deadline is VALID
      if (parsed && parsed.deadline) {
        results.push(parsed);
      }
    }

    console.log("Rule parsed tasks:", results);
    return results;
  }

  ////////////////////////////////////
  // SMART ADD (AI FALLBACK)
  ////////////////////////////////////

  smartSubmit.addEventListener("click", async () => {
    console.log("Smart Add Submitted");

    const text = smartInput.value.trim();

    // 1) Rule parser
    const ruleTasks = ruleParseParagraph(text);

    // 2) AI fallback if rule parser failed
    if (ruleTasks.length === 0) {
      console.log("→ Using AI fallback");

      try {
        const response = await fetch("/api/parseTasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });

        const aiTasks = await response.json();
        console.log("AI tasks:", aiTasks);

        if (aiTasks.error) {
          alert("AI could not parse this text.");
          return;
        }

        for (const t of aiTasks) {
          tasks.push({
            title: t.title,
            deadline: t.deadline,
            category: t.category,
            completed: false
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

    // 3) Rule-parsed tasks succeed
    console.log("→ Using rule-based parser");

    for (const t of ruleTasks) {
      tasks.push({
        title: t.title,
        deadline: t.deadline,
        category: t.category,
        completed: false
      });
    }

    sortTasks();
    renderTasks();
    smartOverlay.classList.add("hidden");
  });

  ////////////////////////////////////
  // NORMAL ADD TASK
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
      completed: false
    });

    modalTitle.value = "";
    modalDeadline.value = "";
    modalOverlay.classList.add("hidden");

    sortTasks();
    renderTasks();
  });

  ////////////////////////////////////
  // SORT + RENDER
  ////////////////////////////////////

  function sortTasks() {
    tasks.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  }

  function renderTasks() {
    taskList.innerHTML = "";

    const active = tasks.filter((t) => !t.completed);

    for (const task of active) {
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
    }

    updateInsights();
  }

  ////////////////////////////////////
  // INSIGHTS
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
  // OPEN/CLOSE SMART ADD
  ////////////////////////////////////

  smartBtn.addEventListener("click", () => {
    smartOverlay.classList.remove("hidden");
    smartInput.value = "";
    smartInput.focus();
  });

  smartCancel.addEventListener("click", () => {
    smartOverlay.classList.add("hidden");
  });

  ////////////////////////////////////
  // INITIAL RENDER
  ////////////////////////////////////

  renderTasks();
});
