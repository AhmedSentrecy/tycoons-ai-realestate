"use strict";
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn, execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const root = path.resolve("dist");
const port = 4179;
if (process.argv.includes("--serve")) {
  http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
      const requested = path.resolve(root, `.${pathname}`);
      if (requested !== root && !requested.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const candidates = [requested, requested + ".html", path.join(requested, "index.html"), path.join(root, "index.html")];
      const file = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
      const types = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".webp":"image/webp", ".png":"image/png", ".svg":"image/svg+xml"};
      res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(500).end(); }
  }).listen(port, "127.0.0.1");
} else {
  (async () => {
    const chrome = ["google-chrome", "chromium", "chromium-browser"].find((name) => {
      try { execFileSync("which", [name], {stdio:"ignore"}); return true; } catch { return false; }
    });
    if (!chrome) throw new Error("Chrome is required for this explicit rendered-browser check");
    const server = spawn(process.execPath, [__filename, "--serve"], {stdio:"ignore"});
    const evidence = path.resolve("browser-check-evidence");
    fs.mkdirSync(evidence, {recursive:true});
    const results = [];
    try {
      for (let i = 0; i < 30; i += 1) {
        try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break; } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      function readPage(route, label, width = 390) {
        const html = execFileSync(chrome, ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", `--window-size=${width},844`, "--virtual-time-budget=15000", "--dump-dom", `http://127.0.0.1:${port}${route}`], {encoding:"utf8", timeout:60000, maxBuffer:15000000, stdio:["ignore","pipe","pipe"]});
        fs.writeFileSync(path.join(evidence,`${label}.html`),html);
        return html;
      }
      const home = readPage('/en/', 'home-en-mobile');
      assert.match(home, /<html[^>]*lang="en"/);
      assert.match(home, /id="property-comparison-guides"/,'English React content must mount, not only its static fallback');
      results.push({page:'/en/', test:'React mounted and English buyer navigation visible', passed:true});
      const projectFile = path.join(root, 'projects/hyde-park-new-cairo-new-launch.html');
      if (fs.existsSync(projectFile)) {
        const project = readPage('/projects/hyde-park-new-cairo-new-launch', 'project-mobile');
        assert.match(project,/data-render-source="react"/,'project graph must have been updated by the actual React component');
        assert.equal((project.match(/id="tycoons-page-schema"/g)||[]).length,1);
        const matches=[...project.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
        const nodes=matches.flatMap((m)=>{const graph=JSON.parse(m[1]);return graph['@graph']||[graph];});
        assert.ok(nodes.some((n)=>n['@type']==='RealEstateListing'));
        assert.doesNotMatch(JSON.stringify(nodes), /"@type":"Product"/);
        results.push({page:'/projects/hyde-park-new-cairo-new-launch',test:'one real React page graph, inventory facts preserved',passed:true});
      } else throw new Error('Expected Hyde Park project was not built');
      const war = readPage('/sales-war-room/app', 'war-room-smoke', 1280);
      assert.match(war, /<input|<button/,'War Room should render its unauthenticated entry UI');
      results.push({page:'/sales-war-room/app',test:'unauthenticated app entry renders',passed:true});
      const search = readPage('/search?q=city%20edge','search-smoke');
      assert.match(search, /<input/,'property search UI should render');
      results.push({page:'/search',test:'search UI renders; search logic covered by test:search',passed:true});
      fs.writeFileSync(path.join(evidence,'summary.json'),JSON.stringify(results,null,2));
      console.log('Browser smoke checks passed:',JSON.stringify(results));
    } finally { server.kill('SIGTERM'); }
  })().catch((error)=>{ console.error(error); process.exitCode=1; });
}
