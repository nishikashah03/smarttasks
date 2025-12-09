console.log("SmartTasks loaded.");

// SMART ADD ELEMENTS
const smartBtn = document.getElementById("smart-add-btn");
const smartOverlay = document.getElementById("smart-overlay");
const smartInput = document.getElementById("smart-input");
const smartCancel = document.getElementById("smart-cancel");
const smartSubmit = document.getElementById("smart-submit");

// task list
const taskList = document.getElementById("task-list");

// modal elements
const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalDeadline = document.getElementById("modal-deadline");
const modalCategory = document.getElementById("modal-category");

const addMainBtn = document.getElementById("add-task-main");
const modalCancel = document.getElementById("modal-cancel");
const modalAddBtn = document.getElementById("modal-add");

// task storage
let tasks = [];
function formatDisplayDate(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  }
  

////////////////////////////////////
// OPEN / CLOSE MODAL
////////////////////////////////////

// open modal
addMainBtn.addEventListener("click", () => {
  modalOverlay.classList.remove("hidden");
});

// close modal
modalCancel.addEventListener("click", () => {
  modalOverlay.classList.add("hidden");
});
// OPEN SMART ADD
smartBtn.addEventListener("click", () => {
    smartOverlay.classList.remove("hidden");
    smartInput.value = "";
    smartInput.focus();
  });
  
  // CLOSE SMART ADD
smartCancel.addEventListener("click", () => {
    smartOverlay.classList.add("hidden");
  });
  
////////////////////////////////////
// SORT TASKS BY DEADLINE
////////////////////////////////////
function sortTasks() {
  tasks.sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });
}

////////////////////////////////////
// ADD TASK FROM MODAL
////////////////////////////////////
modalAddBtn.addEventListener("click", () => {
  const title = modalTitle.value.trim();
  const deadline = modalDeadline.value;
  const category = modalCategory.value;

  if (!title) {
    alert("Please enter a task title");
    return;
  }

  const task = {
    title,
    deadline,
    category,
    completed: false
  };

  tasks.push(task);
  sortTasks();
  renderTasks();

  // clear modal + close
  modalTitle.value = "";
  modalDeadline.value = "";
  modalOverlay.classList.add("hidden");
});
smartSubmit.addEventListener("click", () => {
    let text = smartInput.value.trim();
    let parsedTasks = parseParagraph(text);
  
    if (parsedTasks.length === 0) {
      alert("Couldn't understand any tasks.");
      return;
    }
  
    for (let task of parsedTasks) {
      tasks.push({
        title: task.title,
        deadline: task.deadline,
        category: task.category,
        completed: false
      });
    }
  
    sortTasks();
    renderTasks();
  
    smartOverlay.classList.add("hidden");
  });
  
function detectCategory(text) {
    text = text.toLowerCase();
  
    if (/assignment|essay|project|study|exam|class/.test(text)) return "work";
    if (/gym|call|buy|shop|groceries|clean|doctor/.test(text)) return "personal";
    if (/movie|game|party|chill|hangout/.test(text)) return "leisure";
  
    return "work"; // default
  }
  function formatDate(dateObj) {
    return dateObj.toISOString().slice(0, 10);
  }
  
  function parseTaskInput(text) {
    text = text.trim();
  
    let keyword = null;
    if (text.includes(" by ")) keyword = " by ";
    else if (text.includes(" due ")) keyword = " due ";
  
    let titlePart = text;
    let rawDate = null;
  
    if (keyword) {
      [titlePart, rawDate] = text.split(keyword);
      titlePart = titlePart.trim();
      rawDate = rawDate.trim();
    }
  
    // Case 1: YYYY-MM-DD
    if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return {
        title: titlePart,
        deadline: rawDate,
        category: detectCategory(titlePart)
      };
    }
  
    // Case 2: DD/MM/YYYY
    if (rawDate && /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      let [dd, mm, yyyy] = rawDate.split("/");
      return {
        title: titlePart,
        deadline: `${yyyy}-${mm}-${dd}`,
        category: detectCategory(titlePart)
      };
    }
  
    // Case 3: MonthName DD
    if (rawDate) {
      const monthMap = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
      };
  
      let match = rawDate.match(/^([a-zA-Z]+)\s+(\d{1,2})$/);
      if (match) {
        let monthName = match[1].slice(0, 3).toLowerCase();
        let day = match[2];
        let year = new Date().getFullYear();
  
        return {
          title: titlePart,
          deadline: `${year}-${monthMap[monthName]}-${day}`,
          category: detectCategory(titlePart)
        };
      }
    }
  
    
    
    // ----------------------------
