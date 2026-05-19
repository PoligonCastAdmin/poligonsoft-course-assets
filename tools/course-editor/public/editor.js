const state = {
  course: null,
  lessons: {},
  view: "general",
  moduleIndex: 0,
  stepIndex: 0,
  dirty: false
};

const langNames = {
  en: "English",
  es: "Spanish"
};

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

function primaryLang() {
  return state.course.defaultLang || languages()[0];
}

function langCourse(lang) {
  return state.course.languages[lang];
}

function baseModules() {
  return langCourse(primaryLang()).modules || [];
}

function moduleFor(lang, index = state.moduleIndex) {
  const course = langCourse(lang);
  course.modules = Array.isArray(course.modules) ? course.modules : [];
  return course.modules[index] || null;
}

function stepFor(lang, moduleIndex = state.moduleIndex, stepIndex = state.stepIndex) {
  const module = moduleFor(lang, moduleIndex);
  module.steps = Array.isArray(module.steps) ? module.steps : [];
  return module.steps[stepIndex] || null;
}

function lessonContent(lang) {
  const step = stepFor(lang);

  if (!step) {
    return defaultLessonContent();
  }

  if (!step.contentUrl) {
    step.contentUrl = generateLessonPath(lang);
  }

  if (!state.lessons[step.contentUrl]) {
    state.lessons[step.contentUrl] = defaultLessonContent();
  }

  return state.lessons[step.contentUrl];
}

function defaultLessonContent() {
  return {
    videoUrl: "",
    summary: "",
    actions: [],
    expected: ""
  };
}

function ensureParallelStructure() {
  const langs = languages();
  const moduleCount = Math.max(...langs.map(lang => Array.isArray(langCourse(lang).modules) ? langCourse(lang).modules.length : 0), 0);

  langs.forEach(lang => {
    const course = langCourse(lang);
    course.modules = Array.isArray(course.modules) ? course.modules : [];
  });

  for (let moduleIndex = 0; moduleIndex < moduleCount; moduleIndex += 1) {
    const sourceModule = langs.map(lang => langCourse(lang).modules[moduleIndex]).find(Boolean) || {};
    const moduleId = slugify(sourceModule.id || sourceModule.title, `module-${moduleIndex + 1}`);
    const stepCount = Math.max(...langs.map(lang => {
      const module = langCourse(lang).modules[moduleIndex];
      return module && Array.isArray(module.steps) ? module.steps.length : 0;
    }), 0);

    langs.forEach(lang => {
      const course = langCourse(lang);

      if (!course.modules[moduleIndex]) {
        course.modules[moduleIndex] = {
          id: moduleId,
          title: "",
          steps: []
        };
      }

      course.modules[moduleIndex].id = moduleId;
      course.modules[moduleIndex].steps = Array.isArray(course.modules[moduleIndex].steps) ? course.modules[moduleIndex].steps : [];
    });

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const sourceStep = langs
        .map(lang => langCourse(lang).modules[moduleIndex].steps[stepIndex])
        .find(Boolean) || {};
      const stepId = slugify(sourceStep.id || sourceStep.title, `lesson-${stepIndex + 1}`);
      const duration = sourceStep.duration || "";

      langs.forEach(lang => {
        const module = langCourse(lang).modules[moduleIndex];

        if (!module.steps[stepIndex]) {
          module.steps[stepIndex] = {
            id: stepId,
            title: "",
            duration,
            contentUrl: `${lang}/${module.id}/${stepId}.json`
          };
        }

        module.steps[stepIndex].id = stepId;
        module.steps[stepIndex].duration = duration;

        if (!module.steps[stepIndex].contentUrl) {
          module.steps[stepIndex].contentUrl = `${lang}/${module.id}/${stepId}.json`;
        }
      });
    }
  }
}

function ensureSelection() {
  if (state.moduleIndex >= baseModules().length) {
    state.moduleIndex = Math.max(0, baseModules().length - 1);
  }

  const module = baseModules()[state.moduleIndex];

  if (module && state.stepIndex >= module.steps.length) {
    state.stepIndex = Math.max(0, module.steps.length - 1);
  }
}

function generateLessonPath(lang) {
  const module = moduleFor(lang);
  const step = stepFor(lang);
  const moduleId = slugify(module && module.id, "module");
  const stepId = slugify(step && step.id, "lesson");

  return `${lang}/${moduleId}/${stepId}.json`;
}

