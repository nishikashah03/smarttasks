document.addEventListener("DOMContentLoaded", () => {
  console.log("SmartTasks loaded.");

  // -----------------------------
  // ELEMENT REFERENCES
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

  // -----------------------------
  // TASK STORAGE
  // -----------------------------
  let tasks = [];

  // -----------------------------
  // DATE FORMAT HELPERS
  // -----------------------------
  function formatDisplayDate(iso) {
      if (!iso) return "";
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
  }

  function todayISO() {
      return new Date().toISOString().slice(0, 10);
  }

  // -----------------------------
  // MODAL OPEN / CLOSE
  // -----------------------------

  addMainBtn.addEventListener("click", () => {
      modalOverlay.classList.remove("hidden");
  });

  modalCancel.addEventListener("click", () => {
      modalOverlay.classList.add("hidden");
  });

  smartBtn.addEventListener("click", () => {
      smartOverlay.classList.remove("hidden");
      smartInput.value = "";
  });

  smartCancel.addEventListener("click", () => {
      smartOverlay.classList.add("hidden");
  });

  // -----------------------------
  // ADD TASK (NORMAL)
  // -----------------------------
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

      modalOverlay.classList.add("hidden");
      modalTitle.value = "";
      modalDeadline.value = "";
      renderTasks();
  });

  // -----------------------------
  // SMART ADD (AI FALLBACK)
  // -----------------------------
  smartSubmit.addEventListener("click", async () => {
      console.log("Smart Submit triggered");

      const text = smartInput.value.trim();
      if (!text) return;

      let parsed = parseParagraph(text);
      console.log("Rule parsed:", parsed);

      if (parsed.length === 0) {
          console.log("Rule failed → using AI fallback");

          const response = await fetch("/api/parseTasks", {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({ text })
          });

          let ai = await response.json();
          console.log("AI result:", ai);

          if (ai.error) return alert("AI could not parse text.");

          parsed = ai;
      }

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
  // NATURAL LANGUAGE PARSER
  // -----------------------------

  function detectCategory(text) {
      text = text.toLowerCase();
      if (/assignment|essay|project|study|exam|class/.test(text)) return "work";
      if (/gym|call|buy|shop|groceries|clean|doctor/.test(text)) return "personal";
      if (/movie|game|party|chill|hangout/.test(text)) return "leisure";
      return "work";
  }

  function formatISO(d) {
      return d.toISOString().slice(0, 10);
  }

  function parseTaskInput(text) {
      text = text.trim();
      let title = text;
      let date = null;

      // "by YYYY-MM-DD"
      let match = text.match(/by (\d{4}-\d{2}-\d{2})/i);
      if (match) {
          date = match[1];
          title = text.replace(match[0], "").trim();
          return { title, deadline: date, category: detectCategory(title) };
      }

      // "today"
      if (/today/i.test(text)) {
          date = todayISO();
          title = text.replace(/today/i, "").trim();
          return { title, deadline: date, category: detectCategory(title) };
      }

      // fallback
      return { title, deadline: null, category: detectCategory(title) };
  }

  function extractTasks(text) {
      return text.split(/[\n\.;]+/).map(t => t.trim()).filter(t => t.length);
  }

  function parseParagraph(text) {
      return extractTasks(text).map(parseTaskInput);
  }

  // -----------------------------
  // RENDER TASKS
  // -----------------------------
  function renderTasks() {
      taskList.innerHTML = "";

      for (let task of tasks.filter(t => !t.completed)) {
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
      }
  }

  renderTasks();
});
