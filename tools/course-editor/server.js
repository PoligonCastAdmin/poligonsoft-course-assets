const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const publicDir = path.join(__dirname, "public");
const dataRoot = path.join(repoRoot, "data");
const coursesIndexFile = path.join(dataRoot, "courses.json");
const fallbackCourseId = "poligonsoft-free-course";
const port = Number(process.env.PORT || 8787);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data, null, 2), "application/json; charset=utf-8");
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 10 * 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function slugify(value, fallback) {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function normalizeCourseId(value) {
  const id = slugify(value, fallbackCourseId);

  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error(`Unsafe course id: ${value}`);
  }

  return id;
}

function courseDirFor(courseId) {
  return path.join(dataRoot, normalizeCourseId(courseId));
}

function courseFileFor(courseId) {
  return path.join(courseDirFor(courseId), "course.json");
}

function safeCoursePath(courseId, relativePath) {
  const baseDir = courseDirFor(courseId);
  const normalized = String(relativePath || "").replace(/\\/g, "/");

  if (!normalized || normalized.startsWith("/") || /^[a-z]+:\/\//i.test(normalized) || normalized.includes("..")) {
    throw new Error(`Unsafe course file path: ${relativePath}`);
  }

  const fullPath = path.resolve(baseDir, normalized);
  const allowedRoot = baseDir + path.sep;

  if (!fullPath.startsWith(allowedRoot)) {
    throw new Error(`Course file path escapes the data folder: ${relativePath}`);
  }

  return fullPath;
}

function defaultLessonContent() {
  return {
    videoUrl: "",
    summary: "",
    actions: [],
    expected: ""
  };
}

function uniqueSlug(base, used) {
  let slug = base;
  let index = 2;

  while (used.has(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }

  used.add(slug);
  return slug;
}

function normalizeCourse(course, lessons) {
  if (!course || typeof course !== "object" || !course.languages) {
    throw new Error("Course payload must contain a languages object.");
  }

  Object.keys(course.languages).forEach(lang => {
    const langData = course.languages[lang];
    const moduleIds = new Set();

    langData.downloads = Array.isArray(langData.downloads) ? langData.downloads : [];
    langData.modules = Array.isArray(langData.modules) ? langData.modules : [];

    langData.modules.forEach((module, moduleIndex) => {
      const stepIds = new Set();

      module.id = uniqueSlug(slugify(module.id || module.title, `module-${moduleIndex + 1}`), moduleIds);
      module.title = module.title || module.id;
      module.steps = Array.isArray(module.steps) ? module.steps : [];

      module.steps.forEach((step, stepIndex) => {
        step.id = uniqueSlug(slugify(step.id || step.title, `lesson-${stepIndex + 1}`), stepIds);
        step.title = step.title || step.id;
        step.duration = step.duration || "";

        if (!step.contentUrl) {
          step.contentUrl = `${lang}/${module.id}/${step.id}.json`;
        }

        if (!lessons[step.contentUrl]) {
          lessons[step.contentUrl] = defaultLessonContent();
        }
      });
    });
  });

  return course;
}

function collectStepUrls(course) {
  const urls = [];

  Object.keys(course.languages || {}).forEach(lang => {
    (course.languages[lang].modules || []).forEach(module => {
      (module.steps || []).forEach(step => {
        if (step.contentUrl) {
          urls.push(step.contentUrl);
        }
      });
    });
  });

  return urls;
}

function courseMetadata(courseId, course) {
  const languages = Object.keys(course.languages || {});
  const defaultLang = course.defaultLang && course.languages[course.defaultLang] ? course.defaultLang : languages[0];
  const defaultCourse = course.languages[defaultLang] || {};

  return {
    id: courseId,
    folder: courseId,
    title: defaultCourse.title || courseId,
    languages
  };
}

async function readCoursesIndexRaw() {
  if (!(await pathExists(coursesIndexFile))) {
    return {
      defaultCourse: fallbackCourseId,
      courses: []
    };
  }

  const index = await readJson(coursesIndexFile);

  return {
    defaultCourse: index.defaultCourse || fallbackCourseId,
    courses: Array.isArray(index.courses) ? index.courses : []
  };
}

async function discoverCourseIds() {
  if (!(await pathExists(dataRoot))) {
    return [];
  }

  const entries = await fs.readdir(dataRoot, { withFileTypes: true });
  const ids = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const id = normalizeCourseId(entry.name);

    if (await pathExists(courseFileFor(id))) {
      ids.push(id);
    }
  }

  return ids.sort();
}

async function loadCoursesIndex() {
  const raw = await readCoursesIndexRaw();
  const ids = new Set();

  raw.courses.forEach(item => {
    if (item && (item.id || item.folder)) {
      ids.add(normalizeCourseId(item.id || item.folder));
    }
  });

  (await discoverCourseIds()).forEach(id => ids.add(id));

  const courses = [];

  for (const id of ids) {
    if (!(await pathExists(courseFileFor(id)))) {
      continue;
    }

    const course = await readJson(courseFileFor(id));
    const stored = raw.courses.find(item => item && normalizeCourseId(item.id || item.folder) === id) || {};

    courses.push({
      ...stored,
      ...courseMetadata(id, course)
    });
  }

  const defaultCourse = courses.some(item => item.id === raw.defaultCourse)
    ? raw.defaultCourse
    : (courses[0] ? courses[0].id : fallbackCourseId);

  return {
    defaultCourse,
    courses
  };
}

