const state = {
  course: null,
  lessons: {},
  lang: "en",
  moduleIndex: 0,
  stepIndex: 0,
  dirty: false
};

const fields = {};

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value, fallback) {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function setStatus(message, isError = false) {
  const status = $("#status");
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function markDirty() {
  state.dirty = true;
  setStatus("Unsaved changes.");
}

function languages() {
  return Object.keys(state.course.languages || {});
}

function langData() {
  return state.course.languages[state.lang];
}

function modules() {
  return langData().modules || [];
}

function activeModule() {
  return modules()[state.moduleIndex] || null;
}

function activeStep() {
  const module = activeModule();
  return module && module.steps ? module.steps[state.stepIndex] || null : null;
}

function lessonContent() {
  const step = activeStep();

  if (!step) {
    return {
      videoUrl: "",
      summary: "",
      actions: [],
      expected: ""
    };
  }

  if (!step.contentUrl) {
    step.contentUrl = generateLessonPath();
  }

  if (!state.lessons[step.contentUrl]) {
    state.lessons[step.contentUrl] = {
      videoUrl: "",
      summary: "",
      actions: [],
      expected: ""
    };
  }

  return state.lessons[step.contentUrl];
}

function generateLessonPath() {
  const module = activeModule();
  const step = activeStep();
  const moduleId = slugify(module && module.id, "module");
  const stepId = slugify(step && step.id, "lesson");

  return `${state.lang}/${moduleId}/${stepId}.json`;
}

function bindFields() {
  [
    "course-title",
    "course-sidebar-title",
    "course-level",
    "course-description",
    "course-downloads",
    "course-labels",
    "module-id",
    "module-title",
    "lesson-id",
    "lesson-title",
    "lesson-duration",
    "lesson-content-url",
    "lesson-video-url",
    "lesson-summary",
    "lesson-actions",
    "lesson-expected"
  ].forEach(id => {
    fields[id] = $(`#${id}`);
  });
}

function render() {
  if (!state.course) {
    return;
  }

  ensureSelection();
  renderLanguageTabs();
  renderStructure();
  renderForms();
}

function ensureSelection() {
  if (!languages().includes(state.lang)) {
    state.lang = languages()[0];
  }

  if (state.moduleIndex >= modules().length) {
    state.moduleIndex = Math.max(0, modules().length - 1);
  }

  const module = activeModule();

  if (module && state.stepIndex >= module.steps.length) {
    state.stepIndex = Math.max(0, module.steps.length - 1);
  }
}

function renderLanguageTabs() {
  $("#language-tabs").innerHTML = languages().map(lang => `
    <button class="button language-tab ${lang === state.lang ? "is-active" : ""}" type="button" data-lang="${escapeHtml(lang)}">
      ${escapeHtml(lang.toUpperCase())}
    </button>
  `).join("");

  document.querySelectorAll("[data-lang]").forEach(button => {
    button.addEventListener("click", () => {
      state.lang = button.dataset.lang;
      state.moduleIndex = 0;
      state.stepIndex = 0;
      render();
    });
  });
}

function renderStructure() {
  $("#structure-list").innerHTML = modules().map((module, moduleIndex) => `
    <div class="module-block">
      <button class="module-title ${moduleIndex === state.moduleIndex ? "is-active" : ""}" type="button" data-module="${moduleIndex}">
        ${String(moduleIndex + 1).padStart(2, "0")}. ${escapeHtml(module.title || module.id)}
      </button>
      ${(module.steps || []).map((step, stepIndex) => `
        <button class="lesson-link ${moduleIndex === state.moduleIndex && stepIndex === state.stepIndex ? "is-active" : ""}" type="button" data-module="${moduleIndex}" data-step="${stepIndex}">
          <span class="lesson-number">${stepIndex + 1}</span>
          <span>${escapeHtml(step.title || step.id)}</span>
        </button>
      `).join("")}
    </div>
  `).join("");

  document.querySelectorAll("[data-module]").forEach(button => {
    button.addEventListener("click", () => {
      state.moduleIndex = Number(button.dataset.module);
      state.stepIndex = button.dataset.step ? Number(button.dataset.step) : 0;
      render();
    });
  });
}

function renderForms() {
  const course = langData();
  const module = activeModule();
  const step = activeStep();
  const content = lessonContent();

  fields["course-title"].value = course.title || "";
  fields["course-sidebar-title"].value = course.sidebarTitle || "";
  fields["course-level"].value = course.level || "";
  fields["course-description"].value = course.description || "";
  fields["course-downloads"].value = (course.downloads || []).map(item => `${item.title || ""} | ${item.url || ""}`).join("\n");
  fields["course-labels"].value = JSON.stringify(course.labels || {}, null, 2);

  fields["module-id"].value = module ? module.id || "" : "";
  fields["module-title"].value = module ? module.title || "" : "";

  fields["lesson-id"].value = step ? step.id || "" : "";
  fields["lesson-title"].value = step ? step.title || "" : "";
  fields["lesson-duration"].value = step ? step.duration || "" : "";
  fields["lesson-content-url"].value = step ? step.contentUrl || "" : "";
  fields["lesson-video-url"].value = content.videoUrl || "";
  fields["lesson-summary"].value = content.summary || "";
  fields["lesson-actions"].value = Array.isArray(content.actions) ? content.actions.join("\n") : "";
  fields["lesson-expected"].value = content.expected || "";
}

function attachInputHandlers() {
  fields["course-title"].addEventListener("input", event => {
    langData().title = event.target.value;
    markDirty();
  });

  fields["course-sidebar-title"].addEventListener("input", event => {
    langData().sidebarTitle = event.target.value;
    markDirty();
  });

  fields["course-level"].addEventListener("input", event => {
    langData().level = event.target.value;
    markDirty();
  });

  fields["course-description"].addEventListener("input", event => {
    langData().description = event.target.value;
    markDirty();
  });

  fields["course-downloads"].addEventListener("input", event => {
    langData().downloads = event.target.value.split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split("|");
        return {
          title: (parts[0] || "").trim(),
          url: (parts.slice(1).join("|") || "").trim()
        };
      });
    markDirty();
  });

  fields["course-labels"].addEventListener("change", event => {
    try {
      langData().labels = JSON.parse(event.target.value || "{}");
      markDirty();
    } catch (error) {
      setStatus(`Labels JSON error: ${error.message}`, true);
    }
  });

  fields["module-id"].addEventListener("input", event => {
    const module = activeModule();
    if (module) {
      module.id = slugify(event.target.value, "module");
      markDirty();
    }
  });

  fields["module-title"].addEventListener("input", event => {
    const module = activeModule();
    if (module) {
      module.title = event.target.value;
      markDirty();
    }
  });

  fields["lesson-id"].addEventListener("input", event => {
    const step = activeStep();
    if (step) {
      step.id = slugify(event.target.value, "lesson");
      markDirty();
    }
  });

  fields["lesson-title"].addEventListener("input", event => {
    const step = activeStep();
    if (step) {
      step.title = event.target.value;
      markDirty();
    }
  });

  fields["lesson-duration"].addEventListener("input", event => {
    const step = activeStep();
    if (step) {
      step.duration = event.target.value;
      markDirty();
    }
  });

  fields["lesson-content-url"].addEventListener("input", event => {
    const step = activeStep();
    if (step) {
      const oldUrl = step.contentUrl;
      step.contentUrl = event.target.value.trim();

      if (oldUrl && oldUrl !== step.contentUrl && state.lessons[oldUrl] && !state.lessons[step.contentUrl]) {
        state.lessons[step.contentUrl] = state.lessons[oldUrl];
      }

      markDirty();
    }
  });

  fields["lesson-video-url"].addEventListener("input", event => {
    lessonContent().videoUrl = event.target.value;
    markDirty();
  });

  fields["lesson-summary"].addEventListener("input", event => {
    lessonContent().summary = event.target.value;
    markDirty();
  });

  fields["lesson-actions"].addEventListener("input", event => {
    lessonContent().actions = event.target.value.split("\n").map(line => line.trim()).filter(Boolean);
    markDirty();
  });

  fields["lesson-expected"].addEventListener("input", event => {
    lessonContent().expected = event.target.value;
    markDirty();
  });
}

