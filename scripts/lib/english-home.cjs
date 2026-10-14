"use strict";

const TITLE = "Tycoons Investments | Find your property in Egypt with AI";
const DESCRIPTION = "Search developer-direct properties in Egypt with AI and voice. Compare locations, prices and payment plans, and find the home that fits.";
const ENGLISH_CONTENT = `<div id="root"><main>
  <section aria-labelledby="home-title">
    <h1 id="home-title">Tell us what you have in mind. Find the property that fits.</h1>
    <p>${DESCRIPTION} Tycoons helps homebuyers compare Egyptian residential projects by location, developer, unit type, size, finishing, delivery and payment plan instead of relying on an advertised starting price alone.</p>
    <img src="/images/hero.webp" width="1767" height="1080" alt="Explore residential properties in Egypt" style="max-width:100%;height:auto"/>
    <h2>Explore properties by location</h2>
    <p>Start with the neighbourhood or city where you want to live or invest. Each area guide links to relevant projects and developers, along with considerations that matter when comparing homes.</p>
    <nav aria-label="Property areas">
      <a href="/en/areas/new-cairo">New Cairo projects</a> ·
      <a href="/en/areas/mostakbal-city">Mostakbal City projects and map</a> ·
      <a href="/en/areas/north-coast">North Coast chalets and villas</a> ·
      <a href="/en/areas/sheikh-zayed">Sheikh Zayed projects</a> ·
      <a href="/en/areas/ain-sokhna">Ain Sokhna projects</a> ·
      <a href="/en/areas/new-capital">New Capital projects</a>
    </nav>
    <h2>Explore projects by developer</h2>
    <p>Check the available projects from a specific developer and compare the published unit details. Developer reputation is one factor, but delivery history, contract terms and the individual project also matter.</p>
    <nav aria-label="Popular property developers">
      <a href="/en/developers/mountain-view">Mountain View</a> ·
      <a href="/en/developers/sodic">SODIC</a> ·
      <a href="/en/developers/marasem">Marasem</a> ·
      <a href="/en/developers/orascom">Orascom</a> ·
      <a href="/en/directory/">Full project directory</a>
    </nav>
    <h2>Compare the real cost, not just the headline price</h2>
    <p>When comparing two properties, look at total price, down payment, instalment schedule, unit area, finishing condition and delivery timing together. A lower entry payment does not necessarily mean a lower overall purchase cost. Ask whether maintenance fees, club fees and other charges are included in the quoted figures.</p>
    <p><a href="/en/guides/new-cairo-property-prices/">New Cairo property price guide</a> explains how to compare similar units fairly. You can also review our <a href="/methodology">data and calculation methodology</a>.</p>
    <h2>How we handle prices and availability</h2>
    <p>Published prices and availability can change. Before making a decision, request confirmation of the specific unit, its current price, payment schedule, delivery conditions and contractual details. Any rental yield or resale scenario is an estimate, never a guaranteed return.</p>
    <p>Read <a href="/about">about Tycoons</a>, our <a href="/corrections">corrections policy</a>, or <a href="/contact">contact our team</a>. <a href="/" lang="ar" hreflang="ar-EG">تصفح الموقع بالعربية</a>.</p>
  </section>
</main></div>`;

module.exports = function englishHome(shell) {
  return shell
    .replace('<html lang="ar" dir="rtl">', '<html lang="en" dir="ltr">')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${TITLE}</title>`)
    .replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*("\s*\/?>)/g, `$1${DESCRIPTION}$2`)
    .replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*("\s*\/?>)/g, `$1${TITLE}$2`)
    .replace(/(<link rel="canonical" href=")[^"]+/, '$1https://tycoons-inv.com/en/')
    .replace(/(<meta property="og:url" content=")[^"]+/, '$1https://tycoons-inv.com/en/')
    .replace('content="ar_EG"', 'content="en_GB"')
    .replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, json) => JSON.parse(json)["@type"] === "FAQPage" ? "" : full)
    .replace(/<div id="root">[\s\S]*?<\/main>\s*<\/div>/, ENGLISH_CONTENT);
};
