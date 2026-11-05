function text(value,max=30000){return typeof value==="string"?value.trim().slice(0,max):"";}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function safeHref(value){const href=text(value,1000);if(!href||/[\\\u0000-\u001f\u007f]/.test(href))return"";let decoded;try{decoded=decodeURIComponent(href);}catch{return"";}if(/[\\\u0000-\u001f\u007f]/.test(decoded)||/^\/\//.test(decoded))return"";try{const url=new URL(href,"https://tycoons-inv.com");if(/^\/(?!\/)/.test(href)&&url.origin==="https://tycoons-inv.com")return href;if(/^https:\/\//i.test(href)&&url.protocol==="https:"&&/^(www\.)?tycoons-inv\.com$/i.test(url.hostname))return href;/* standing rule: no external sites anywhere; other domains render as plain text */}catch{}return"";}
function segmentText(value,max=5000){return typeof value==="string"?value.slice(0,max):"";}
function segments(value){if(typeof value==="string")return value.trim()?[{text:segmentText(value)}]:[];if(!Array.isArray(value))return[];return value.slice(0,100).flatMap((item)=>{const row=object(item);const label=segmentText(row.text);if(!label.trim())return[];const href=safeHref(row.href);return[{text:label,...(href?{href}:{})}];});}
function blocks(value){if(!Array.isArray(value))return[];return value.slice(0,100).flatMap((item)=>{const row=object(item);if(row.type==="paragraph"){const content=segments(row.content);return content.length?[{type:"paragraph",content}]:[];}if(row.type==="subheading"){const value=text(row.text,300);return value?[{type:"subheading",text:value}]:[];}if(row.type==="ordered_list"){const items=Array.isArray(row.items)?row.items.slice(0,30).map(segments).filter((entry)=>entry.length):[];return items.length?[{type:"ordered_list",items}]:[];}return[];});}
function sections(value){if(!Array.isArray(value))return[];return value.slice(0,50).flatMap((item)=>{const row=object(item);const heading=text(row.heading,300);const rich=blocks(row.blocks);if(rich.length)return[{key:text(row.key,100),heading,blocks:rich}];const paragraphs=Array.isArray(row.paragraphs)?row.paragraphs.map((entry)=>text(entry,10000)).filter(Boolean):[];return heading&&paragraphs.length?[{key:text(row.key,100),heading,blocks:paragraphs.map((paragraph)=>({type:"paragraph",content:[{text:paragraph}]}))}]:[];});}
function faqs(value){if(!Array.isArray(value))return[];return value.slice(0,30).flatMap((item)=>{const row=object(item);const question=text(row.question,500);const answer=text(row.answer,3000);return question&&answer?[{question,answer}]:[];});}
// Reviewed project guides kept in the repo (content/project-articles.source.json, Nov 2026) win over
// the database copy for the same project and language; projects not in the file use the database.
let repoArticles={};try{repoArticles=object(require("../../content/project-articles.source.json").projects);}catch{repoArticles={};}
function localizedProjectContent(project,lang,{written=false}={}){const targeting=object(project?.targeting);const repo=object(object(repoArticles[String(project?.slug||"").trim()])[lang]);const stored=object(object(targeting.localized_content)[lang]);const fromArticle=written?{}:object(object(targeting._published_guide)[lang]);const locale=Object.keys(repo).length?repo:Object.keys(stored).length?stored:fromArticle;if(!Object.keys(locale).length)return null;return{seo_title:text(locale.seo_title,180),seo_description:text(locale.seo_description,500),h1:text(locale.h1,240),article_sections:sections(locale.article_sections),faq:faqs(locale.faq)};}
function renderSegments(value,{escapeHtml,replaceTokens=(entry)=>entry}){return value.map((segment)=>{const label=escapeHtml(replaceTokens(segment.text));if(!segment.href)return label;const href=escapeHtml(segment.href);const external=/^https:\/\//i.test(segment.href);return`<a href="${href}"${external?' rel="noopener noreferrer"':""}>${label}</a>`;}).join("");}
function renderSections(value,helpers){return value.map((section)=>`<section>${section.heading?`<h2>${helpers.escapeHtml(helpers.replaceTokens(section.heading))}</h2>`:""}${section.blocks.map((block)=>{if(block.type==="subheading")return`<h3>${helpers.escapeHtml(helpers.replaceTokens(block.text))}</h3>`;if(block.type==="ordered_list")return`<ol>${block.items.map((item)=>`<li>${renderSegments(item,helpers)}</li>`).join("")}</ol>`;return`<p>${renderSegments(block.content,helpers)}</p>`;}).join("")}</section>`).join("");}

// A project with no listed units may still be indexed when it carries a full, original
// guide (enough words and real FAQs), so Google never sees a thin "no units" page.
const MIN_INDEXABLE_WORDS=500,MIN_INDEXABLE_FAQ=4;
function contentWordCount(content){if(!content)return 0;const parts=[];for(const section of content.article_sections){parts.push(section.heading);for(const block of section.blocks){if(block.type==="subheading")parts.push(block.text);else if(block.type==="ordered_list")block.items.forEach((item)=>item.forEach((seg)=>parts.push(seg.text)));else block.content.forEach((seg)=>parts.push(seg.text));}}return parts.join(" ").split(/\s+/).filter(Boolean).length;}
function hasIndexableContent(project,lang,options){const content=localizedProjectContent(project,lang,options);return Boolean(content)&&content.faq.length>=MIN_INDEXABLE_FAQ&&contentWordCount(content)>=MIN_INDEXABLE_WORDS;}
// A guide written into the repo file or the project's stored content (not one built from a published
// article). Such a project links its articles instead of embedding them, so they keep their own URL.
function hasOwnWrittenGuide(project,lang){return hasIndexableContent(project,lang,{written:true});}

// ---------- published project guides (Nov 2026) ----------
// The admin writing tool ("اكتب المقال") writes a project guide with a fixed section order. Once it is
// published, the project page shows it as its own guide (title, meta, H1, sections, FAQ), exactly like
// the repo guides, instead of embedding it as a second article. Older articles keep the old behaviour.
const GUIDE_MARKERS={ar:[/^##\s+المطور:/m,/^##\s+عيوب\s.+نقط لازم تعرفها قبل الشراء/m,/^##\s+قبل ما تحجز/m],en:[/^##\s+Developer:/m,/^##\s+Drawbacks of\s/m,/^##\s+Before you book/m]};
function isProjectGuideArticle(article){const lang=article?.language==="en"?"en":"ar";const body=text(article?.body_markdown);return Boolean(article?.project_id)&&(!article.target_type||article.target_type==="project")&&GUIDE_MARKERS[lang].every((re)=>re.test(body));}
function inlineSegments(line){const out=[];const re=/\[([^\]]+)\]\(([^)\s]+)\)/g;let last=0;let match;const push=(value)=>{const clean=value.replace(/\*\*|__|`/g,"");if(clean)out.push({text:clean});};while((match=re.exec(line))){push(line.slice(last,match.index));const href=safeHref(match[2]);const label=match[1].replace(/\*\*|__|`/g,"");if(href&&href.startsWith("/"))out.push({text:label,href});else out.push({text:label});last=re.lastIndex;}push(line.slice(last));return out;}
const PRICE_SENTENCE={ar:" وأسعار الوحدات المتاحة عندنا بتبدأ من {{min_price}} جنيه.",en:" Prices of the units we have available start from EGP {{min_price}}."};
function guideFromArticle(article,{hasUnits=false}={}){const lang=article?.language==="en"?"en":"ar";const sectionsOut=[];let current={key:"overview",heading:"",blocks:[]};let list=null;let paragraph=[];const flushParagraph=()=>{if(paragraph.length){const content=inlineSegments(paragraph.join(" "));if(content.length)current.blocks.push({type:"paragraph",content});}paragraph=[];};const flushList=()=>{if(list&&list.length)current.blocks.push({type:"ordered_list",items:list});list=null;};
  for(const raw of text(article?.body_markdown).split(/\r?\n/)){const line=raw.trim();if(!line){flushParagraph();flushList();continue;}
    const h2=/^##\s+(.+)$/.exec(line);const h3=/^###\s+(.+)$/.exec(line);const item=/^(?:[-*]|\d+[.)])\s+(.+)$/.exec(line);
    if(h2&&!h3){flushParagraph();flushList();if(current.heading||current.blocks.length)sectionsOut.push(current);current={key:`s${sectionsOut.length+1}`,heading:h2[1].replace(/\*\*/g,"").trim(),blocks:[]};continue;}
    if(h3){flushParagraph();flushList();current.blocks.push({type:"subheading",text:h3[1].replace(/\*\*/g,"").trim()});continue;}
    if(item){flushParagraph();(list||(list=[])).push(inlineSegments(item[1]));continue;}
    flushList();paragraph.push(line);}
  flushParagraph();flushList();if(current.heading||current.blocks.length)sectionsOut.push(current);
  // The starting price, filled from live inventory like the repo guides ("{{min_price}}"); only when
  // the project has units, so a project without units never reads "from 0".
  const first=sectionsOut[0]&&!sectionsOut[0].heading?sectionsOut[0].blocks.find((block)=>block.type==="paragraph"):null;if(hasUnits&&first)first.content.push({text:PRICE_SENTENCE[lang]});
  const faq=(Array.isArray(article?.faq)?article.faq:[]).map((row)=>({question:text(row?.question,500),answer:text(row?.answer,3000)})).filter((row)=>row.question&&row.answer);
  return{h1:text(article?.title,240),seo_title:text(article?.meta_title,180),seo_description:text(article?.meta_description,500),article_sections:sectionsOut,faq,article_slug:text(article?.slug,200)};}
// Puts the newest published guide of each project (per language) on the project row, where
// localizedProjectContent finds it after the repo file and the stored content.
function attachPublishedGuides(projects,articles,projectIdsWithUnits){const newest=new Map();for(const article of Array.isArray(articles)?articles:[]){if(!isProjectGuideArticle(article))continue;const key=`${article.project_id}:${article.language==="en"?"en":"ar"}`;const current=newest.get(key);if(!current||String(article.published_at||"")>String(current.published_at||""))newest.set(key,article);}
  for(const project of Array.isArray(projects)?projects:[]){if(!project?.id)continue;const guide={};for(const lang of["ar","en"]){const article=newest.get(`${project.id}:${lang}`);if(article)guide[lang]=guideFromArticle(article,{hasUnits:Boolean(projectIdsWithUnits&&projectIdsWithUnits.has(String(project.id)))});}if(Object.keys(guide).length)project.targeting={...object(project.targeting),_published_guide:guide};}
  return projects;}
// The slug of the published article a project's guide was built from ("" when none).
function guideArticleSlug(project,lang){return text(object(object(object(project?.targeting)._published_guide)[lang]).article_slug,200);}

module.exports={localizedProjectContent,renderSections,safeHref,hasIndexableContent,hasOwnWrittenGuide,contentWordCount,isProjectGuideArticle,guideFromArticle,attachPublishedGuides,guideArticleSlug};