function addModule() {
  const used = new Set(modules().map(module => module.id));
  const id = nextId("new-module", used);

  modules().push({
    id,
    title: "New module",
    steps: []
  });

  state.moduleIndex = modules().length - 1;
  state.stepIndex = 0;
  markDirty();
  render();
}

function addLesson() {
  const module = activeModule();

  if (!module) {
    addModule();
    return;
  }

  const used = new Set((module.steps || []).map(step => step.id));
  const id = nextId("new-lesson", used);
  const step = {
    id,
    title: "New lesson",
    duration: "",
    contentUrl: `${state.lang}/${module.id}/${id}.json`
  };

  module.steps.push(step);
  state.lessons[step.contentUrl] = {
    videoUrl: "",
    summary: "",
    actions: [],
    expected: ""
  };
  state.stepIndex = module.steps.length - 1;
  markDirty();
  render();
}

function nextId(base, used) {
  let id = base;
  let index = 2;

  while (used.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }

  return id;
}

function moveItem(list, from, to) {
  if (to < 0 || to >= list.length) {
    return false;
  }

  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return true;
}

function attachButtonHandlers() {
  $("#reload-button").addEventListener("click", () => {
    if (!state.dirty || window.confirm("Reload files and discard unsaved changes?")) {
      load();
    }
  });

  $("#save-button").addEventListener("click", save);
  $("#publish-button").addEventListener("click", publish);
  $("#add-module-button").addEventListener("click", addModule);
  $("#add-lesson-button").addEventListener("click", addLesson);

  $("#module-up-button").addEventListener("click", () => {
    if (moveItem(modules(), state.moduleIndex, state.moduleIndex - 1)) {
      state.moduleIndex -= 1;
      markDirty();
      render();
    }
  });

  $("#module-down-button").addEventListener("click", () => {
    if (moveItem(modules(), state.moduleIndex, state.moduleIndex + 1)) {
      state.moduleIndex += 1;
      markDirty();
      render();
    }
  });

  $("#delete-module-button").addEventListener("click", () => {
    if (activeModule() && window.confirm("Delete this module from course.json? Lesson files on disk will not be deleted.")) {
      modules().splice(state.moduleIndex, 1);
      state.moduleIndex = Math.max(0, state.moduleIndex - 1);
      state.stepIndex = 0;
      markDirty();
      render();
    }
  });

  $("#lesson-path-button").addEventListener("click", () => {
    const step = activeStep();

    if (step) {
      const oldUrl = step.contentUrl;
      step.contentUrl = generateLessonPath();

      if (oldUrl && state.lessons[oldUrl] && !state.lessons[step.contentUrl]) {
        state.lessons[step.contentUrl] = state.lessons[oldUrl];
      }

      markDirty();
      render();
    }
  });

  $("#lesson-up-button").addEventListener("click", () => {
    const module = activeModule();

    if (module && moveItem(module.steps, state.stepIndex, state.stepIndex - 1)) {
      state.stepIndex -= 1;
      markDirty();
      render();
    }
  });

  $("#lesson-down-button").addEventListener("click", () => {
    const module = activeModule();

    if (module && moveItem(module.steps, state.stepIndex, state.stepIndex + 1)) {
      state.stepIndex += 1;
      markDirty();
      render();
    }
  });

  $("#delete-lesson-button").addEventListener("click", () => {
    const module = activeModule();

    if (module && activeStep() && window.confirm("Delete this lesson from course.json? The lesson file on disk will not be deleted.")) {
      module.steps.splice(state.stepIndex, 1);
      state.stepIndex = Math.max(0, state.stepIndex - 1);
      markDirty();
      render();
    }
  });
}

async function load() {
  setStatus("Loading course files...");

  try {
    const response = await fetch("/api/course");

    if (!response.ok) {
      throw new Error(`Load failed: ${response.status}`);
    }

    const data = await response.json();
    state.course = data.course;
    state.lessons = data.lessons || {};
    state.lang = state.course.defaultLang || languages()[0] || "en";
    state.moduleIndex = 0;
    state.stepIndex = 0;
    state.dirty = false;
    render();
    setStatus("Ready.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function save() {
  setStatus("Saving files...");

  try {
    const response = await fetch("/api/course", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        course: state.course,
        lessons: state.lessons
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Save failed: ${response.status}`);
    }

    state.dirty = false;
    setStatus(`Saved ${result.written.length} files.\n${result.written.join("\n")}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function publish() {
  const message = window.prompt("Commit message", "Update course content");

  if (message === null) {
    return;
  }

  setStatus("Publishing to GitHub...");

  try {
    if (state.dirty) {
      await save();
    }

    const response = await fetch("/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Publish failed: ${response.status}`);
    }

    setStatus(result.output || "Published.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

bindFields();
attachInputHandlers();
attachButtonHandlers();
load();