function moveContent(oldUrl, newUrl) {
  if (oldUrl && newUrl && oldUrl !== newUrl && state.lessons[oldUrl] && !state.lessons[newUrl]) {
    state.lessons[newUrl] = state.lessons[oldUrl];
  }
}

function setModuleId(nextId) {
  const id = slugify(nextId, `module-${state.moduleIndex + 1}`);

  languages().forEach(lang => {
    const module = moduleFor(lang);

    if (!module) {
      return;
    }

    module.id = id;

    (module.steps || []).forEach(step => {
      const oldUrl = step.contentUrl;
      step.contentUrl = `${lang}/${id}/${step.id}.json`;
      moveContent(oldUrl, step.contentUrl);
    });
  });
}

function setStepId(nextId) {
  const id = slugify(nextId, `lesson-${state.stepIndex + 1}`);

  languages().forEach(lang => {
    const step = stepFor(lang);

    if (!step) {
      return;
    }

    step.id = id;

    const oldUrl = step.contentUrl;
    step.contentUrl = generateLessonPath(lang);
    moveContent(oldUrl, step.contentUrl);
  });
}

function setDuration(value) {
  languages().forEach(lang => {
    const step = stepFor(lang);

    if (step) {
      step.duration = value;
    }
  });
}

function textToDownloads(value) {
  return value.split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split("|");
      return {
        title: (parts[0] || "").trim(),
        url: (parts.slice(1).join("|") || "").trim()
      };
    });
}

function downloadsToText(downloads) {
  return (downloads || []).map(item => `${item.title || ""} | ${item.url || ""}`).join("\n");
}

function render() {
  if (!state.course) {
    return;
  }

  ensureParallelStructure();
  ensureSelection();
  renderTabs();
  renderSidebar();
  renderCurrentView();
}

function renderTabs() {
  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });

  document.querySelectorAll(".editor-view").forEach(view => {
    view.classList.toggle("is-active", view.id === `${state.view}-view`);
  });
}

function renderSidebar() {
  if (state.view === "general") {
    $("#structure-list").innerHTML = `
      <div class="sidebar-note">
        <strong>Course data</strong>
        <span>${languages().map(lang => lang.toUpperCase()).join(" + ")}</span>
      </div>
    `;
    $("#sidebar-actions").innerHTML = "";
    return;
  }

  $("#structure-list").innerHTML = baseModules().map((module, moduleIndex) => {
    const esModule = moduleFor("es", moduleIndex);

    return `
      <div class="module-block">
        <button class="module-title ${moduleIndex === state.moduleIndex ? "is-active" : ""}" type="button" data-action="select-module" data-module="${moduleIndex}">
          ${String(moduleIndex + 1).padStart(2, "0")}. ${escapeHtml(module.title || module.id)}
          ${esModule ? `<span>${escapeHtml(esModule.title || esModule.id)}</span>` : ""}
        </button>
        ${state.view === "lessons" ? (module.steps || []).map((step, stepIndex) => {
          const esStep = stepFor("es", moduleIndex, stepIndex);

          return `
            <button class="lesson-link ${moduleIndex === state.moduleIndex && stepIndex === state.stepIndex ? "is-active" : ""}" type="button" data-action="select-lesson" data-module="${moduleIndex}" data-step="${stepIndex}">
              <span class="lesson-number">${stepIndex + 1}</span>
              <span>${escapeHtml(step.title || step.id)}${esStep ? `<small>${escapeHtml(esStep.title || esStep.id)}</small>` : ""}</span>
            </button>
          `;
        }).join("") : ""}
      </div>
    `;
  }).join("");

  $("#sidebar-actions").innerHTML = state.view === "sections"
    ? `<button data-action="add-module" class="button is-secondary" type="button">Add section</button>`
    : `<button data-action="add-lesson" class="button is-secondary" type="button">Add lesson</button>`;
}

function renderCurrentView() {
  if (state.view === "general") {
    renderGeneral();
  } else if (state.view === "sections") {
    renderSections();
  } else {
    renderLessons();
  }
}

function languageColumns(content) {
  return `<div class="language-columns">${languages().map(lang => `
    <div class="language-card" data-lang-card="${lang}">
      <h3>${escapeHtml(langNames[lang] || lang.toUpperCase())}</h3>
      ${content(lang)}
    </div>
  `).join("")}</div>`;
}

