(function () {
  "use strict";

  var ACCENT = "#ff2828";
  var ASSET_BASE = getAssetBase();

  var courseData = {
    en: {
      courseId: "poligonsoft-free-sand-casting",
      title: "Step-by-Step Sand Casting Simulation in PoligonSoft Free",
      sidebarTitle: "PoligonSoft Free Course",
      description: "Learn sand casting simulation in PoligonSoft Free with step-by-step video lessons. Create a project, prepare geometry, set materials, run a simulation, and review casting results.",
      level: "Free",
      labels: {
        modules: "modules",
        steps: "steps",
        approx: "approx.",
        level: "course level",
        progress: "Progress",
        lesson: "Lesson",
        step: "Step",
        of: "of",
        actions: "Actions",
        expected: "Expected result",
        loadingLesson: "Loading lesson...",
        previous: "Previous step",
        next: "Next step",
        markComplete: "Mark as completed",
        completed: "Completed",
        progressSync: "Progress sync",
        guestProgress: "Sign in to save completed lessons and continue later.",
        loadingProgress: "Loading saved progress...",
        savedProgress: "Signed in. Completed {done} of {total} steps.",
        progressUnavailable: "Progress sync is not available on this page yet.",
        login: "Log in",
        resetProgress: "Reset progress",
        resetConfirm: "Reset your course progress?",
        videoMissing: "Video will be added later",
        videoCaption: "Placeholder for YouTube / Vimeo embed"
      },
      downloads: [
        {
          title: "Sand casting sample model",
          url: "#"
        },
        {
          title: "Project files archive",
          url: "#"
        }
      ],
      modules: [
        {
          id: "project-setup",
          title: "Project setup",
          steps: [
            {
              id: "install",
              title: "Install and open PoligonSoft Free",
              duration: "5 min",
              contentUrl: "data/poligonsoft-free-course/en/project-setup/install.json"
            },
            {
              id: "new-project",
              title: "Create a sand casting project",
              duration: "7 min",
              contentUrl: "data/poligonsoft-free-course/en/project-setup/new-project.json"
            }
          ]
        },
        {
          id: "geometry-materials",
          title: "Geometry and materials",
          steps: [
            {
              id: "import-geometry",
              title: "Import casting geometry",
              duration: "8 min",
              contentUrl: "data/poligonsoft-free-course/en/geometry-materials/import-geometry.json"
            },
            {
              id: "assign-material",
              title: "Assign alloy and mold material",
              duration: "9 min",
              contentUrl: "data/poligonsoft-free-course/en/geometry-materials/assign-material.json"
            }
          ]
        },
        {
          id: "simulation-results",
          title: "Simulation and results",
          steps: [
            {
              id: "run-simulation",
              title: "Run the first simulation",
              duration: "6 min",
              contentUrl: "data/poligonsoft-free-course/en/simulation-results/run-simulation.json"
            },
            {
              id: "review-results",
              title: "Review casting results",
              duration: "11 min",
              contentUrl: "data/poligonsoft-free-course/en/simulation-results/review-results.json"
            }
          ]
        }
      ]
    },
    es: {
      courseId: "poligonsoft-free-sand-casting",
      title: "Simulacion de fundicion en arena paso a paso en PoligonSoft Free",
      sidebarTitle: "Curso PoligonSoft Free",
      description: "Aprenda simulacion de fundicion en arena en PoligonSoft Free con lecciones en video paso a paso. Cree un proyecto, prepare la geometria, configure materiales, ejecute la simulacion y revise resultados.",
      level: "Free",
      labels: {
        modules: "modulos",
        steps: "pasos",
        approx: "aprox.",
        level: "nivel del curso",
        progress: "Progreso",
        lesson: "Leccion",
        step: "Paso",
        of: "de",
        actions: "Que hacer",
        expected: "Resultado esperado",
        loadingLesson: "Cargando leccion...",
        previous: "Paso anterior",
        next: "Siguiente paso",
        markComplete: "Marcar como completado",
        completed: "Completado",
        progressSync: "Sincronizacion de progreso",
        guestProgress: "Inicie sesion para guardar lecciones completadas y continuar despues.",
        loadingProgress: "Cargando progreso guardado...",
        savedProgress: "Sesion iniciada. Completado {done} de {total} pasos.",
        progressUnavailable: "La sincronizacion de progreso aun no esta disponible en esta pagina.",
        login: "Log in",
        resetProgress: "Restablecer progreso",
        resetConfirm: "Restablecer el progreso del curso?",
        videoMissing: "El video se agregara mas tarde",
        videoCaption: "Marcador para YouTube / Vimeo embed"
      },
      downloads: [
        {
          title: "Modelo de ejemplo para fundicion en arena",
          url: "#"
        },
        {
          title: "Archivo del proyecto",
          url: "#"
        }
      ],
      modules: [
        {
          id: "project-setup",
          title: "Preparacion del proyecto",
          steps: [
            {
              id: "install",
              title: "Instalar y abrir PoligonSoft Free",
              duration: "5 min",
              contentUrl: "data/poligonsoft-free-course/es/project-setup/install.json"
            },
            {
              id: "new-project",
              title: "Crear un proyecto de fundicion en arena",
              duration: "7 min",
              contentUrl: "data/poligonsoft-free-course/es/project-setup/new-project.json"
            }
          ]
        },
        {
          id: "geometry-materials",
          title: "Geometria y materiales",
          steps: [
            {
              id: "import-geometry",
              title: "Importar geometria de la pieza",
              duration: "8 min",
              contentUrl: "data/poligonsoft-free-course/es/geometry-materials/import-geometry.json"
            },
            {
              id: "assign-material",
              title: "Asignar aleacion y material del molde",
              duration: "9 min",
              contentUrl: "data/poligonsoft-free-course/es/geometry-materials/assign-material.json"
            }
          ]
        },
        {
          id: "simulation-results",
          title: "Simulacion y resultados",
          steps: [
            {
              id: "run-simulation",
              title: "Ejecutar la primera simulacion",
              duration: "6 min",
              contentUrl: "data/poligonsoft-free-course/es/simulation-results/run-simulation.json"
            },
            {
              id: "review-results",
              title: "Revisar resultados de fundicion",
              duration: "11 min",
              contentUrl: "data/poligonsoft-free-course/es/simulation-results/review-results.json"
            }
          ]
        }
      ]
    }
  };

  var state = {
    lang: getInitialLang(),
    requestedPath: window.location.hash.replace(/^#/, "")
  };

  var progress = {
    auth: null,
    db: null,
    user: null,
    loaded: false,
    unavailable: false,
    saving: false,
    lastStep: "",
    completedSteps: {}
  };

  var rememberTimer = null;

  function getInitialLang() {
    var params = new URLSearchParams(window.location.search);
    var lang = params.get("lang");

    if (lang === "en" || lang === "es") {
      return lang;
    }

    return window.location.pathname.indexOf("/es/") === 0 ? "es" : "en";
  }

  function getAssetBase() {
    var scriptUrl = document.currentScript && document.currentScript.src;

    if (scriptUrl) {
      return new URL("../", scriptUrl).href;
    }

    return "https://poligoncastadmin.github.io/poligonsoft-course-assets/";
  }

  function assetUrl(path) {
    return new URL(path, ASSET_BASE).href;
  }

  function course() {
    return courseData[state.lang] || courseData.en;
  }

  function labels() {
    return course().labels;
  }

  function el(name) {
    return document.querySelector('[data-course="' + name + '"]');
  }

  function allRequiredElementsExist() {
    var required = [
      "stat-modules",
      "sidebar-title",
      "sidebar-description",
      "progress-label",
      "progress-text",
      "progress-bar",
      "account-progress-title",
      "account-progress-text",
      "continue-learning",
      "lesson-nav",
      "module-title",
      "module-meta",
      "video",
      "step-kicker",
      "step-title",
      "step-summary",
      "actions-title",
      "actions-list",
      "expected-title",
      "expected-text",
      "prev-step",
      "complete-step",
      "next-step",
      "course-downloads"
    ];

    var missing = required.filter(function (name) {
      return !el(name);
    });

    if (missing.length) {
      console.warn("PoligonSoft course: missing data-course elements:", missing);
      return false;
    }

    return true;
  }

  function flatSteps() {
    var result = [];

    course().modules.forEach(function (module, moduleIndex) {
      module.steps.forEach(function (step, stepIndex) {
        result.push({
          module: module,
          step: step,
          moduleIndex: moduleIndex,
          stepIndex: stepIndex,
          path: module.id + "/" + step.id
        });
      });
    });

    return result;
  }

  function activeItem() {
    var steps = flatSteps();
    var requested = decodeURIComponent(state.requestedPath || "");

    return steps.find(function (item) {
      return item.path === requested || item.step.id === requested;
    }) || steps[0];
  }

  function isCompleted(path) {
    return Boolean(progress.loaded && progress.completedSteps[path]);
  }

  function completedCount(steps) {
    return steps.filter(function (item) {
      return isCompleted(item.path);
    }).length;
  }

  function totalMinutes(steps) {
    return steps.reduce(function (sum, item) {
      var match = String(item.step.duration || "").match(/\d+/);
      return sum + (match ? Number(match[0]) : 0);
    }, 0);
  }

  function setText(name, value) {
    var node = el(name);

    if (node) {
      node.textContent = value;
    }
  }

  function setStatText(name, index, value) {
    var node = el(name);
    var statNodes;

    if (!node) {
      statNodes = document.querySelectorAll(".course-stats .course-stat-number");
      node = statNodes[index] || null;
    }

    if (node) {
      node.textContent = value;
    }
  }

  function render() {
    var currentCourse = course();
    var text = labels();
    var steps = flatSteps();
    var active = activeItem();
    var activeIndex = steps.findIndex(function (item) {
      return item.path === active.path;
    });

    state.requestedPath = active.path;

    setText("title", currentCourse.title);
    setText("description", currentCourse.description);
    setStatText("stat-modules", 0, currentCourse.modules.length);
    setStatText("stat-steps", 1, steps.length);
    setStatText("stat-duration", 2, totalMinutes(steps) + " min");
    setStatText("stat-level", 3, currentCourse.level);
    setText("sidebar-title", currentCourse.sidebarTitle);
    setText("sidebar-description", currentCourse.description);
    setText("progress-label", text.progress);
    setText("progress-text", (activeIndex + 1) + " " + text.of + " " + steps.length);

    el("progress-bar").style.width = ((activeIndex + 1) / steps.length * 100) + "%";

    renderNavigation(active);
    renderLesson(active, activeIndex, steps);
    renderAccountProgress(steps);
    renderDownloads();
    updateUrl(active.path);
  }

  function renderNavigation(active) {
    var nav = el("lesson-nav");
    nav.innerHTML = "";

    course().modules.forEach(function (module, moduleIndex) {
      var group = document.createElement("div");
      group.className = "course-lesson-group";

      var caption = document.createElement("div");
      caption.className = "course-lesson-caption";
      caption.textContent = String(moduleIndex + 1).padStart(2, "0") + ". " + module.title;
      group.appendChild(caption);

      module.steps.forEach(function (step, stepIndex) {
        var path = module.id + "/" + step.id;
        var button = document.createElement("button");
        var completed = isCompleted(path);

        button.type = "button";
        button.className = "course-step-link" +
          (path === active.path ? " is-active" : "") +
          (completed ? " is-complete" : "");
        button.setAttribute("data-step-path", path);

        var number = document.createElement("span");
        number.className = "course-step-number";
        number.textContent = stepIndex + 1;

        var title = document.createElement("span");
        title.className = "course-step-title-nav";
        title.textContent = step.title;

        var meta = document.createElement("span");
        meta.className = completed ? "course-step-done" : "course-step-meta";
        meta.textContent = completed ? "✓" : step.duration;

        button.appendChild(number);
        button.appendChild(title);
        button.appendChild(meta);
        button.addEventListener("click", function () {
          state.requestedPath = path;
          render();
        });

        group.appendChild(button);
      });

      nav.appendChild(group);
    });
  }

  function renderLesson(active, activeIndex, steps) {
    var text = labels();
    var step = active.step;
    var content = step._content || {};

    ensureLessonContent(active);

    setText("module-title", active.module.title);
    setText("module-meta", text.lesson + " " + (activeIndex + 1) + " " + text.of + " " + steps.length);
    setText("step-kicker", text.step + " " + (activeIndex + 1));
    setText("step-title", step.title);
    setText("step-summary", content.summary || text.loadingLesson);
    setText("actions-title", text.actions);
    setText("expected-title", text.expected);
    setText("expected-text", content.expected || "");

    renderVideo(Object.assign({}, step, content));
    renderActions(content.actions || []);
    renderButtons(active, activeIndex, steps);
    rememberLastViewed(active.path);
  }

  function ensureLessonContent(active) {
    var step = active.step;
    var activePath = active.path;

    if (step._content || step._loading || !step.contentUrl) {
      return;
    }

    step._loading = true;

    fetch(assetUrl(step.contentUrl))
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Lesson content request failed: " + response.status);
        }

        return response.json();
      })
      .then(function (content) {
        step._content = content;
      })
      .catch(function (error) {
        console.warn("PoligonSoft course: could not load lesson content", step.contentUrl, error);
        step._content = {
          videoUrl: "",
          summary: labels().loadingLesson,
          actions: [],
          expected: ""
        };
      })
      .finally(function () {
        step._loading = false;

        if (state.requestedPath === activePath) {
          render();
        }
      });
  }

  function renderVideo(step) {
    var frame = el("video");
    frame.innerHTML = "";

    if (step.videoUrl) {
      var iframe = document.createElement("iframe");
      iframe.src = step.videoUrl;
      iframe.title = step.title;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
      return;
    }

    var text = labels();
    var placeholder = document.createElement("div");
    placeholder.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;color:#fff;text-align:center;background:#242424;";

    var title = document.createElement("strong");
    title.style.cssText = "font-size:1.5rem;line-height:1.15;margin-bottom:8px;";
    title.textContent = text.videoMissing;

    var caption = document.createElement("span");
    caption.style.cssText = "font-size:0.875rem;line-height:1.4;color:rgba(255,255,255,.82);";
    caption.textContent = text.videoCaption;

    placeholder.appendChild(title);
    placeholder.appendChild(caption);
    frame.appendChild(placeholder);
  }

  function renderActions(actions) {
    var list = el("actions-list");
    list.innerHTML = "";

    actions.forEach(function (action) {
      var item = document.createElement("li");
      item.className = "course-step-item";
      item.textContent = action;
      list.appendChild(item);
    });
  }

  function renderButtons(active, activeIndex, steps) {
    var text = labels();
    var prev = el("prev-step");
    var complete = el("complete-step");
    var next = el("next-step");
    var completeState = isCompleted(active.path);

    setButtonDisabled(prev, activeIndex === 0);
    setButtonDisabled(next, activeIndex === steps.length - 1);

    prev.textContent = text.previous;
    next.textContent = text.next;
    complete.textContent = progress.saving ? "..." : (completeState ? text.completed : text.markComplete);

    complete.classList.toggle("is-complete", completeState);
    complete.classList.toggle("is-disabled", !progress.user || progress.unavailable || progress.saving);
    complete.setAttribute("aria-disabled", completeState || !progress.user || progress.unavailable || progress.saving ? "true" : "false");

    prev.onclick = function (event) {
      event.preventDefault();
      if (activeIndex > 0) {
        state.requestedPath = steps[activeIndex - 1].path;
        render();
      }
    };

    next.onclick = function (event) {
      event.preventDefault();
      if (activeIndex < steps.length - 1) {
        state.requestedPath = steps[activeIndex + 1].path;
        render();
      }
    };

    complete.onclick = function (event) {
      event.preventDefault();
      if (!completeState && progress.user && !progress.unavailable && !progress.saving) {
        markComplete(active.path);
      }
    };
  }

  function setButtonDisabled(button, disabled) {
    button.disabled = disabled;
    button.classList.toggle("is-disabled", disabled);
    button.setAttribute("aria-disabled", disabled ? "true" : "false");

    if (disabled) {
      button.setAttribute("tabindex", "-1");
    } else {
      button.removeAttribute("tabindex");
    }
  }

  function renderAccountProgress(steps) {
    var text = labels();
    var resetButton = el("continue-learning");
    var hasProgress = Boolean(progress.lastStep || Object.keys(progress.completedSteps).length);

    setText("account-progress-title", text.progressSync);

    if (progress.unavailable) {
      setText("account-progress-text", text.progressUnavailable);
      resetButton.textContent = text.login;
      resetButton.classList.remove("is-disabled");
      resetButton.disabled = false;
      resetButton.onclick = function (event) {
        event.preventDefault();
        window.location.href = "/login";
      };
    } else if (!progress.user) {
      setText("account-progress-text", text.guestProgress);
      resetButton.textContent = text.login;
      resetButton.classList.remove("is-disabled");
      resetButton.disabled = false;
      resetButton.onclick = function (event) {
        event.preventDefault();
        window.location.href = "/login";
      };
    } else if (!progress.loaded) {
      setText("account-progress-text", text.loadingProgress);
      resetButton.textContent = text.resetProgress;
      resetButton.classList.add("is-disabled");
      resetButton.disabled = true;
      resetButton.onclick = function (event) {
        event.preventDefault();
      };
    } else {
      setText("account-progress-text", text.savedProgress
        .replace("{done}", completedCount(steps))
        .replace("{total}", steps.length));

      resetButton.textContent = text.resetProgress;
      resetButton.classList.toggle("is-disabled", !hasProgress || progress.saving);
      resetButton.disabled = !hasProgress || progress.saving;
      resetButton.onclick = function (event) {
        event.preventDefault();

        if (hasProgress && !progress.saving) {
          resetProgress();
        }
      };
    }
  }

  function renderDownloads() {
    var container = el("course-downloads");
    container.innerHTML = "";

    course().downloads.forEach(function (download) {
      var link = document.createElement("a");
      link.className = "course-download-link";
      link.href = download.url || "#";
      link.textContent = download.title;

      if (download.url && download.url !== "#") {
        link.target = "_blank";
        link.rel = "noopener";
      }

      container.appendChild(link);
    });
  }

  function updateUrl(path) {
    var url = new URL(window.location.href);
    url.hash = path;
    window.history.replaceState(null, "", url);
  }

  function firebaseServices() {
    if (progress.auth && progress.db) {
      return {
        auth: progress.auth,
        db: progress.db
      };
    }

    var firebaseGlobal = window.firebase;
    var auth = window.auth || (firebaseGlobal && firebaseGlobal.auth ? firebaseGlobal.auth() : null);
    var db = window.db || (firebaseGlobal && firebaseGlobal.firestore ? firebaseGlobal.firestore() : null);

    if (!auth || !db) {
      return null;
    }

    progress.auth = auth;
    progress.db = db;

    return {
      auth: auth,
      db: db
    };
  }

  function initProgress() {
    var services = firebaseServices();

    if (!services || !services.auth.onAuthStateChanged) {
      progress.unavailable = true;
      render();
      return;
    }

    services.auth.onAuthStateChanged(function (user) {
      progress.user = user || null;
      progress.loaded = false;
      progress.lastStep = "";
      progress.completedSteps = {};

      if (progress.user) {
        loadProgress();
      } else {
        render();
      }
    });
  }

  function progressDocRef() {
    if (!progress.user || !progress.db) {
      return null;
    }

    var docId = [
      progress.user.uid,
      course().courseId,
      state.lang
    ].join("_").replace(/[^a-zA-Z0-9_-]/g, "_");

    return progress.db.collection("userCourseProgress").doc(docId);
  }

  function loadProgress() {
    var ref = progressDocRef();

    if (!ref) {
      return;
    }

    ref.get()
      .then(function (snapshot) {
        var saved = snapshot.exists ? snapshot.data() : {};
        progress.completedSteps = saved.completedSteps || {};
        progress.lastStep = saved.lastStep || "";
        progress.loaded = true;
        render();
      })
      .catch(function () {
        progress.unavailable = true;
        render();
      });
  }

  function markComplete(path) {
    var ref = progressDocRef();

    if (!ref) {
      return;
    }

    var completed = Object.assign({}, progress.completedSteps);
    completed[path] = true;
    progress.saving = true;
    render();

    ref.set({
      userId: progress.user.uid,
      courseId: course().courseId,
      lang: state.lang,
      lastStep: path,
      completedSteps: completed,
      completedCount: Object.keys(completed).length,
      updatedAt: serverTimestamp()
    }, { merge: true })
      .then(function () {
        progress.completedSteps = completed;
        progress.lastStep = path;
        progress.loaded = true;
      })
      .catch(function () {
        progress.unavailable = true;
      })
      .finally(function () {
        progress.saving = false;
        render();
      });
  }

  function resetProgress() {
    var ref = progressDocRef();
    var text = labels();

    if (!ref || !window.confirm(text.resetConfirm)) {
      return;
    }

    progress.saving = true;
    render();

    ref.delete()
      .then(function () {
        progress.completedSteps = {};
        progress.lastStep = "";
        progress.loaded = true;
      })
      .catch(function () {
        progress.unavailable = true;
      })
      .finally(function () {
        progress.saving = false;
        render();
      });
  }

  function rememberLastViewed(path) {
    var ref;

    if (!progress.user || !progress.loaded || progress.lastStep === path) {
      return;
    }

    ref = progressDocRef();

    if (!ref) {
      return;
    }

    progress.lastStep = path;
    window.clearTimeout(rememberTimer);
    rememberTimer = window.setTimeout(function () {
      ref.set({
        userId: progress.user.uid,
        courseId: course().courseId,
        lang: state.lang,
        lastStep: path,
        viewedAt: serverTimestamp()
      }, { merge: true }).catch(function () {
        progress.unavailable = true;
        render();
      });
    }, 500);
  }

  function serverTimestamp() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }

    return new Date().toISOString();
  }

  function normalizeCourseLanguageLinks() {
    var isCoursePage = /\/(?:es\/)?poligonsoft-free-course\/?$/.test(window.location.pathname);
    var isSpanish = window.location.pathname.indexOf("/es/") === 0;
    var languageLabel;
    var linkEs;
    var linkEn;
    var languageList;

    if (!isCoursePage) {
      return;
    }

    languageLabel = document.querySelector(".langdroptext");
    if (languageLabel) {
      languageLabel.textContent = isSpanish ? "Es" : "En";
    }

    linkEs = document.getElementById("link-es");
    if (!linkEs) {
      return;
    }

    languageList = linkEs.parentElement;
    linkEn = document.getElementById("link-us");

    if (!linkEn) {
      linkEn = linkEs.cloneNode(false);
      linkEn.id = "link-us";
      languageList.insertBefore(linkEn, linkEs);
    }

    configureLanguageLink(linkEn, "En", "/poligonsoft-free-course");
    configureLanguageLink(linkEs, "Es", "/es/poligonsoft-free-course");
    hideUnsupportedLanguageLink("link-ru");
    hideUnsupportedLanguageLink("link-zh");
  }

  function configureLanguageLink(link, label, href) {
    link.textContent = label;
    link.href = href;

    link.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = href;
    }, true);
  }

  function hideUnsupportedLanguageLink(id) {
    var link = document.getElementById(id);

    if (link) {
      link.style.display = "none";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!allRequiredElementsExist()) {
      return;
    }

    normalizeCourseLanguageLinks();
    render();
    initProgress();

    window.addEventListener("hashchange", function () {
      var nextPath = window.location.hash.replace(/^#/, "");

      if (nextPath && nextPath !== state.requestedPath) {
        state.requestedPath = nextPath;
        render();
      }
    });
  });
})();