async function writeCoursesIndex(index) {
  await writeJson(coursesIndexFile, {
    defaultCourse: index.defaultCourse || (index.courses[0] && index.courses[0].id) || fallbackCourseId,
    courses: (index.courses || []).map(item => ({
      id: item.id,
      title: item.title,
      folder: item.folder || item.id,
      languages: item.languages || []
    }))
  });
}

async function upsertCourseIndex(courseId, course) {
  const index = await loadCoursesIndex();
  const metadata = courseMetadata(courseId, course);
  const existingIndex = index.courses.findIndex(item => item.id === courseId);

  if (existingIndex >= 0) {
    index.courses[existingIndex] = metadata;
  } else {
    index.courses.push(metadata);
  }

  if (!index.defaultCourse || !index.courses.some(item => item.id === index.defaultCourse)) {
    index.defaultCourse = courseId;
  }

  await writeCoursesIndex(index);
}

async function loadEditorData(courseId) {
  const id = normalizeCourseId(courseId);
  const file = courseFileFor(id);

  if (!(await pathExists(file))) {
    throw new Error(`Course not found: ${id}`);
  }

  const course = await readJson(file);
  const lessons = {};

  for (const contentUrl of collectStepUrls(course)) {
    try {
      lessons[contentUrl] = await readJson(safeCoursePath(id, contentUrl));
    } catch {
      lessons[contentUrl] = defaultLessonContent();
    }
  }

  return { courseId: id, course, lessons };
}

async function saveEditorData(courseId, payload) {
  const id = normalizeCourseId(courseId);
  const lessons = payload.lessons && typeof payload.lessons === "object" ? payload.lessons : {};
  const course = normalizeCourse(payload.course, lessons);
  const written = [];
  const file = courseFileFor(id);

  await writeJson(file, course);
  written.push(path.relative(repoRoot, file));

  for (const contentUrl of collectStepUrls(course)) {
    const content = lessons[contentUrl] || defaultLessonContent();
    const lessonFile = safeCoursePath(id, contentUrl);

    await writeJson(lessonFile, {
      videoUrl: content.videoUrl || "",
      summary: content.summary || "",
      actions: Array.isArray(content.actions) ? content.actions : [],
      expected: content.expected || ""
    });

    written.push(path.relative(repoRoot, lessonFile));
  }

  await upsertCourseIndex(id, course);
  written.push(path.relative(repoRoot, coursesIndexFile));

  return written;
}

function defaultLabels(lang, sourceCourse) {
  const source = sourceCourse && sourceCourse.languages && sourceCourse.languages[lang];

  if (source && source.labels) {
    return source.labels;
  }

  if (lang === "es") {
    return {
      modules: "modulos",
      steps: "pasos",
      approx: "aprox.",
      level: "nivel del curso",
      progress: "Progreso",
      lesson: "Leccion",
      step: "Paso",
      of: "de",
      actions: "Acciones",
      expected: "Resultado esperado",
      loadingLesson: "Cargando leccion...",
      previous: "Paso anterior",
      next: "Paso siguiente",
      markComplete: "Completado",
      completed: "Completado",
      progressSync: "Sincronizacion de progreso",
      guestProgress: "Inicie sesion para guardar las lecciones completadas y continuar mas tarde.",
      loadingProgress: "Cargando progreso guardado...",
      savedProgress: "Sesion iniciada. Completado {done} de {total} pasos.",
      progressUnavailable: "La sincronizacion de progreso aun no esta disponible en esta pagina.",
      login: "Iniciar sesion",
      resetProgress: "Restablecer progreso",
      resetConfirm: "Restablecer el progreso del curso?",
      videoMissing: "El video se agregara mas tarde",
      videoCaption: "Marcador para YouTube / Vimeo embed"
    };
  }

  return {
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
  };
}

async function blankCourseTemplate(courseId, titleEn, titleEs) {
  let sourceCourse = null;

  if (await pathExists(courseFileFor(fallbackCourseId))) {
    sourceCourse = await readJson(courseFileFor(fallbackCourseId));
  }

  return {
    defaultLang: "en",
    languages: {
      en: {
        courseId,
        eyebrow: "Free training course",
        title: titleEn || "New course",
        sidebarTitle: titleEn || "New course",
        description: "",
        level: "Free",
        labels: defaultLabels("en", sourceCourse),
        downloads: [],
        modules: [
          {
            id: "introduction",
            title: "Introduction",
            steps: [
              {
                id: "course-introduction",
                title: "Course introduction",
                duration: "1 min",
                contentUrl: "en/introduction/course-introduction.json"
              }
            ]
          }
        ]
      },
      es: {
        courseId,
        eyebrow: "Curso gratuito",
        title: titleEs || titleEn || "Nuevo curso",
        sidebarTitle: titleEs || titleEn || "Nuevo curso",
        description: "",
        level: "Free",
        labels: defaultLabels("es", sourceCourse),
        downloads: [],
        modules: [
          {
            id: "introduction",
            title: "Introduccion",
            steps: [
              {
                id: "course-introduction",
                title: "Introduccion del curso",
                duration: "1 min",
                contentUrl: "es/introduction/course-introduction.json"
              }
            ]
          }
        ]
      }
    }
  };
}

