const TITLE = "Tycoons Investments | Find your property in Egypt with AI";
const DESCRIPTION = "Search developer-direct properties in Egypt with AI and voice. Compare locations, prices and payment plans, and find the home that fits.";
module.exports = function englishHome(shell) {
  return shell
    .replace('<html lang="ar" dir="rtl">','<html lang="en" dir="ltr">')
    .replace(/<title>[\s\S]*?<\/title>/,`<title>${TITLE}</title>`)
    .replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*("\s*\/?>)/g,`$1${DESCRIPTION}$2`)
    .replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*("\s*\/?>)/g,`$1${TITLE}$2`)
    .replace(/(<link rel="canonical" href=")[^"]+/, '$1https://tycoons-inv.com/en/')
    .replace(/(<meta property="og:url" content=")[^"]+/, '$1https://tycoons-inv.com/en/')
    .replace('content="ar_EG"','content="en_GB"')
    .replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(full,json)=>JSON.parse(json)["@type"]==="FAQPage"?"":full)
    .replace(/<div id="root">[\s\S]*?<\/main>\s*<\/div>/,`<div id="root"><main><section><h1>Tell us what you have in mind. Find the property that fits.</h1><p>${DESCRIPTION}</p><img src="/images/hero.webp" width="1767" height="1080" alt="A luxury villa on the North Coast" style="max-width:100%;height:auto"/><nav><a href="/en/directory/">Project directory</a> · <a href="/en/areas/new-cairo">New Cairo</a> · <a href="/en/areas/north-coast">North Coast</a> · <a href="/">العربية</a></nav><p>Prices and availability need confirmation before purchase. Estimated returns are scenarios, not guarantees.</p></section></main></div>`);
};