function richEditor(scope, lang, field, label, html) {
  return `
    <div class="rich-field is-wide">
      <div class="field-label">${escapeHtml(label)}</div>
      <div class="rich-toolbar" aria-label="${escapeHtml(label)} toolbar">
        <button type="button" data-rich-command="formatBlock" data-rich-value="P">P</button>
        <button type="button" data-rich-command="formatBlock" data-rich-value="H3">H3</button>
        <button type="button" data-rich-command="bold">B</button>
        <button type="button" data-rich-command="italic">I</button>
        <button type="button" data-rich-command="insertUnorderedList">List</button>
        <button type="button" data-rich-command="createLink">Link</button>
        <button type="button" data-rich-command="insertImage">Image</button>
        <button type="button" data-rich-command="removeFormat">Clear</button>
      </div>
      <div class="rich-editor" contenteditable="true" spellcheck="false" data-rich-editor="true" data-scope="${scope}" data-lang="${lang}" data-field="${field}">${html || ""}</div>
      <details class="source-details">
        <summary>HTML source</summary>
        <textarea data-html-source="true" data-scope="${scope}" data-lang="${lang}" data-field="${field}" rows="7" spellcheck="false">${escapeHtml(html || "")}</textarea>
      </details>
    </div>
  `;
}

function inputValue(target) {
  if (target.dataset.richEditor) {
    return target.innerHTML;
  }

  return target.value;
}

function syncHtmlControls(target, value) {
  const selector = `[data-scope="${target.dataset.scope}"][data-lang="${target.dataset.lang}"][data-field="${target.dataset.field}"]`;

  document.querySelectorAll(selector).forEach(control => {
    if (control === target) {
      return;
    }

    if (control.dataset.richEditor) {
      control.innerHTML = value || "";
    } else if (control.dataset.htmlSource) {
      control.value = value || "";
    }
  });
}