function setCourseIdentity(course, courseId, titleEn, titleEs) {
  if (!course || !course.languages) {
    return course;
  }

  Object.keys(course.languages).forEach(lang => {
    const langData = course.languages[lang];

    langData.courseId = courseId;

    if (lang === "en" && titleEn) {
      langData.title = titleEn;
      langData.sidebarTitle = titleEn;
    }

    if (lang === "es" && titleEs) {
      langData.title = titleEs;
      langData.sidebarTitle = titleEs;
    }
  });

  return course;
}

async function createCourse(payload) {
  const id = normalizeCourseId(payload.id || payload.titleEn || payload.titleEs || "new-course");
  const targetDir = courseDirFor(id);

  if (await pathExists(courseFileFor(id))) {
    throw new Error(`Course already exists: ${id}`);
  }

  if (payload.sourceCourseId) {
    const sourceId = normalizeCourseId(payload.sourceCourseId);

    if (!(await pathExists(courseFileFor(sourceId)))) {
      throw new Error(`Source course not found: ${sourceId}`);
    }

    await fs.cp(courseDirFor(sourceId), targetDir, { recursive: true, errorOnExist: true });

    const copied = setCourseIdentity(
      await readJson(courseFileFor(id)),
      id,
      payload.titleEn,
      payload.titleEs
    );

    await writeJson(courseFileFor(id), copied);
    await upsertCourseIndex(id, copied);

    return { courseId: id };
  }

  const course = await blankCourseTemplate(id, payload.titleEn, payload.titleEs);
  const lessons = {
    "en/introduction/course-introduction.json": {
      videoUrl: "",
      summary: "<p>Describe what students will learn in this course.</p>",
      actions: ["<p>Add the first action.</p>"],
      expected: "<p>Describe the expected result.</p>"
    },
    "es/introduction/course-introduction.json": {
      videoUrl: "",
      summary: "<p>Describa lo que los estudiantes aprenderan en este curso.</p>",
      actions: ["<p>Agregue la primera accion.</p>"],
      expected: "<p>Describa el resultado esperado.</p>"
    }
  };

  await saveEditorData(id, { course, lessons });

  return { courseId: id };
}

function runGit(args) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd: repoRoot }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function publish(courseId, message) {
  const id = normalizeCourseId(courseId);
  const coursePath = `data/${id}`;
  const indexPath = "data/courses.json";
  const paths = [coursePath, indexPath];

  await runGit(["add", "--", ...paths]);

  const afterAdd = await runGit(["diff", "--cached", "--name-only", "--", ...paths]);

  if (!afterAdd.stdout.trim()) {
    return {
      committed: false,
      output: "No selected course data changes to publish."
    };
  }

  const commit = await runGit(["commit", "-m", message || `Update ${id} course content`, "--", ...paths]);
  const push = await runGit(["push"]);

  return {
    committed: true,
    output: [commit.stdout, commit.stderr, push.stdout, push.stderr].filter(Boolean).join("\n")
  };
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = path.resolve(publicDir, requested);

  if (!file.startsWith(publicDir + path.sep)) {
    send(res, 403, "Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(file);
    send(res, 200, body, mimeTypes[path.extname(file)] || "application/octet-stream");
  } catch {
    send(res, 404, "Not found");
  }
}

async function resolveCourseId(url) {
  const requested = url.searchParams.get("course");

  if (requested) {
    return normalizeCourseId(requested);
  }

  return (await loadCoursesIndex()).defaultCourse;
}

async function handleApi(req, res, url) {
  try {
    if (req.method === "GET" && url.pathname === "/api/courses") {
      sendJson(res, 200, await loadCoursesIndex());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/courses") {
      sendJson(res, 200, await createCourse(await readBody(req)));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/course") {
      sendJson(res, 200, await loadEditorData(await resolveCourseId(url)));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/course") {
      const written = await saveEditorData(await resolveCourseId(url), await readBody(req));
      sendJson(res, 200, { ok: true, written });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/git-status") {
      const status = await runGit(["status", "--short"]);
      sendJson(res, 200, { status: status.stdout });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/publish") {
      const body = await readBody(req);
      sendJson(res, 200, await publish(body.courseId || await resolveCourseId(url), body.message));
      return;
    }

    sendJson(res, 404, { error: "Unknown API endpoint." });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`PoligonSoft course editor: http://127.0.0.1:${port}`);
});
