import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { renderProjectStatic } = require("./lib/data-pages.cjs");

const shell = "<html><head><title></title></head><body><div id=\"root\"></div></body></html>";
const mk = (id: string, name: string, slug: string, minPrice: number, location = "New Cairo") => ({ id, name, slug, developer: "Dev", location, minPrice, image: "" });
const links = [
  mk("p1", "Hydepark New Cairo", "hydepark-new-cairo--hydepark-developments", 9400000),
  mk("p2", "Valory Mall", "valory-mall--menassat-developments", 9641758),
  mk("p3", "Yellow Lane", "yellow-lane--urbnlanes-development", 9704686),
  mk("p4", "Cattleya", "cattleya--arabco-developments", 9026200),
  mk("p5", "5A", "5a--waterway", 364650000),
  mk("p6", "Caesar", "caesar--sodic", 39217000, "North Coast"),
];
const project = { id: "p1", name: "Hydepark New Cairo", slug: "hydepark-new-cairo--hydepark-developments", developer: "Dev", location: "New Cairo", image_url: "https://x/1.jpg", gallery_urls: "https://x/2.jpg,https://x/3.jpg", faq: [] };
const units = [{ id: "11111111-1111-4111-8111-111111111111", project_id: "p1", project_name: "Hydepark New Cairo", developer: "Dev", location: "New Cairo", unit_type: "Apartment", bedrooms_text: "3 bedrooms", area_sqm: 160, starting_price: 9400000, availability_status: "available" }];
const otherProjects = links.filter((item) => item.id !== "p1").map(({ name, developer, location, minPrice }) => ({ name, developer, location, minPrice }));
const html: string = renderProjectStatic(shell, project, units, [], { otherProjects, projectLinks: links });

let checks = 0;
const check = (condition: boolean, message: string) => { assert.ok(condition, message); checks += 1; };
check(/<a href="\/projects\/valory-mall--menassat-developments"[^>]*>Valory Mall<\/a>/.test(html), "FAQ names a nearby project as a link");
check(!/<a href="\/projects\/hydepark-new-cairo--hydepark-developments"[^>]*>Hydepark New Cairo<\/a>/.test(html.split("مشاريع قريبة")[0].split("<article>")[1] || ""), "the page never links its own name");
check(/مشاريع قريبة من Hydepark New Cairo/.test(html), "nearby projects section");
check(!/caesar--sodic" class="block/.test(html), "nearby is the same area only");
check(!/5a--waterway" class="block/.test(html), "nearby prefers a similar budget");
check((html.match(/loading="lazy" decoding="async"/g) || []).length === 2, "gallery shows the photos after the hero");
check(/alt="Hydepark New Cairo في [^"]+ — صورة 2 من 3"/.test(html), "gallery photos have descriptive alt text");
// Article text links other projects once, never inside a heading.
const withArticle = { ...project, article_sections: [
  { heading: "Hydepark New Cairo و Cattleya", paragraphs: ["قارن مع Cattleya قبل ما تقرر.", "Cattleya تاني مرة."] },
] };
const articleHtml: string = renderProjectStatic(shell, withArticle, units, [], { otherProjects, projectLinks: links });
const articlePart = articleHtml.split("مشاريع قريبة")[0].split("أسئلة شائعة")[0];
check(/مع <a href="\/projects\/cattleya--arabco-developments"[^>]*>Cattleya<\/a> قبل/.test(articlePart), "article text links a mentioned project");
check((articlePart.match(/href="\/projects\/cattleya--arabco-developments"/g) || []).length === 1, "only the first mention in the article is linked");
check(!/<h2[^>]*>[^<]*<a /.test(articlePart), "headings are never linked");

// Merged listings redirect to the main page.
const { projectAliases } = require("./lib/project-aliases.cjs");
const aliases = projectAliases([{ id: "a", slug: "hydepark-new-cairo--hydepark-developments", name: "Hyde Park New Cairo", developer: "Hyde Park Developments" }], new Map());
check(aliases.get("hyde-park-new-cairo-new-launch") === "hydepark-new-cairo--hydepark-developments", "the New Launch page points to the main Hyde Park New Cairo page");
console.log(`Project link and gallery tests passed (${checks} checks).`);
