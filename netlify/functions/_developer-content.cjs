"use strict";
const batch=require("../../content/developer-articles.source.json");
const{safeHref}=require("./_localized-project-content.cjs");
function decode(v){return String(v||"").replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ");}
function segments(html){const out=[];let cursor=0,m;const re=/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;while((m=re.exec(html))){const before=decode(html.slice(cursor,m.index));if(before)out.push({text:before});const text=decode(m[2]),href=safeHref(m[1]);if(text)out.push(href?{text,href}:{text});cursor=re.lastIndex;}const after=decode(html.slice(cursor));if(after)out.push({text:after});return out;}
function blocks(html){const out=[];let m;const re=/<(p|h3|ol|ul)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;while((m=re.exec(html))){if(m[1]==="p")out.push({type:"paragraph",content:segments(m[2])});else if(m[1]==="h3")out.push({type:"subheading",text:decode(m[2]).trim()});else{const items=[];let item;const li=/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/gi;while((item=li.exec(m[2])))items.push(segments(item[1]));out.push({type:"ordered_list",items});}}return out.filter((b)=>b.type!=="paragraph"||b.content.length);}
function sections(html){const out=[];let m,index=0;const re=/<section(?:\s[^>]*)?>([\s\S]*?)<\/section>/gi;while((m=re.exec(html))){const h=m[1].match(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/i);out.push({key:`section-${index++}`,heading:h?decode(h[1]).trim():"",blocks:blocks(m[1].replace(/<h2(?:\s[^>]*)?>[\s\S]*?<\/h2>/i,""))});}return out;}
const map=new Map(batch.articles.map((a)=>[`${String(a.entity).toLowerCase()}|${a.locale}`,{h1:a.h1,seo_title:a.meta_title,seo_description:a.meta_description,sections:sections(a.body_html)}]));
function developerContent(slug,lang){return map.get(`${slug}|${lang}`)||null;}
module.exports={developerContent};