function applyRichCommand(button) {
  const field = button.closest(".rich-field");
  const editor = field && field.querySelector(".rich-editor");
  const command = button.dataset.richCommand;
  let value = button.dataset.richValue || null;

  if (!editor || !command) {
    return;
  }

  editor.focus();

  if (command === "createLink") {
    value = window.prompt("Link URL", "https://");

    if (!value) {
      return;
    }
  }

  if (command === "insertImage") {
    value = window.prompt("Image URL", "https://");

    if (!value) {
      return;
    }
  }

  document.execCommand(command, false, value);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderGeneral() {
  $("#general-form").innerHTML = languageColumns(lang => {
    const course = langCourse(lang);

    return `
      <div class="form-grid">
        <label>
          Course title
          <input data-scope="course" data-lang="${lang}" data-field="title" type="text" value="${escapeHtml(course.title)}">
        </label>
        <label>
          Sidebar title
          <input data-scope="course" data-lang="${lang}" data-field="sidebarTitle" type="text" value="${escapeHtml(course.sidebarTitle)}">
        </label>
        <label>
          Level
          <input data-scope="course" data-lang="${lang}" data-field="level" type="text" value="${escapeHtml(course.level)}">
        </label>
        ${richEditor("course", lang, "description", "Description", course.description)}
        <label class="is-wide">
          Downloads, one per line: title | url
          <textarea data-scope="course" data-lang="${lang}" data-field="downloads" rows="4">${escapeHtml(downloadsToText(course.downloads))}</textarea>
        </label>
        <details class="details is-wide">
          <summary>Interface labels JSON</summary>
          <textarea data-scope="course" data-lang="${lang}" data-field="labels" rows="9" spellcheck="false">${escapeHtml(JSON.stringify(course.labels || {}, null, 2))}</textarea>
        </details>
      </div>
    `;
  });
}

function renderSections() {
  const module = baseModules()[state.moduleIndex];

  if (!module) {
    $("#sections-form").innerHTML = `<div class="empty-state">Create the first section.</div>`;
    return;
  }

  $("#sections-form").innerHTML = `
    <div class="form-grid shared-grid">
      <label>
        Shared section ID
        <input data-scope="module" data-field="id" type="text" value="${escapeHtml(module.id)}">
      </label>
    </div>
    ${languageColumns(lang => {
      const langModule = moduleFor(lang);

      return `
        <label>
          Section title
          <input data-scope="module" data-lang="${lang}" data-field="title" type="text" value="${escapeHtml(langModule ? langModule.title : "")}">
        </label>
      `;
    })}
  `;
}

function renderLessons() {
  const step = baseModules()[state.moduleIndex] && baseModules()[state.moduleIndex].steps[state.stepIndex];

  if (!step) {
    $("#lessons-form").innerHTML = `<div class="empty-state">Create the first lesson in this section.</div>`;
    return;
  }

  $("#lessons-form").innerHTML = `
    <div class="form-grid shared-grid">
      <label>
        Shared lesson ID
        <input data-scope="step" data-field="id" type="text" value="${escapeHtml(step.id)}">
      </label>
      <label>
        Shared duration
        <input data-scope="step" data-field="duration" type="text" value="${escapeHtml(step.duration)}" placeholder="7 min">
      </label>
    </div>
    ${languageColumns(lang => {
      const langStep = stepFor(lang);
      const content = lessonContent(lang);

      return `
        <div class="form-grid">
          <label>
            Lesson title
            <input data-scope="step" data-lang="${lang}" data-field="title" type="text" value="${escapeHtml(langStep ? langStep.title : "")}">
          </label>
          <label>
            Content file
            <input type="text" value="${escapeHtml(langStep ? langStep.contentUrl : "")}" readonly>
          </label>
          <label class="is-wide">
            Video embed URL
            <input data-scope="content" data-lang="${lang}" data-field="videoUrl" type="text" value="${escapeHtml(content.videoUrl)}" placeholder="https://www.youtube.com/embed/...">
          </label>
          ${richEditor("content", lang, "summary", "Summary", content.summary)}
          <label class="is-wide">
            Actions, one per line
            <textarea data-scope="content" data-lang="${lang}" data-field="actions" rows="7" spellcheck="false">${escapeHtml(Array.isArray(content.actions) ? content.actions.join("\n") : "")}</textarea>
          </label>
          ${richEditor("content", lang, "expected", "Expected result", content.expected)}
        </div>
      `;
    })}
  `;
}

function handleInput(event) {
  const target = event.target;
  const scope = target.dataset.scope;
  const field = target.dataset.field;
  const lang = target.dataset.lang;
  const value = inputValue(target);

  if (!scope || !field) {
    return;
  }

  if (scope === "course") {
    const course = langCourse(lang);

    if (field === "downloads") {
      course.downloads = textToDownloads(value);
    } else if (field !== "labels") {
      course[field] = value;
    }
  }

  if (scope === "module") {
    if (field === "id") {
      setModuleId(value);
    } else if (lang && moduleFor(lang)) {
      moduleFor(lang).title = value;
    }
  }

  if (scope === "step") {
    if (field === "id") {
      setStepId(value);
    } else if (field === "duration") {
      setDuration(value);
    } else if (lang && stepFor(lang)) {
      stepFor(lang).title = value;
    }
  }

  if (scope === "content") {
    const content = lessonContent(lang);

    if (field === "actions") {
      content.actions = value.split("\n").map(line => line.trim()).filter(Boolean);
    } else {
      content[field] = value;
    }
  }

  if (target.dataset.richEditor || target.dataset.htmlSource) {
    syncHtmlControls(target, value);
  }

  markDirty();
}

function handleChange(event) {
  const target = event.target;

  if (target.dataset.scope === "course" && target.dataset.field === "labels") {
    try {
      langCourse(target.dataset.lang).labels = JSON.parse(target.value || "{}");
      markDirty();
    } catch (error) {
      setStatus(`Labels JSON error: ${error.message}`, true);
    }
  }

  if ((target.dataset.scope === "module" || target.dataset.scope === "step") && target.dataset.field === "id") {
    render();
  }
}

function moveItem(list, from, to) {
  if (to < 0 || to >= list.length) {
    return false;
  }

  const item = list.splice(from, 1)[0];
  list.splice(to, 0, item);
  return true;
}

function canMove(list, from, to) {
  return Array.isArray(list) && to >= 0 && to < list.length && from >= 0 && from < list.length;
}

function moveModules(direction) {
  const targetIndex = state.moduleIndex + direction;

  if (!languages().every(lang => canMove(langCourse(lang).modules, state.moduleIndex, targetIndex))) {
    return;
  }

  languages().forEach(lang => moveItem(langCourse(lang).modules, state.moduleIndex, targetIndex));
  state.moduleIndex = targetIndex;
  state.stepIndex = 0;
  markDirty();
  render();
}

function moveLessons(direction) {
  const targetIndex = state.stepIndex + direction;

  if (!languages().every(lang => canMove(moduleFor(lang).steps, state.stepIndex, targetIndex))) {
    return;
  }

  languages().forEach(lang => moveItem(moduleFor(lang).steps, state.stepIndex, targetIndex));
  state.stepIndex = targetIndex;
  markDirty();
  render();
}

function addModule() {
  const used = new Set(baseModules().map(module => module.id));
  const id = nextId("new-section", used);

  languages().forEach(lang => {
    langCourse(lang).modules.push({
      id,
      title: lang === "en" ? "New section" : "Nueva seccion",
      steps: []
    });
  });

  state.moduleIndex = baseModules().length - 1;
  state.stepIndex = 0;
  markDirty();
  render();
}

function addLesson() {
  if (!baseModules().length) {
    addModule();
  }

  const module = baseModules()[state.moduleIndex];
  const used = new Set((module.steps || []).map(step => step.id));
  const id = nextId("new-lesson", used);

  languages().forEach(lang => {
    const langModule = moduleFor(lang);
    const step = {
      id,
      title: lang === "en" ? "New lesson" : "Nueva leccion",
      duration: "",
      contentUrl: `${lang}/${langModule.id}/${id}.json`
    };

    langModule.steps.push(step);
    state.lessons[step.contentUrl] = defaultLessonContent();
  });

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

function regenerateLessonPaths() {
  languages().forEach(lang => {
    const step = stepFor(lang);

    if (!step) {
      return;
    }

    const oldUrl = step.contentUrl;
    step.contentUrl = generateLessonPath(lang);
    moveContent(oldUrl, step.contentUrl);
  });

  markDirty();
  render();
}

function handleAction(action, button) {
  if (action === "reload") {
    if (!state.dirty || window.confirm("Reload files and discard unsaved changes?")) {
      load();
    }
  } else if (action === "save") {
    save();
  } else if (action === "publish") {
    publish();
  } else if (action === "select-module") {
    state.moduleIndex = Number(button.dataset.module);
    state.stepIndex = 0;
    render();
  } else if (action === "select-lesson") {
    state.moduleIndex = Number(button.dataset.module);
    state.stepIndex = Number(button.dataset.step);
    render();
  } else if (action === "add-module") {
    addModule();
  } else if (action === "add-lesson") {
    addLesson();
  } else if (action === "module-up") {
    moveModules(-1);
  } else if (action === "module-down") {
    moveModules(1);
  } else if (action === "delete-module" && baseModules()[state.moduleIndex] && window.confirm("Delete this section in all languages? Lesson files on disk will not be deleted.")) {
    languages().forEach(lang => langCourse(lang).modules.splice(state.moduleIndex, 1));
    state.moduleIndex = Math.max(0, state.moduleIndex - 1);
    state.stepIndex = 0;
    markDirty();
    render();
  } else if (action === "lesson-up") {
    moveLessons(-1);
  } else if (action === "lesson-down") {
    moveLessons(1);
  } else if (action === "regenerate-lesson-paths") {
    regenerateLessonPaths();
  } else if (action === "delete-lesson" && stepFor(primaryLang()) && window.confirm("Delete this lesson in all languages? The lesson files on disk will not be deleted.")) {
    languages().forEach(lang => moduleFor(lang).steps.splice(state.stepIndex, 1));
    state.stepIndex = Math.max(0, state.stepIndex - 1);
    markDirty();
    render();
  }
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
    state.view = "general";
    state.moduleIndex = 0;
    state.stepIndex = 0;
    state.dirty = false;
    ensureParallelStructure();
    render();
    setStatus("Ready.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function save() {
  setStatus("Saving files...");

  try {
    ensureParallelStructure();

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

document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);
document.addEventListener("click", event => {
  const richButton = event.target.closest("[data-rich-command]");
  const viewButton = event.target.closest("[data-view]");
  const actionButton = event.target.closest("[data-action]");

  if (richButton) {
    event.preventDefault();
    applyRichCommand(richButton);
    return;
  }

  if (viewButton) {
    state.view = viewButton.dataset.view;
    render();
  }

  if (actionButton) {
    handleAction(actionButton.dataset.action, actionButton);
  }
});

load();