// NATURAL LANGUAGE DATES
// ----------------------------

// "today"
if (/today/i.test(text)) {
    let d = new Date();
    return {
      title: titlePart.replace(/today/i, "").trim(),
      deadline: formatDate(d),
      category: detectCategory(titlePart)
    };
  }
  
  // "tomorrow"
  if (/tomorrow/i.test(text)) {
    let d = new Date();
    d.setDate(d.getDate() + 1);
    return {
      title: titlePart.replace(/tomorrow/i, "").trim(),
      deadline: formatDate(d),
      category: detectCategory(titlePart)
    };
  }
  
  // "in X days"
  let inDays = text.match(/in (\d+) days/i);
  if (inDays) {
    let d = new Date();
    d.setDate(d.getDate() + parseInt(inDays[1]));
    return {
      title: titlePart.replace(inDays[0], "").trim(),
      deadline: formatDate(d),
      category: detectCategory(titlePart)
    };
  }
  
  // "next Monday" etc.
  let weekdays = {
    monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6, sunday: 0
  };
  
  let nextDayMatch = text.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (nextDayMatch) {
    let target = weekdays[nextDayMatch[1].toLowerCase()];
    let d = new Date();
    let current = d.getDay();
    let diff = (target + 7 - current) % 7;
    if (diff === 0) diff = 7; // next, not this week
  
    d.setDate(d.getDate() + diff);
    return {
      title: titlePart.replace(nextDayMatch[0], "").trim(),
      deadline: formatDate(d),
      category: detectCategory(titlePart)
    };
  }
  return {
    title: titlePart,
    deadline: null,
    category: detectCategory(titlePart)
  };
  
  }
  function extractTasks(text) {
    let lines = text.split(/[\.\n;]+/);
    let tasks = [];
  
    for (let line of lines) {
      let cleaned = line.trim();
      if (cleaned.length > 0) {
        tasks.push(cleaned);
      }
    }
  
    return tasks;
  }
  function parseParagraph(text) {
    let lines = extractTasks(text);
    let results = [];
  
    for (let line of lines) {
      let parsed = parseTaskInput(line);
      if (parsed) results.push(parsed);
    }
  
    return results;
  }

      
////////////////////////////////////
// RENDER ALL TASKS
////////////////////////////////////
function renderTasks() {
    taskList.innerHTML = "";
  
    const activeTasks = tasks.filter(t => !t.completed);
  
    activeTasks.forEach((task) => {
      let taskDiv = document.createElement("div");
      taskDiv.className = "task";
  
      // LEFT SIDE: title + date
      let textWrapper = document.createElement("div");
      textWrapper.className = "task-left";
  
      const dateText = task.deadline ? formatDisplayDate(task.deadline) : "";
  
      textWrapper.innerHTML = `
        <span class="task-title">${task.title}</span>
        ${dateText ? `<span class="task-date">${dateText}</span>` : ""}
      `;
  
      // RIGHT SIDE: DONE button
      let doneBtn = document.createElement("button");
      doneBtn.textContent = "Done";
      doneBtn.className = "secondary-btn";
  
      doneBtn.addEventListener("click", () => {
        task.completed = true;
        renderTasks();
        updateInsights();
      });
  
      // assemble row
      taskDiv.appendChild(textWrapper);
      taskDiv.appendChild(doneBtn);
  
      // add to DOM
      taskList.appendChild(taskDiv);
    });
  
    updateInsights();
  }
  

////////////////////////////////////
// INSIGHTS PANEL UPDATE
////////////////////////////////////
function updateInsights() {
  const today = new Date().toISOString().slice(0, 10);

  // Tasks Today
  document.getElementById("count-today").textContent =
    tasks.filter(t => t.deadline === today && !t.completed).length;

  // Completed
  document.getElementById("count-completed").textContent =
    tasks.filter(t => t.completed).length;

  // Upcoming
  document.getElementById("count-upcoming").textContent =
    tasks.filter(t => t.deadline && t.deadline > today && !t.completed).length;
}

////////////////////////////////////
// INITIAL RENDER
////////////////////////////////////
renderTasks();
