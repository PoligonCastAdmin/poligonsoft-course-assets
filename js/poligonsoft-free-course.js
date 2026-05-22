(function () {
  "use strict";

  var ACCENT = "#ff2828";
  var ASSET_BASE = getAssetBase();
  var COURSE_CONFIG_PATH = getCourseConfigPath();
  var COURSE_CONFIG_URL = assetUrl(COURSE_CONFIG_PATH);
  var COURSE_DATA_BASE = new URL("./", COURSE_CONFIG_URL).href;
  var courseData = null;

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

  function getCourseConfigPath() {
    var script = document.currentScript;
    var fromScript = script && script.getAttribute("data-course-src");

    return window.POLIGONSOFT_COURSE_SRC || fromScript || "data/poligonsoft-free-course/course.json";
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

  function dataUrl(path) {
    return new URL(path, COURSE_DATA_BASE).href;
  }

  function loadCourseData() {
    return fetch(COURSE_CONFIG_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Course config request failed: " + response.status);
        }

        return response.json();
      })
      .then(function (data) {
        courseData = data.languages || data;
      });
  }

  function injectHtmlContentStyles() {
    var style;

    if (document.getElementById("poligonsoft-course-html-styles")) {
      return;
    }

    style = document.createElement("style");
    style.id = "poligonsoft-course-html-styles";
    style.textContent = [
      '[data-course="description"] img,[data-course="sidebar-description"] img,[data-course="step-summary"] img,[data-course="expected-text"] img,.course-step-item img{max-width:100%;height:auto;}',
      '[data-course="description"] p,[data-course="sidebar-description"] p,[data-course="step-summary"] p,[data-course="expected-text"] p{margin-top:0;margin-bottom:12px;}',
      '[data-course="description"] p:last-child,[data-course="sidebar-description"] p:last-child,[data-course="step-summary"] p:last-child,[data-course="expected-text"] p:last-child{margin-bottom:0;}'
    ].join("");
    document.head.appendChild(style);
  }

  function course() {
    var firstLang;

    if (!courseData) {
      return null;
    }

    firstLang = Object.keys(courseData)[0];

    return courseData[state.lang] || courseData.en || courseData[firstLang] || null;
  }

  function labels() {
    var currentCourse = course();

    return currentCourse && currentCourse.labels ? currentCourse.labels : {};
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
    var currentCourse = course();

    if (!currentCourse || !currentCourse.modules) {
      return result;
    }

    currentCourse.modules.forEach(function (module, moduleIndex) {
      (module.steps || []).forEach(function (step, stepIndex) {
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

  function setHtml(name, value) {
    var node = el(name);

    if (node) {
      node.innerHTML = value || "";
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
    var activeIndex;

    if (!currentCourse || !active || !steps.length) {
      console.warn("PoligonSoft course: course data is empty or invalid.");
      return;
    }

    activeIndex = steps.findIndex(function (item) {
      return item.path === active.path;
    });

    state.requestedPath = active.path;

    setText("title", currentCourse.title);
    setHtml("description", currentCourse.description);
    setStatText("stat-modules", 0, (currentCourse.modules || []).length);
    setStatText("stat-steps", 1, steps.length);
    setStatText("stat-duration", 2, totalMinutes(steps) + " min");
    setStatText("stat-level", 3, currentCourse.level);
    setText("sidebar-title", currentCourse.sidebarTitle);
    setHtml("sidebar-description", currentCourse.sidebarDescription || currentCourse.description);
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

    (course().modules || []).forEach(function (module, moduleIndex) {
      var group = document.createElement("div");
      group.className = "course-lesson-group";

      var caption = document.createElement("div");
      caption.className = "course-lesson-caption";
      caption.textContent = String(moduleIndex + 1).padStart(2, "0") + ". " + module.title;
      group.appendChild(caption);

      (module.steps || []).forEach(function (step, stepIndex) {
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
    setHtml("step-summary", content.summary || text.loadingLesson);
    setText("actions-title", text.actions);
    setText("expected-title", text.expected);
    setHtml("expected-text", content.expected || "");

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

    fetch(dataUrl(step.contentUrl))
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
    var mediaUrl = String(step.videoUrl || "").trim();
    var imageUrl = isImageUrl(mediaUrl) ? mediaUrl : "";
    var videoUrl = imageUrl ? "" : embedVideoUrl(mediaUrl);

    frame.innerHTML = "";

    if (imageUrl) {
      var image = document.createElement("img");
      image.src = imageUrl;
      image.alt = step.title || "";
      image.loading = "lazy";
      image.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#242424;";
      frame.appendChild(image);
      return;
    }

    if (videoUrl) {
      var iframe = document.createElement("iframe");
      iframe.src = videoUrl;
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

  function embedVideoUrl(rawUrl) {
    var url;
    var videoId;
    var match;

    if (!rawUrl) {
      return "";
    }

    try {
      url = new URL(rawUrl);
    } catch (error) {
      return rawUrl;
    }

    if (url.hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? cleanYouTubeEmbedUrl("https://www.youtube.com/embed/" + videoId) : rawUrl;
    }

    if (url.hostname.indexOf("youtube.com") !== -1 || url.hostname.indexOf("youtube-nocookie.com") !== -1) {
      if (url.pathname.indexOf("/embed/") === 0) {
        return cleanYouTubeEmbedUrl(rawUrl);
      }

      videoId = url.searchParams.get("v");

      if (!videoId) {
        match = url.pathname.match(/\/(?:shorts|live)\/([^/?#]+)/);
        videoId = match && match[1];
      }

      return videoId ? cleanYouTubeEmbedUrl("https://www.youtube.com/embed/" + videoId) : rawUrl;
    }

    if (url.hostname.indexOf("vimeo.com") !== -1 && url.hostname.indexOf("player.vimeo.com") === -1) {
      match = url.pathname.match(/\/(\d+)/);
      return match ? "https://player.vimeo.com/video/" + match[1] : rawUrl;
    }

    return rawUrl;
  }

  function cleanYouTubeEmbedUrl(rawUrl) {
    var url = new URL(rawUrl);

    url.searchParams.set("controls", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("iv_load_policy", "3");
    url.searchParams.set("fs", "0");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("disablekb", "1");

    return url.toString();
  }

  function isImageUrl(rawUrl) {
    var path;

    if (!rawUrl) {
      return false;
    }

    try {
      path = new URL(rawUrl).pathname;
    } catch (error) {
      path = rawUrl.split("?")[0].split("#")[0];
    }

    return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(path);
  }

  function renderActions(actions) {
    var list = el("actions-list");
    list.innerHTML = "";

    actions.forEach(function (action) {
      var item = document.createElement("li");
      item.className = "course-step-item";
      item.innerHTML = action;
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

    (course().downloads || []).forEach(function (download) {
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

  document.addEventListener("DOMContentLoaded", function () {
    if (!allRequiredElementsExist()) {
      return;
    }

    loadCourseData().then(function () {
      injectHtmlContentStyles();
      render();
      initProgress();

      window.addEventListener("hashchange", function () {
        var nextPath = window.location.hash.replace(/^#/, "");

        if (nextPath && nextPath !== state.requestedPath) {
          state.requestedPath = nextPath;
          render();
        }
      });
    }).catch(function (error) {
      console.warn("PoligonSoft course: could not load course data", COURSE_CONFIG_URL, error);
    });
  });
})();
