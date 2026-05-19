const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const publicDir = path.join(__dirname, "public");
const courseDir = path.join(repoRoot, "data", "poligonsoft-free-course");
const courseFile = path.join(courseDir, "course.json");
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

function safeCoursePath(relativePath) {
  const normalized = String(relativePath || "").replace(/\\/g, "/");

  if (!normalized || normalized.startsWith("/") || /^[a-z]+:\/\//i.test(normalized) || normalized.includes("..")) {
    throw new Error(`Unsafe course file path: ${relativePath}`);
  }

  const fullPath = path.resolve(courseDir, normalized);
  const allowedRoot = courseDir + path.sep;

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

function slugify(value, fallback) {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
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

async function loadEditorData() {
  const course = await readJson(courseFile);
  const lessons = {};

  for (const contentUrl of collectStepUrls(course)) {
    try {
      lessons[contentUrl] = await readJson(safeCoursePath(contentUrl));
    } catch {
      lessons[contentUrl] = defaultLessonContent();
    }
  }

  return { course, lessons };
}

async function saveEditorData(payload) {
  const lessons = payload.lessons && typeof payload.lessons === "object" ? payload.lessons : {};
  const course = normalizeCourse(payload.course, lessons);
  const written = [];

  await writeJson(courseFile, course);
  written.push(path.relative(repoRoot, courseFile));

  for (const contentUrl of collectStepUrls(course)) {
    const content = lessons[contentUrl] || defaultLessonContent();
    const file = safeCoursePath(contentUrl);

    await writeJson(file, {
      videoUrl: content.videoUrl || "",
      summary: content.summary || "",
      actions: Array.isArray(content.actions) ? content.actions : [],
      expected: content.expected || ""
    });

    written.push(path.relative(repoRoot, file));
  }

  return written;
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

async function publish(message) {
  const status = await runGit(["status", "--short"]);

  if (!status.stdout.trim()) {
    return {
      committed: false,
      output: "No local changes to publish."
    };
  }

  await runGit(["add", "data/poligonsoft-free-course"]);

  const afterAdd = await runGit(["diff", "--cached", "--name-only"]);

  if (!afterAdd.stdout.trim()) {
    return {
      committed: false,
      output: "No course data changes to publish."
    };
  }

  const commit = await runGit(["commit", "-m", message || "Update course content"]);
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

async function handleApi(req, res, pathname) {
  try {
    if (req.method === "GET" && pathname === "/api/course") {
      sendJson(res, 200, await loadEditorData());
      return;
    }

    if (req.method === "POST" && pathname === "/api/course") {
      const written = await saveEditorData(await readBody(req));
      sendJson(res, 200, { ok: true, written });
      return;
    }

    if (req.method === "GET" && pathname === "/api/git-status") {
      const status = await runGit(["status", "--short"]);
      sendJson(res, 200, { status: status.stdout });
      return;
    }

    if (req.method === "POST" && pathname === "/api/publish") {
      const body = await readBody(req);
      sendJson(res, 200, await publish(body.message));
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
    handleApi(req, res, url.pathname);
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`PoligonSoft course editor: http://127.0.0.1:${port}`);
});
