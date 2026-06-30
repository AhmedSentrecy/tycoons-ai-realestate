const SUPABASE_URL = window.TYCOONS_SUPABASE_URL;
const SUPABASE_KEY = window.TYCOONS_SUPABASE_KEY;
const API_BASE = SUPABASE_URL + "/rest/v1";
const TYCOONS_WHATSAPP_NUMBER = "201200704344";
const WHATSAPP_TRACKING_TABLE = "whatsapp_clicks";
const WHATSAPP_UTM_SOURCE = "website";
const WHATSAPP_UTM_MEDIUM = "whatsapp";
const WHATSAPP_UTM_CAMPAIGN = "tycoons_lead";

const TYCOONS_LANG_KEY = "tycoons_site_language";
let siteLanguage = localStorage.getItem(TYCOONS_LANG_KEY) || "ar";

const TYCOONS_I18N = {
  en: {
    navSearch: "Search", navVoice: "Voice", navProjects: "Projects", navContact: "Contact", navWhatsapp: "WhatsApp",
    eyebrowHero: "Voice-first property search", heroTitle: "Tell the AI what you’re looking for, by voice or text.",
    heroLead: "Start with a normal request like “عايز شاليه في الساحل” or type it below. The assistant searches live Tycoons inventory and shows matching units instantly.",
    searchLabel: "Search by voice or text", talkAssistant: "Talk to the assistant", searchPlaceholder: "Example: كنت بدور على شاليه في الساحل أو iVilla in New Cairo",
    searchButton: "Search", aiSearch: "AI Search", searching: "Searching...",
    voiceTitle: "Talk to Sarah",
    voiceCta: "Speak with Sarah from Tycoons Investments. When Sarah searches the inventory, matching cards will appear below automatically.",
    startVoice: "Start Voice Agent", holdToTalk: "Hold to Talk", stopSession: "Stop Session", voiceOff: "Voice agent is off.",
    confirmNumber: "Confirm WhatsApp Number", confirmText: "The voice agent heard this number. Check it before saving.", detectedPhone: "Detected WhatsApp number", confirmSave: "Confirm & Save Lead", cancel: "Cancel",
    resultsEyebrow: "Search results", recommendedUnits: "Recommended units", resultsText: "Cards show the essentials first: image, project, unit type, price, area, delivery, and media links.", adminPanel: "Admin panel",
    projectsEyebrow: "Projects", browseCatalogue: "Browse the live catalogue", projectsText: "Project cards are loaded from Supabase and can inherit media from available unit rows.",
    seoEyebrow: "SEO-ready property guide", seoTitle: "Find real estate options in Egypt with AI-assisted search", seoText: "Tycoons Investments helps buyers compare developer inventory by location, unit type, budget, delivery date and payment plan, then continue directly on WhatsApp with the sales team.",
    seoCard1Title: "What can I search for?", seoCard1Text: "You can search for apartments, villas, iVilla units, chalets, New Cairo homes, North Coast vacation homes, Ain Sokhna units and selected developer projects.", seoCard1Link: "Ask on WhatsApp",
    seoCard2Title: "How does the AI search work?", seoCard2Text: "Type or dictate what you need. The website searches live inventory and returns matching cards with project, price, area, delivery, finishing and available media links.", seoCard2Link: "Try the search box",
    seoCard3Title: "Why WhatsApp-first?", seoCard3Text: "Real estate availability changes quickly. WhatsApp makes it easier to confirm the latest availability, payment details, delivery and recommended alternatives.", seoCard3Link: "Send WhatsApp request",
    faqEyebrow: "FAQs", faqTitle: "Questions buyers usually ask", faq1Q: "Can I contact Tycoons directly on WhatsApp?", faq1A: "Yes. Use any WhatsApp button on the website and your request will open directly in WhatsApp with a prepared message.", faq2Q: "Can I search in Arabic?", faq2A: "Yes. The search supports Arabic and English terms, including common real estate phrases like آي فيلا، شاليه، التجمع، الساحل and apartments.", faq3Q: "Are prices always final?", faq3A: "Prices and availability can change according to the developer, inventory release and payment plan. Confirm the latest details with the sales team on WhatsApp.", faq4Q: "What areas are available?", faq4A: "The website is prepared for New Cairo, North Coast, Ain Sokhna and developer-specific inventory pages.",
    leadEyebrow: "Lead capture", leadTitle: "Request suitable options", leadText: "Leave your details or send your request instantly on WhatsApp with the property context you need.", sendWa: "Send WhatsApp Request", submitLead: "Submit Lead", leadName: "Name", leadPhone: "Phone / WhatsApp", leadInterest: "Interested project or area", leadBudget: "Budget, example: 12000000",
    project: "Project", availableUnit: "Available unit", startingPrice: "Starting price", area: "Area", delivery: "Delivery", finishing: "Finishing", brochure: "Brochure", askWa: "Ask on WhatsApp", priceOnRequest: "Price on request", from: "From", noMatches: "No matching items found.", loadingSupabase: "Loading live data from Supabase...", connectedPrefix: "Connected to Supabase. Loaded ", unitsAnd: " units and ", projectsLoaded: " projects.", languageChanged: "Website language changed to English."
  },
  ar: {
    navSearch: "البحث", navVoice: "الصوت", navProjects: "المشاريع", navContact: "تواصل", navWhatsapp: "واتساب",
    eyebrowHero: "بحث عقاري بالصوت والكتابة", heroTitle: "قول للـ AI بتدور على إيه بالصوت أو بالكتابة.",
    heroLead: "ابدأ بطلب طبيعي زي “عايز شاليه في الساحل” أو اكتب طلبك تحت. المساعد هيبحث في مخزون Tycoons ويعرض الوحدات المناسبة فورًا.",
    searchLabel: "ابحث بالصوت أو بالكتابة", talkAssistant: "اتكلم مع المساعد", searchPlaceholder: "مثال: عايز شاليه في الساحل أو iVilla in New Cairo",
    searchButton: "بحث", aiSearch: "بحث AI", searching: "بيبحث...",
    voiceTitle: "اتكلم مع Sarah",
    voiceCta: "اتكلم بصوتك مع Sarah من Tycoons Investments. لما Sarah تبحث في المخزون، النتائج هتظهر في الكروت تحت تلقائيًا.",
    startVoice: "ابدأ المساعد الصوتي", holdToTalk: "اضغط للتحدث", stopSession: "إيقاف الجلسة", voiceOff: "المساعد الصوتي متوقف.",
    confirmNumber: "تأكيد رقم واتساب", confirmText: "المساعد سمع الرقم ده. راجعه قبل الحفظ.", detectedPhone: "رقم واتساب المكتشف", confirmSave: "تأكيد وحفظ الليد", cancel: "إلغاء",
    resultsEyebrow: "نتائج البحث", recommendedUnits: "وحدات مقترحة", resultsText: "الكروت بتعرض الأهم أولًا: الصورة، المشروع، نوع الوحدة، السعر، المساحة، التسليم، والروابط.", adminPanel: "لوحة الإدارة",
    projectsEyebrow: "المشاريع", browseCatalogue: "تصفح الكتالوج المتاح", projectsText: "كروت المشاريع بتتحمل من Supabase وممكن تاخد الصور من الوحدات المتاحة.",
    seoEyebrow: "دليل عقاري جاهز للبحث", seoTitle: "اعثر على اختيارات عقارية في مصر بمساعدة AI", seoText: "Tycoons Investments بتساعدك تقارن مخزون المطورين حسب المنطقة، نوع الوحدة، الميزانية، التسليم وخطة الدفع، وبعدها تكمل مباشرة على واتساب مع فريق المبيعات.",
    seoCard1Title: "أقدر أبحث عن إيه؟", seoCard1Text: "تقدر تبحث عن شقق، فيلات، iVilla، شاليهات، وحدات في New Cairo، North Coast، Ain Sokhna، ومشاريع مختارة من المطورين.", seoCard1Link: "اسأل على واتساب",
    seoCard2Title: "بحث الـ AI بيشتغل إزاي؟", seoCard2Text: "اكتب أو قول اللي محتاجه. الموقع بيدور في المخزون المتاح ويعرض كروت مطابقة فيها المشروع، السعر، المساحة، التسليم، التشطيب والروابط.", seoCard2Link: "جرّب البحث",
    seoCard3Title: "ليه واتساب أولًا؟", seoCard3Text: "توفر الوحدات والأسعار بيتغير بسرعة. واتساب بيسهل تأكيد أحدث Availability، تفاصيل الدفع، التسليم والبدائل المناسبة.", seoCard3Link: "ابعت طلب واتساب",
    faqEyebrow: "أسئلة شائعة", faqTitle: "أسئلة العملاء المعتادة", faq1Q: "هل أقدر أتواصل مع Tycoons مباشرة على واتساب؟", faq1A: "أيوه. استخدم أي زر واتساب في الموقع، والطلب هيفتح مباشرة في واتساب برسالة جاهزة.", faq2Q: "هل أقدر أبحث بالعربي؟", faq2A: "أيوه. البحث بيدعم عربي وإنجليزي، ومن ضمنه كلمات زي آي فيلا، شاليه، التجمع، الساحل، وشقق.", faq3Q: "هل الأسعار نهائية؟", faq3A: "الأسعار والتوفر ممكن يتغيروا حسب المطور، طرح الوحدات وخطة الدفع. أكد أحدث التفاصيل مع فريق المبيعات على واتساب.", faq4Q: "إيه المناطق المتاحة؟", faq4A: "الموقع مجهز لـ New Cairo، North Coast، Ain Sokhna، وصفحات خاصة بالمشاريع والمطورين.",
    leadEyebrow: "تسجيل طلب", leadTitle: "اطلب اختيارات مناسبة", leadText: "سيب بياناتك أو ابعت طلبك على واتساب فورًا مع تفاصيل العقار اللي محتاجه.", sendWa: "ابعت طلب واتساب", submitLead: "إرسال البيانات", leadName: "الاسم", leadPhone: "رقم الموبايل / واتساب", leadInterest: "المشروع أو المنطقة المهتم بيها", leadBudget: "الميزانية، مثال: 12000000",
    project: "مشروع", availableUnit: "وحدة متاحة", startingPrice: "السعر يبدأ من", area: "المساحة", delivery: "التسليم", finishing: "التشطيب", brochure: "البروشور", askWa: "اسأل على واتساب", priceOnRequest: "السعر عند الطلب", from: "من", noMatches: "مفيش نتائج مطابقة.", loadingSupabase: "جاري تحميل البيانات من Supabase...", connectedPrefix: "متصل بـ Supabase. تم تحميل ", unitsAnd: " وحدة و ", projectsLoaded: " مشروع.", languageChanged: "تم تغيير لغة الموقع للعربي."
  }
};

function tr(key) {
  return (TYCOONS_I18N[siteLanguage] && TYCOONS_I18N[siteLanguage][key]) || TYCOONS_I18N.en[key] || key;
}

function ui(arText, enText) {
  return siteLanguage === "ar" ? arText : enText;
}

function detectLanguageCommand(text) {
  const q = String(text || "").toLowerCase().trim();
  if (!q) return null;
  if (/خلي|حوّل|حول|غير|غيّر|switch|change|english|انجليزي|إنجليزي|انجلش|english/i.test(q) && /(english|انجليزي|إنجليزي|انجلش)/i.test(q)) return "en";
  if (/خلي|حوّل|حول|غير|غيّر|switch|change|arabic|عربي|العربي/i.test(q) && /(arabic|عربي|العربي)/i.test(q)) return "ar";
  return null;
}

function setSiteLanguage(lang, rerenderCards = true) {
  siteLanguage = lang === "ar" ? "ar" : "en";
  localStorage.setItem(TYCOONS_LANG_KEY, siteLanguage);
  applySiteLanguage();
  if (rerenderCards && units.length && results && projectGrid) {
    render(units.slice(0, 6), results);
    render(projects, projectGrid, "project");
  }
}

function setText(selector, key) {
  const el = document.querySelector(selector);
  if (el) el.textContent = tr(key);
}

function applySiteLanguage() {
  const html = document.documentElement;
  html.lang = siteLanguage === "ar" ? "ar-EG" : "en";
  html.dir = siteLanguage === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-lang-switch]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.langSwitch === siteLanguage);
  });

  const navLinks = document.querySelectorAll(".main-nav > a:not(.header-whatsapp)");
  if (navLinks[0]) navLinks[0].textContent = tr("navSearch");
  if (navLinks[1]) navLinks[1].textContent = tr("navVoice");
  if (navLinks[2]) navLinks[2].textContent = tr("navProjects");
  if (navLinks[3]) navLinks[3].textContent = tr("navContact");
  setText(".header-whatsapp", "navWhatsapp");

  setText(".voice-first-hero .eyebrow", "eyebrowHero");
  setText(".voice-first-hero h1", "heroTitle");
  setText(".voice-first-hero .lede", "heroLead");
  setText(".search-label-row span", "searchLabel");
  setText(".search-label-row a", "talkAssistant");
  if (searchInput) searchInput.placeholder = tr("searchPlaceholder");
  if (searchBtn && !isSearching) searchBtn.textContent = tr("searchButton");
  const elVoiceTitle = document.querySelector("[data-el-voice-title]");
  if (elVoiceTitle) elVoiceTitle.textContent = tr("voiceTitle");
  const cta = document.querySelector(".hero-voice-cta p");
  if (cta) cta.textContent = tr("voiceCta");
  if (startVoiceAgentBtn) startVoiceAgentBtn.textContent = tr("startVoice");
  if (holdToTalkBtn && !holdToTalkBtn.classList.contains("talking")) holdToTalkBtn.textContent = tr("holdToTalk");
  if (sarahStartCallBtn) sarahStartCallBtn.textContent = tr("startVoice");
  if (sarahHoldToTalkBtn && !sarahHoldToTalkBtn.classList.contains("talking")) sarahHoldToTalkBtn.textContent = tr("holdToTalk");
  if (sarahStopCallBtn) sarahStopCallBtn.textContent = ui("إيقاف", "Stop");
  if (stopVoiceAgentBtn) stopVoiceAgentBtn.textContent = tr("stopSession");
  if (voiceStatus && voiceStatus.textContent === "Voice agent is off.") voiceStatus.textContent = tr("voiceOff");
  setText("#phoneConfirmBox .eyebrow", "confirmNumber");
  setText("#phoneConfirmBox p", "confirmText");
  if (detectedPhoneInput) detectedPhoneInput.placeholder = tr("detectedPhone");
  if (confirmPhoneBtn) confirmPhoneBtn.textContent = tr("confirmSave");
  if (cancelPhoneBtn) cancelPhoneBtn.textContent = tr("cancel");

  const sections = document.querySelectorAll(".section-head");
  if (sections[0]) { sections[0].querySelector(".eyebrow").textContent = tr("resultsEyebrow"); sections[0].querySelector("h2").textContent = tr("recommendedUnits"); sections[0].querySelector("p").textContent = tr("resultsText"); }
  setText(".admin-link", "adminPanel");
  if (sections[1]) { sections[1].querySelector(".eyebrow").textContent = tr("projectsEyebrow"); sections[1].querySelector("h2").textContent = tr("browseCatalogue"); sections[1].querySelector("p").textContent = tr("projectsText"); }
  if (sections[2]) { sections[2].querySelector(".eyebrow").textContent = tr("seoEyebrow"); sections[2].querySelector("h2").textContent = tr("seoTitle"); sections[2].querySelector("p").textContent = tr("seoText"); }
  if (sections[3]) { sections[3].querySelector(".eyebrow").textContent = tr("faqEyebrow"); sections[3].querySelector("h2").textContent = tr("faqTitle"); }

  const aioCards = document.querySelectorAll(".aio-answer-card");
  if (aioCards[0]) { aioCards[0].querySelector("h3").textContent = tr("seoCard1Title"); aioCards[0].querySelector("p").textContent = tr("seoCard1Text"); aioCards[0].querySelector("a").textContent = tr("seoCard1Link"); }
  if (aioCards[1]) { aioCards[1].querySelector("h3").textContent = tr("seoCard2Title"); aioCards[1].querySelector("p").textContent = tr("seoCard2Text"); aioCards[1].querySelector("a").textContent = tr("seoCard2Link"); }
  if (aioCards[2]) { aioCards[2].querySelector("h3").textContent = tr("seoCard3Title"); aioCards[2].querySelector("p").textContent = tr("seoCard3Text"); aioCards[2].querySelector("a").textContent = tr("seoCard3Link"); }

  const faqItems = document.querySelectorAll("#faq .faq-list details");
  if (faqItems[0]) { faqItems[0].querySelector("summary").textContent = tr("faq1Q"); faqItems[0].querySelector("p").textContent = tr("faq1A"); }
  if (faqItems[1]) { faqItems[1].querySelector("summary").textContent = tr("faq2Q"); faqItems[1].querySelector("p").textContent = tr("faq2A"); }
  if (faqItems[2]) { faqItems[2].querySelector("summary").textContent = tr("faq3Q"); faqItems[2].querySelector("p").textContent = tr("faq3A"); }
  if (faqItems[3]) { faqItems[3].querySelector("summary").textContent = tr("faq4Q"); faqItems[3].querySelector("p").textContent = tr("faq4A"); }

  setText(".lead-copy .eyebrow", "leadEyebrow");
  setText(".lead-copy h2", "leadTitle");
  setText(".lead-copy p", "leadText");
  setText(".lead-whatsapp-actions .btn-whatsapp", "sendWa");
  const leadBtn = document.querySelector("#leadForm button");
  if (leadBtn) leadBtn.textContent = tr("submitLead");
  const leadNameInput = document.querySelector('#leadForm input[name="name"]');
  const leadPhoneInput = document.querySelector('#leadForm input[name="phone"]');
  const leadInterestInput = document.querySelector('#leadForm input[name="interest"]');
  const leadBudgetInput = document.querySelector('#leadForm input[name="budget"]');
  if (leadNameInput) leadNameInput.placeholder = tr("leadName");
  if (leadPhoneInput) leadPhoneInput.placeholder = tr("leadPhone");
  if (leadInterestInput) leadInterestInput.placeholder = tr("leadInterest");
  if (leadBudgetInput) leadBudgetInput.placeholder = tr("leadBudget");
}

document.addEventListener("click", function (event) {
  const button = event.target.closest("[data-lang-switch]");
  if (!button) return;
  setSiteLanguage(button.dataset.langSwitch);
});


let units = [];
let projects = [];
let isSearching = false;
let realtimePc = null;
let realtimeDc = null;
let realtimeStream = null;
let remoteAudio = null;
let micTrack = null;
let pendingVoiceLead = null;
const handledFunctionCalls = new Set();

const results = document.getElementById("results");
const projectGrid = document.getElementById("projectGrid");
const searchInput = document.getElementById("searchInput");
const statusBox = document.getElementById("status");
const leadForm = document.getElementById("leadForm");
const leadStatus = document.getElementById("leadStatus");
const voiceBtn = document.getElementById("voiceBtn");
const searchBtn = document.getElementById("searchBtn");
const startVoiceAgentBtn = document.getElementById("startVoiceAgentBtn");
const holdToTalkBtn = document.getElementById("holdToTalkBtn");
const stopVoiceAgentBtn = document.getElementById("stopVoiceAgentBtn");
const voiceStatus = document.getElementById("voiceStatus");
const phoneConfirmBox = document.getElementById("phoneConfirmBox");
const detectedPhoneInput = document.getElementById("detectedPhoneInput");
const confirmPhoneBtn = document.getElementById("confirmPhoneBtn");
const cancelPhoneBtn = document.getElementById("cancelPhoneBtn");
const elevenlabsToolStatus = document.getElementById("elevenlabsToolStatus");
const sarahStartCallBtn = document.getElementById("sarahStartCallBtn");
const sarahHoldToTalkBtn = document.getElementById("sarahHoldToTalkBtn");
const sarahStopCallBtn = document.getElementById("sarahStopCallBtn");
const sarahControlStatus = document.getElementById("sarahControlStatus");
const sarahSdkState = document.getElementById("sarahSdkState");
const sarahSdkHint = document.getElementById("sarahSdkHint");
const sarahSdkOrb = document.getElementById("sarahSdkOrb");
const ELEVENLABS_AGENT_ID = "agent_2801kw5n6m9tewabcncnykc5w362";
const ELEVENLABS_CLIENT_SDK_URLS = Array.isArray(window.TYCOONS_ELEVENLABS_CLIENT_SDK_URLS)
  ? window.TYCOONS_ELEVENLABS_CLIENT_SDK_URLS
  : [
      window.TYCOONS_ELEVENLABS_CLIENT_SDK_URL || "/assets/elevenlabs-client.js",
      "https://esm.sh/@elevenlabs/client?bundle",
      "https://esm.sh/@elevenlabs/client@latest?bundle",
      "https://cdn.jsdelivr.net/npm/@elevenlabs/client/+esm"
    ];
let sarahConversation = null;
let sarahConversationSdk = null;
let sarahSessionState = "idle";
let sarahMicHeld = false;
let sarahIsStoppingManually = false;
let sarahLastConnectedAt = 0;
let sarahHoldPointerId = null;
let sarahActiveHoldEventType = "";
let sarahAutoListenTimer = null;
let sarahTeardownGuardUntil = 0;
const SARAH_TEARDOWN_COOLDOWN_MS = 700;
let sarahStartRequestId = 0;

function clearSarahAutoListenTimer() {
  if (sarahAutoListenTimer) {
    clearTimeout(sarahAutoListenTimer);
    sarahAutoListenTimer = null;
  }
}

async function setSarahMicMuted(muted) {
  if (!sarahConversation?.setMicMuted) return;
  try {
    await sarahConversation.setMicMuted(muted);
  } catch (err) {
    console.warn("Could not update Sarah mic mute state", err);
  }
}

function setElevenLabsStatus(message, className = "") {
  if (!elevenlabsToolStatus) return;
  elevenlabsToolStatus.className = "elevenlabs-tool-status" + (className ? " " + className : "");
  elevenlabsToolStatus.textContent = message;
}

function setSarahControlStatus(message, className = "") {
  if (!sarahControlStatus) return;
  sarahControlStatus.className = "sarah-control-status" + (className ? " " + className : "");
  sarahControlStatus.textContent = message;
}

function setSarahSdkPanel(stateText, hintText = "", className = "") {
  if (sarahSdkState) sarahSdkState.textContent = stateText;
  if (sarahSdkHint) sarahSdkHint.textContent = hintText;
  if (sarahSdkOrb) sarahSdkOrb.className = "sarah-sdk-orb" + (className ? " " + className : "");
}

function syncSarahButtons(state = sarahSessionState) {
  const active = state === "connected" || state === "listening" || state === "speaking";
  const connecting = state === "connecting";
  if (sarahStartCallBtn) sarahStartCallBtn.disabled = active || connecting;
  // Keep Hold to Talk enabled while idle so one press can start Sarah and open the mic.
  // Disable it only during the short connection handshake.
  if (sarahHoldToTalkBtn) sarahHoldToTalkBtn.disabled = connecting;
  if (sarahStopCallBtn) sarahStopCallBtn.disabled = !active && !connecting;
}

async function loadElevenLabsSdk() {
  if (sarahConversationSdk) return sarahConversationSdk;
  let lastError = null;
  const urls = ELEVENLABS_CLIENT_SDK_URLS.map(url => String(url || "").trim()).filter(Boolean);
  for (const url of urls) {
    try {
      const mod = await import(url);
      const Conversation = mod.Conversation || mod.default?.Conversation;
      if (Conversation && typeof Conversation.startSession === "function") {
        sarahConversationSdk = Conversation;
        return sarahConversationSdk;
      }
      lastError = new Error("Conversation.startSession was not found.");
    } catch (error) {
      lastError = error;
      console.warn("ElevenLabs SDK source failed", url, error);
    }
  }
  throw new Error(ui(
    "تعذر تحميل ElevenLabs SDK. اعمل Hard Refresh وجرب تاني، ولو استمرت المشكلة جرّب Chrome.",
    "ElevenLabs SDK could not load. Hard refresh and try again, or try Chrome."
  ) + (lastError?.message ? " " + lastError.message : ""));
}

async function requestSarahMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(ui("المتصفح مش بيدعم تشغيل الميكروفون.", "This browser does not support microphone access."));
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(track => track.stop());
}

function setSarahConnectedUi() {
  sarahSessionState = sarahMicHeld ? "listening" : "connected";
  syncSarahButtons(sarahSessionState);
  const statusText = sarahMicHeld
    ? ui("Sarah بتسمعك دلوقتي. اتكلم وسيب الزرار لما تخلص.", "Sarah is listening now. Speak and release when you finish.")
    : ui("Sarah متصلة. اضغط مطوّلًا على زر الميكروفون واتكلم.", "Sarah is connected. Hold the microphone button while speaking.");
  setElevenLabsStatus(statusText, "success");
  setSarahControlStatus(ui("اضغط مطوّلًا على اضغط للتحدث. لما Sarah تبحث، الكروت هتظهر تحت.", "Hold the Hold to Talk button. When Sarah searches, cards will appear below."), "success");
  setSarahSdkPanel(
    sarahMicHeld ? ui("Sarah بتسمعك", "Sarah listening") : ui("Sarah متصلة", "Sarah connected"),
    sarahMicHeld ? ui("اتكلم دلوقتي.", "Speak now.") : ui("اضغط مطوّلًا للتحدث.", "Hold to talk."),
    sarahMicHeld ? "listening" : "connected"
  );
}

function setSarahIdleUi(message) {
  clearSarahAutoListenTimer();
  sarahSessionState = "idle";
  sarahMicHeld = false;
  sarahHoldPointerId = null;
  sarahActiveHoldEventType = "";
  sarahConversation = null;
  sarahTeardownGuardUntil = Date.now() + SARAH_TEARDOWN_COOLDOWN_MS;
  if (sarahHoldToTalkBtn) {
    sarahHoldToTalkBtn.classList.remove("talking", "is-active");
    sarahHoldToTalkBtn.textContent = tr("holdToTalk") || "Hold to Talk";
  }
  syncSarahButtons("idle");
  setSarahSdkPanel(ui("Sarah جاهزة", "Sarah ready"), ui("ابدأ الجلسة، وبعدها اضغط مطوّلًا للتحدث.", "Start the session, then hold to talk."));
  setSarahControlStatus(message || ui("اضغط ابدأ المساعد الصوتي.", "Press Start Voice Agent."));
}

async function startSarahSdkCall(options = {}) {
  const { listenImmediately = false } = options || {};
  if (sarahConversation || sarahSessionState === "connecting") {
    if (listenImmediately) {
      sarahMicHeld = true;
      await setSarahMicMuted(false);
      setSarahConnectedUi();
    }
    return;
  }

  const remainingCooldown = sarahTeardownGuardUntil - Date.now();
  if (remainingCooldown > 0) {
    setSarahControlStatus(ui("لحظة، بنقفل الجلسة القديمة الأول...", "One moment, finishing cleanup from the last session..."));
    await new Promise(resolve => setTimeout(resolve, remainingCooldown));
    if (sarahConversation || sarahSessionState === "connecting") return;
  }

  const requestId = ++sarahStartRequestId;
  let disconnectedDuringStart = false;
  let connectedBySdk = false;

  try {
    sarahIsStoppingManually = false;
    sarahSessionState = "connecting";
    sarahMicHeld = !!listenImmediately;
    syncSarahButtons("connecting");
    setElevenLabsStatus(ui("جاري تشغيل Sarah وطلب إذن الميكروفون...", "Starting Sarah and requesting microphone permission..."));
    setSarahControlStatus(ui("لو المتصفح طلب إذن الميكروفون اختار Allow.", "If the browser asks for microphone access, choose Allow."));
    setSarahSdkPanel(ui("جاري الاتصال", "Connecting"), ui("استنى ثواني قليلة.", "Please wait a few seconds."), "connecting");

    await requestSarahMicrophonePermission();
    if (requestId !== sarahStartRequestId) return;

    const Conversation = await loadElevenLabsSdk();
    if (requestId !== sarahStartRequestId) return;

    const conversation = await Conversation.startSession({
      agentId: ELEVENLABS_AGENT_ID,
      connectionType: "webrtc",
      clientTools: {
        search_properties: elevenlabsSearchProperties,
        save_lead: elevenlabsSaveLead,
        show_results_on_page: async (args = {}) => elevenlabsSearchProperties(args)
      },
      onConnect: async () => {
        if (requestId !== sarahStartRequestId) return;
        connectedBySdk = true;
        sarahLastConnectedAt = Date.now();
        if (sarahMicHeld) {
          await setSarahMicMuted(false);
        }
        setSarahConnectedUi();
      },
      onDisconnect: (event) => {
        if (requestId !== sarahStartRequestId) return;
        disconnectedDuringStart = true;
        console.warn("ElevenLabs Sarah disconnected", event || "");
        const fastDisconnect = !sarahIsStoppingManually && sarahLastConnectedAt && (Date.now() - sarahLastConnectedAt < 8000);
        setSarahIdleUi(fastDisconnect
          ? ui("Sarah فصلت بسرعة. جرّب Preview جوه ElevenLabs، ولو اشتغل ابعتلي Console error من الموقع.", "Sarah disconnected quickly. Test Preview inside ElevenLabs; if it works, send the site Console error.")
          : ui("تم إنهاء جلسة Sarah.", "Sarah session ended.")
        );
        sarahIsStoppingManually = false;
      },
      onError: (error) => {
        if (requestId !== sarahStartRequestId) return;
        console.error("ElevenLabs Sarah error", error);
        setElevenLabsStatus(ui("حصل خطأ في تشغيل Sarah. راجع إعدادات ElevenLabs والميكروفون.", "Sarah could not start. Check ElevenLabs and microphone settings."), "warning");
        setSarahControlStatus((error && error.message) ? error.message : ui("تعذر تشغيل Sarah.", "Could not start Sarah."), "warning");
      },
      onStatusChange: (status) => {
        // Do not move UI state from generic status changes. Some browsers emit
        // transitional disconnected/connected statuses during WebRTC startup.
        console.info("ElevenLabs Sarah status", status);
      },
      onModeChange: (mode) => {
        const value = String(mode?.mode || mode?.status || mode || "").toLowerCase();
        if (!sarahConversation) return;
        if (value.includes("speaking")) {
          sarahSessionState = "speaking";
          syncSarahButtons("speaking");
          setSarahSdkPanel(ui("Sarah بترد", "Sarah speaking"), ui("استنى الرد أو اضغط مطوّلًا لو عايز تقاطعها.", "Wait for the reply, or hold to interrupt."), "speaking");
        } else if (value.includes("listening")) {
          sarahSessionState = sarahMicHeld ? "listening" : "connected";
          syncSarahButtons(sarahSessionState);
          setSarahSdkPanel(sarahMicHeld ? ui("Sarah بتسمعك", "Sarah listening") : ui("Sarah متصلة", "Sarah connected"), sarahMicHeld ? ui("اتكلم دلوقتي.", "Speak now.") : ui("اضغط مطوّلًا للتحدث.", "Hold to talk."), sarahMicHeld ? "listening" : "connected");
        }
      }
    });

    if (requestId !== sarahStartRequestId || disconnectedDuringStart) return;
    sarahConversation = conversation;

    if (sarahMicHeld) {
      await setSarahMicMuted(false);
    }

    // Only onConnect should mark the session as connected. If startSession returns
    // before onConnect, keep the UI in a safe connecting state instead of showing
    // a false connected message.
    if (!connectedBySdk) {
      sarahSessionState = "connecting";
      syncSarahButtons("connecting");
      setSarahControlStatus(ui("Sarah بتتصل... استنى لحد ما زر Hold يتفعل.", "Sarah is connecting... wait until Hold becomes active."));
      setSarahSdkPanel(ui("جاري الاتصال", "Connecting"), ui("استنى تأكيد الاتصال.", "Waiting for connection confirmation."), "connecting");
    }
  } catch (err) {
    if (requestId !== sarahStartRequestId) return;
    console.error("Could not start ElevenLabs Sarah", err);
    const safeMessage = ui(
      "تعذر تشغيل Sarah. اعمل Hard Refresh واسمح للمايك، ولو استمرت المشكلة جرّب Chrome.",
      "Could not start Sarah. Hard refresh, allow microphone access, and try Chrome if it continues."
    );
    setElevenLabsStatus(safeMessage, "warning");
    setSarahIdleUi(safeMessage);
  }
}

async function stopSarahSdkCall() {
  sarahStartRequestId += 1;
  sarahIsStoppingManually = true;
  clearSarahAutoListenTimer();
  try {
    if (sarahConversation?.endSession) await sarahConversation.endSession();
  } catch (err) {
    console.warn("Could not end Sarah session", err);
  }
  setSarahIdleUi(ui("تم إيقاف مكالمة Sarah.", "Sarah call stopped."));
  setElevenLabsStatus(ui("تم إيقاف مكالمة Sarah.", "Sarah call stopped."));
}

async function beginSarahHoldUi(event) {
  if (event?.cancelable) event.preventDefault();
  if (sarahHoldPointerId !== null && event?.pointerId && event.pointerId !== sarahHoldPointerId) return;
  if (event?.pointerId) sarahHoldPointerId = event.pointerId;
  sarahActiveHoldEventType = event?.type || "";

  sarahMicHeld = true;
  if (sarahHoldToTalkBtn?.setPointerCapture && event?.pointerId) {
    try { sarahHoldToTalkBtn.setPointerCapture(event.pointerId); } catch (_) {}
  }
  if (!sarahConversation) {
    await startSarahSdkCall({ listenImmediately: true });
  }
  if (!sarahConversation || !sarahHoldToTalkBtn || sarahHoldToTalkBtn.disabled) return;
  try {
    await setSarahMicMuted(false);
    sarahSessionState = "listening";
    syncSarahButtons("listening");
    sarahHoldToTalkBtn.classList.add("talking", "is-active");
    sarahHoldToTalkBtn.textContent = ui("بيسمعك...", "Listening...");
    setSarahControlStatus(ui("اتكلم دلوقتي مع Sarah. سيب الزرار لما تخلص.", "Speak now. Release the button when you finish."), "success");
    setSarahSdkPanel(ui("Sarah بتسمعك", "Sarah listening"), ui("اتكلم دلوقتي.", "Speak now."), "listening");
  } catch (err) {
    setSarahControlStatus(ui("مش قادر أفتح الميكروفون دلوقتي.", "Could not unmute the microphone."), "warning");
  }
}

async function endSarahHoldUi(event) {
  if (event?.cancelable) event.preventDefault();
  if (event?.pointerId && sarahHoldPointerId !== null && event.pointerId !== sarahHoldPointerId) return;
  if (sarahHoldToTalkBtn?.releasePointerCapture && event?.pointerId) {
    try { sarahHoldToTalkBtn.releasePointerCapture(event.pointerId); } catch (_) {}
  }
  sarahHoldPointerId = null;
  if (!sarahConversation || !sarahHoldToTalkBtn) {
    sarahMicHeld = false;
    return;
  }
  await setSarahMicMuted(true);
  sarahMicHeld = false;
  sarahSessionState = "connected";
  syncSarahButtons("connected");
  sarahHoldToTalkBtn.classList.remove("talking", "is-active");
  sarahHoldToTalkBtn.textContent = tr("holdToTalk") || "Hold to Talk";
  setSarahControlStatus(ui("الميكروفون اتقفل. Sarah هترد أو تقدر تضغط تاني للتحدث.", "Microphone muted. Sarah will reply, or hold again to speak."));
  setSarahSdkPanel(ui("Sarah متصلة", "Sarah connected"), ui("اضغط مطوّلًا للتحدث.", "Hold to talk."), "connected");
}

function cancelSarahHoldUi(event) {
  endSarahHoldUi(event);
}

if (sarahStartCallBtn) sarahStartCallBtn.addEventListener("click", () => startSarahSdkCall({ listenImmediately: false }));
if (sarahStopCallBtn) sarahStopCallBtn.addEventListener("click", stopSarahSdkCall);
if (sarahHoldToTalkBtn) {
  sarahHoldToTalkBtn.addEventListener("pointerdown", beginSarahHoldUi);
  sarahHoldToTalkBtn.addEventListener("pointerup", endSarahHoldUi);
  sarahHoldToTalkBtn.addEventListener("pointercancel", cancelSarahHoldUi);
}

if (document.getElementById("year")) document.getElementById("year").textContent = new Date().getFullYear();
applySiteLanguage();

function headers(extra = {}) {
  return { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", ...extra };
}

async function getRows(table, query = "") {
  const res = await fetch(API_BASE + "/" + table + query, { headers: headers() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function insertRow(table, row) {
  const res = await fetch(API_BASE + "/" + table, {
    method: "POST",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify(row)
  });
  if (!res.ok) throw new Error(await res.text());
}

function safe(value, fallback = "Not specified") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   PROJECT PAGE LINK BUILDER
   ------------------------------------------------------------
   Mirrors the exact same slugify logic used in
   scripts/generate-pages.js so the link always points to the
   real, already-built static page (/projects/<slug>.html).
   ============================================================ */
function slugify(str) {
  if (!str) return "unit";
  return String(str)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function projectPageUrl(projectName, location) {
  const slug = slugify(`${projectName || ""}-${location || ""}`);
  return `/projects/${slug}.html`;
}


function whatsappUrl(message, source = "website", extra = {}) {
  const trackingId = extra.tracking_id || ("wa_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8));
  const contextLines = [
    "",
    "Source: " + source,
    "Page: " + (extra.page_path || currentCleanPageUrl()),
    "Tracking ID: " + trackingId
  ];

  const trackedMessage = String(message || "Hello Tycoons Investments, I want suitable property options.")
    + contextLines.join("\n");

  return "https://wa.me/" + TYCOONS_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(trackedMessage);
}


function currentCleanPageUrl() {
  return String(window.location.href || "https://tycoons-inv.de/").split("#")[0];
}

function whatsappLine(label, value) {
  const clean = safe(value, "");
  return clean ? `${label}: ${clean}` : "";
}

function whatsappMoney(value) {
  const num = Number(value || 0);
  if (!num) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(num)) + " EGP";
}

function itemDisplayUrl(item) {
  return item.image_url || item.brochure_url || currentCleanPageUrl();
}

function unitWhatsappMessage(item) {
  return [
    "Hello Tycoons Investments,",
    "I am interested in this available unit:",
    "",
    whatsappLine("Project", item.project_name),
    whatsappLine("Developer", item.developer),
    whatsappLine("Location", item.location),
    whatsappLine("Unit type", item.unit_type),
    whatsappLine("Bedrooms", item.bedrooms_text),
    whatsappLine("Area", areaText(item.area_sqm)),
    whatsappLine("Starting price", whatsappMoney(item.starting_price)),
    whatsappLine("Delivery", item.delivery_text),
    whatsappLine("Finishing", item.finishing),
    "",
    whatsappLine("URL", itemDisplayUrl(item)),
    item.brochure_url && item.brochure_url !== itemDisplayUrl(item) ? whatsappLine("Brochure", item.brochure_url) : "",
    "",
    "Please send me the latest availability and payment plan."
  ].filter(Boolean).join("\n");
}

function projectWhatsappMessage(item) {
  return [
    "Hello Tycoons Investments,",
    "I am interested in this project:",
    "",
    whatsappLine("Project", item.name),
    whatsappLine("Developer", item.developer),
    whatsappLine("Location", item.location),
    whatsappLine("Starting price", whatsappMoney(item.min_price)),
    whatsappLine("Status", item.status),
    "",
    whatsappLine("URL", itemDisplayUrl(item)),
    item.brochure_url && item.brochure_url !== itemDisplayUrl(item) ? whatsappLine("Brochure", item.brochure_url) : "",
    "",
    "Please send me available options and details."
  ].filter(Boolean).join("\n");
}


function whatsappButton(label, message, source = "card_whatsapp", extra = {}) {
  const attrs = [
    `data-wa-source="${escapeAttr(source)}"`,
    `data-wa-message="${escapeAttr(message)}"`
  ];

  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      attrs.push(`data-wa-${escapeAttr(key)}="${escapeAttr(value)}"`);
    }
  });

  return `<a class="card-whatsapp" href="${whatsappUrl(message, source, extra)}" target="_blank" rel="noopener" ${attrs.join(" ")}>${label}</a>`;
}

function parseGalleryUrls(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(url => String(url || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,]+/)
    .map(url => url.trim())
    .filter(Boolean);
}

function isExternalThumbnail(url) {
  return /drive\.google\.com/i.test(String(url || ""));
}

function findProjectForUnit(unit) {
  return (projects || []).find((p) => normalize(p.name) === normalize(unit.project_name));
}

function mediaUrls(item, type = "unit") {
  const galleryUrls = parseGalleryUrls(item.gallery_urls);
  const fallbackImage = item.image_url && !isExternalThumbnail(item.image_url) ? [item.image_url] : [];

  let combined = [...galleryUrls, ...fallbackImage];

  // Units with no images of their own borrow their project's gallery —
  // since all listings are off-plan, the project's images ARE the unit's
  // images in practice. This means you only need to manage photos once,
  // on the project row in Supabase.
  if (type === "unit" && !combined.length) {
    const project = findProjectForUnit(item);
    if (project) {
      const projGallery = parseGalleryUrls(project.gallery_urls);
      const projImage = project.image_url && !isExternalThumbnail(project.image_url) ? [project.image_url] : [];
      combined = [...projGallery, ...projImage];
    }
  }

  const urls = combined
    .map(url => String(url || "").trim())
    .filter(Boolean);

  return Array.from(new Set(urls));
}

function mediaImage(item, type = "unit") {
  const location = safe(item.location);
  const urls = mediaUrls(item, type);
  if (urls.length > 1) {
    const slides = urls.map((url, index) => {
      return `<img class="carousel-img${index === 0 ? " active" : ""}" src="${escapeAttr(url)}" alt="${escapeAttr(location)} image ${index + 1}" loading="lazy" referrerpolicy="no-referrer">`;
    }).join("");

    const dots = urls.map((_, index) => {
      return `<button class="carousel-dot${index === 0 ? " active" : ""}" type="button" data-carousel-dot="${index}" aria-label="Show image ${index + 1}"></button>`;
    }).join("");

    return `
      <div class="image photo has-img image-carousel" data-carousel-index="0">
        <div class="carousel-track">${slides}</div>
        <button class="carousel-nav carousel-prev" type="button" data-carousel-dir="-1" aria-label="Previous image"></button>
        <button class="carousel-nav carousel-next" type="button" data-carousel-dir="1" aria-label="Next image"></button>
        <div class="carousel-counter">1 / ${urls.length}</div>
        <div class="carousel-dots">${dots}</div>
        <span>${location}</span>
      </div>
    `;
  }

  if (urls.length === 1) {
    return `
      <div class="image photo has-img">
        <img src="${escapeAttr(urls[0])}" alt="${escapeAttr(location)}" loading="lazy" referrerpolicy="no-referrer">
        <span>${location}</span>
      </div>
    `;
  }

  return `<div class="image">${location}</div>`;
}

function mediaLinks(item) {
  const links = [];
  const projectLabel = item.project_name || item.name || "";
  links.push(
    `<button type="button" class="js-ask-brochure" data-project="${escapeAttr(projectLabel)}" data-source="card_brochure_request">${tr("brochure")}</button>`
  );
  if (item.video_url) links.push(`<a href="${escapeAttr(item.video_url)}" target="_blank" rel="noopener">Video</a>`);
  return links.length ? `<div class="card-links">${links.join("")}</div>` : "";
}

function cleanDisplayText(value) {
  return String(value || "")
    .replace(/BeachFrontApt/gi, "Beachfront Apartment")
    .replace(/I-Villa/gi, "iVilla")
    .replace(/IVilla/gi, "iVilla")
    .replace(/\s+/g, " ")
    .trim();
}

function areaText(value) {
  const num = Number(value || 0);
  if (!num) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num) + " sqm";
}

function shortText(value, fallback = "") {
  const text = cleanDisplayText(value);
  return text || fallback;
}

function cardMetric(label, value) {
  const clean = shortText(value, "");
  if (!clean) return "";
  return `<div class="metric"><span>${label}</span><strong>${clean}</strong></div>`;
}

function dedupeUnitsForDisplay(list) {
  const map = new Map();
  (list || []).forEach((item) => {
    const key = [item.project_name || "", item.unit_type || "", item.bedrooms_text || "", item.area_sqm || ""].join("||").toLowerCase();
    const current = map.get(key);
    if (!current || Number(item.starting_price || Infinity) < Number(current.starting_price || Infinity)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
}

function enrichProjectsWithUnitMedia(projectList) {
  return (projectList || []).map((project) => {
    const matchingUnits = (units || []).filter((unit) => normalize(unit.project_name) === normalize(project.name));

    // Build a combined gallery from all matching units if the project
    // itself has no gallery_urls of its own.
    let gallery = project.gallery_urls;
    if (!gallery || (Array.isArray(gallery) && !gallery.length) || (typeof gallery === "string" && !gallery.trim())) {
      const combined = [];
      matchingUnits.forEach((unit) => {
        if (unit.image_url) combined.push(unit.image_url);
        parseGalleryUrls(unit.gallery_urls).forEach((url) => combined.push(url));
      });
      const deduped = Array.from(new Set(combined.map((u) => String(u || "").trim()).filter(Boolean)));
      if (deduped.length) gallery = deduped;
    }

    if (project.image_url && project.brochure_url && project.video_url && gallery) {
      return { ...project, gallery_urls: gallery };
    }

    const matchedUnit = matchingUnits.find((unit) => unit.image_url || unit.brochure_url || unit.video_url);
    if (!matchedUnit) return { ...project, gallery_urls: gallery };

    return {
      ...project,
      image_url: project.image_url || matchedUnit.image_url || null,
      brochure_url: project.brochure_url || matchedUnit.brochure_url || null,
      video_url: project.video_url || matchedUnit.video_url || null,
      gallery_urls: gallery
    };
  });
}

function price(value) {
  const num = Number(value || 0);
  if (!num) return tr("priceOnRequest");
  return tr("from") + " " + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(num)) + " EGP";
}

function card(item, type = "unit") {
  if (type === "project") {
    const tags = [shortText(item.developer, ""), shortText(item.location, ""), shortText(item.status, "")]
      .filter(Boolean).map(value => `<span class="tag">${value}</span>`).join("");

    const projectUrl = projectPageUrl(item.name, item.location);

    return `
      <article class="card project-card">
        ${mediaImage(item, "project")}
        <div class="content">
          <div class="card-kicker">${tr("project")}</div>
          <a class="card-title-link" href="${escapeAttr(projectUrl)}">
            <h3>${safe(item.name)}</h3>
          </a>
          <div class="tags">${tags}</div>
          <div class="price-row"><span>${tr("startingPrice")}</span><strong>${price(item.min_price)}</strong></div>
          ${mediaLinks(item)}
          ${whatsappButton(tr("askWa"), projectWhatsappMessage(item), "project_card", {
            project_name: safe(item.name, ""),
            starting_price: item.min_price || "",
            url: itemDisplayUrl(item)
          })}
        </div>
      </article>
    `;
  }

  const tags = [shortText(item.unit_type, ""), shortText(item.bedrooms_text, "")]
    .filter(Boolean).map(value => `<span class="tag">${value}</span>`).join("");

  const metrics = [
    cardMetric(tr("area"), areaText(item.area_sqm)),
    cardMetric(tr("delivery"), item.delivery_text),
    cardMetric(tr("finishing"), item.finishing)
  ].filter(Boolean).join("");

  const unitProjectUrl = projectPageUrl(item.project_name, item.location);

  return `
    <article class="card unit-card">
      ${mediaImage(item, "unit")}
      <div class="content">
        <div class="card-kicker">${tr("availableUnit")}</div>
        <a class="card-title-link" href="${escapeAttr(unitProjectUrl)}">
          <h3>${safe(item.project_name)}</h3>
        </a>
        <div class="tags">${tags}</div>
        <div class="price-row"><span>${tr("startingPrice")}</span><strong>${price(item.starting_price)}</strong></div>
        <div class="card-metrics">${metrics}</div>
        ${mediaLinks(item)}
        ${whatsappButton(tr("sendWa"), unitWhatsappMessage(item), "unit_card", {
          project_name: safe(item.project_name, ""),
          unit_type: safe(item.unit_type, ""),
          bedrooms_text: safe(item.bedrooms_text, ""),
          starting_price: item.starting_price || "",
          url: itemDisplayUrl(item)
        })}
      </div>
    </article>
  `;
}

function render(list, target, type = "unit") {
  const displayList = type === "unit" ? dedupeUnitsForDisplay(list) : list;
  target.innerHTML = displayList.length ? displayList.map(item => card(item, type)).join("") : `<div class="status">${tr("noMatches")}</div>`;
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/القاهرة الجديدة/g, "new cairo")
    .replace(/التجمع/g, "new cairo")
    .replace(/تجمع/g, "new cairo")
    .replace(/سخنة/g, "ain sokhna")
    .replace(/السخنة/g, "ain sokhna")
    .replace(/جلالة/g, "galala")
    .replace(/شقة/g, "apartment")
    .replace(/شقق/g, "apartment")
    .replace(/فيلا/g, "villa")
    .replace(/اى فيلا/g, "ivilla")
    .replace(/اي فيلا/g, "ivilla")
    .replace(/مقدم/g, "down payment")
    .replace(/تقسيط/g, "installments")
    .replace(/سنين/g, "years")
    .replace(/,/g, "");
}

function localSearch(query) {
  const q = normalize(query);
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = units.map(unit => {
    const haystack = normalize([
      unit.project_name, unit.developer, unit.location, unit.unit_type,
      unit.bedrooms_text, unit.down_payment_text, unit.installments_text,
      unit.delivery_text, unit.description, unit.search_text
    ].filter(Boolean).join(" "));

    let score = 0;
    terms.forEach(term => { if (term.length > 2 && haystack.includes(term)) score += 1; });
    if (q.includes("new cairo") && haystack.includes("new cairo")) score += 5;
    if (q.includes("ain sokhna") && haystack.includes("ain sokhna")) score += 5;
    if (q.includes("apartment") && haystack.includes("apartment")) score += 4;
    if (q.includes("villa") && haystack.includes("villa")) score += 4;
    if (q.includes("ivilla") && haystack.includes("ivilla")) score += 4;
    if (q.includes("garden") && haystack.includes("garden")) score += 3;
    return { ...unit, _score: score };
  }).filter(unit => unit._score > 0);

  scored.sort((a, b) => b._score - a._score || Number(a.starting_price || 0) - Number(b.starting_price || 0));
  return scored.length ? scored.slice(0, 6) : units.slice(0, 6);
}

function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(String(text || ""));
}

let preferredVoiceAr = null;
let preferredVoiceEn = null;

function pickVoices() {
  if (!("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return;
  preferredVoiceAr = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("ar")) || null;
  preferredVoiceEn = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("en")) || null;
}

if ("speechSynthesis" in window) {
  pickVoices();
  window.speechSynthesis.addEventListener("voiceschanged", pickVoices);
}

function trimSpokenAnswer(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= 220) return clean;
  return clean.slice(0, 220).replace(/\s+\S*$/, "") + ".";
}

function speak(text, sourceTextForLanguage) {
  if (!("speechSynthesis" in window) || !text) return;

  try { window.speechSynthesis.cancel(); } catch (_) {}

  const arabic = isArabicText(sourceTextForLanguage || text);
  const utterance = new SpeechSynthesisUtterance(trimSpokenAnswer(text));
  utterance.lang = arabic ? "ar-EG" : "en-US";
  utterance.rate = 1;

  const chosenVoice = arabic ? preferredVoiceAr : preferredVoiceEn;
  if (chosenVoice) utterance.voice = chosenVoice;

  window.speechSynthesis.speak(utterance);
}

function setSearchLoading(isLoading) {
  isSearching = isLoading;
  searchBtn.disabled = isLoading;
  searchBtn.textContent = isLoading ? tr("searching") : tr("aiSearch");
}

async function runAISearch(queryOverride = null) {
  const query = (queryOverride || searchInput.value).trim();

  if (!query) {
    statusBox.className = "status";
    statusBox.textContent = ui("اكتب طلبك أو استخدم المساعد الصوتي.", "Please type what you are looking for, or use Start Voice Agent for real voice.");
    return null;
  }

  const requestedLanguage = detectLanguageCommand(query);
  if (requestedLanguage) {
    setSiteLanguage(requestedLanguage);
    statusBox.className = "status success";
    statusBox.textContent = tr("languageChanged");
    return { mode: "language-switch", language: requestedLanguage };
  }

  if (isSearching) return null;

  setSearchLoading(true);
  statusBox.className = "status";
  statusBox.textContent = ui("الـ AI بيبحث في المخزون المتاح...", "AI is searching your live inventory...");

  try {
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    render(data.results || [], results);

    statusBox.className = "status success";
    statusBox.textContent = data.answer || ui("تم البحث بنجاح.", "AI search completed.");
    return data;
  } catch (err) {
    console.warn("AI search failed, using local fallback:", err);
    const matches = localSearch(query);
    render(matches, results);
    const best = matches[0];
    const answer = best
      ? ui("البحث الذكي مش جاهز دلوقتي، فاستخدمت البحث الأساسي. أقرب نتيجة: " + best.project_name + "، " + price(best.starting_price) + ".", "AI function is not ready yet, so I used basic search. Closest match: " + best.project_name + ", " + price(best.starting_price) + ".")
      : ui("البحث الذكي مش جاهز دلوقتي، ومفيش نتيجة مطابقة.", "AI function is not ready yet, and I could not find a matching unit.");

    statusBox.className = "status error";
    statusBox.textContent = answer;
    return { answer, results: matches, mode: "local-fallback" };
  } finally {
    setSearchLoading(false);
  }
}

searchBtn.addEventListener("click", async () => {
  await runAISearch();
});

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "ar-EG";
  recognition.interimResults = false;
  recognition.continuous = false;

  voiceBtn.textContent = ui("إملاء صوتي", "Dictate Search");

  voiceBtn.addEventListener("click", () => {
    if (isSearching) return;
    window.speechSynthesis?.cancel?.();
    voiceBtn.disabled = true;
    voiceBtn.textContent = ui("بيسمع...", "Listening...");
    statusBox.className = "status";
    statusBox.textContent = ui("بيسمع البحث الصوتي المجاني. اتكلم دلوقتي.", "Listening — free voice search. Speak now.");

    try {
      recognition.start();
    } catch (err) {
      voiceBtn.disabled = false;
      voiceBtn.textContent = ui("إملاء صوتي", "Dictate Search");
      statusBox.className = "status error";
      statusBox.textContent = ui("الميكروفون مشتغلش. اسمح بصلاحية الميكروفون وجرب تاني.", "Microphone could not start. Try again or allow microphone permission.");
    }
  });

  recognition.addEventListener("result", async (event) => {
    const transcript = event.results[0][0].transcript;
    searchInput.value = transcript;
    statusBox.className = "status";
    statusBox.textContent = ui("سمعت: " + transcript + " — بيدور دلوقتي...", "Heard: " + transcript + " — searching now...");

    const data = await runAISearch(transcript);

    if (data && data.answer) {
      speak(data.answer, transcript);
    }
  });

  recognition.addEventListener("end", () => {
    voiceBtn.disabled = false;
    voiceBtn.textContent = ui("إملاء صوتي", "Dictate Search");
  });

  recognition.addEventListener("error", (event) => {
    voiceBtn.disabled = false;
    voiceBtn.textContent = ui("إملاء صوتي", "Dictate Search");
    statusBox.className = "status error";
    statusBox.textContent = ui("حصل خطأ في الصوت: " + event.error + ". اكتب البحث بدل الصوت.", "Voice input error: " + event.error + ". You can type your search instead.");
  });
} else {
  voiceBtn.addEventListener("click", () => {
    statusBox.className = "status error";
    statusBox.textContent = ui("المتصفح ده مش بيدعم الإدخال الصوتي. جرّب Chrome.", "Voice input is not supported in this browser. Try Chrome on desktop.");
  });
}

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  leadStatus.className = "status";
  leadStatus.classList.remove("hidden");

  const data = Object.fromEntries(new FormData(leadForm).entries());
  const row = {
    name: data.name || null,
    phone: data.phone,
    message: data.interest || null,
    project_interest: data.interest || null,
    budget: data.budget ? Number(String(data.budget).replace(/,/g, "")) : null,
    source: "website"
  };

  try {
    await insertRow("leads", row);
    leadStatus.className = "status success";
    leadStatus.textContent = ui("تم حفظ البيانات بنجاح.", "Lead saved successfully in Supabase.");
    leadForm.reset();
  } catch (err) {
    console.error(err);
    leadStatus.className = "status error";
    leadStatus.textContent = ui("البيانات متحفظتش. راجع إعدادات الحفظ.", "Lead was not saved. Check the leads insert policy.");
  }
});

function setVoiceStatus(text, className = "status") {
  voiceStatus.className = className;
  voiceStatus.textContent = text;
}

function setMicEnabled(enabled) {
  if (!micTrack) return;

  micTrack.enabled = enabled;

  if (enabled) {
    holdToTalkBtn.classList.add("talking");
    holdToTalkBtn.textContent = ui("بيسمع...", "Listening...");
    setVoiceStatus(ui("بيسمع. سيب الزرار لما تخلص كلام.", "Listening. Release Push to Talk when you finish speaking."), "status success");
  } else {
    holdToTalkBtn.classList.remove("talking");
    holdToTalkBtn.textContent = tr("holdToTalk");
    if (realtimeDc && realtimeDc.readyState === "open") {
      setVoiceStatus(ui("الميكروفون مقفول. مستني رد المساعد أو اضغط للتحدث تاني.", "Mic muted. Waiting for AI response or hold to talk again."));
    }
  }
}

function stopRealtimeAgent(message = null) {
  message = message || tr("voiceOff");
  handledFunctionCalls.clear();

  if (micTrack) {
    micTrack.enabled = false;
    micTrack = null;
  }

  if (realtimeDc) {
    try { realtimeDc.close(); } catch (_) {}
    realtimeDc = null;
  }

  if (realtimePc) {
    try { realtimePc.close(); } catch (_) {}
    realtimePc = null;
  }

  if (realtimeStream) {
    realtimeStream.getTracks().forEach(track => track.stop());
    realtimeStream = null;
  }

  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
    remoteAudio = null;
  }

  startVoiceAgentBtn.disabled = false;
  holdToTalkBtn.disabled = true;
  holdToTalkBtn.classList.remove("talking");
  holdToTalkBtn.textContent = tr("holdToTalk");
  stopVoiceAgentBtn.disabled = true;
  setVoiceStatus(message);
}

function parseBudgetNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") return value;

  const text = String(value)
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/egp/g, "")
    .replace(/جنيه/g, "")
    .replace(/جم/g, "")
    .trim();

  const firstNumber = text.match(/[\d.]+/);
  if (!firstNumber) return null;

  let num = Number(firstNumber[0]);
  if (!Number.isFinite(num)) return null;

  if (text.includes("million") || text.includes("m") || text.includes("مليون")) {
    num = num * 1000000;
  }

  return Math.round(num);
}

function normalizePhoneDisplay(value) {
  return String(value || "")
    .replace(/[^\d+]/g, "")
    .replace(/^0020/, "0")
    .replace(/^\+20/, "0");
}

function formatShortPrice(value, arabic = false) {
  const num = Number(value || 0);
  if (!num) return arabic ? "السعر غير محدد" : "price on request";

  const million = num / 1000000;
  const clean = Number.isInteger(million) ? String(million) : String(Math.round(million * 10) / 10);

  return arabic ? clean + " مليون جنيه" : clean + " million EGP";
}

function optionLine(unit, index, arabic = false) {
  const unitType = unit.unit_type || "unit";
  const project = unit.project_name || "project";
  const location = unit.location || "";
  const priceText = formatShortPrice(unit.starting_price, arabic);
  const installments = unit.installments_text || "";
  const bedrooms = unit.bedrooms_text || "";

  if (arabic) {
    const label = index === 0 ? "الأول" : "التاني";
    return `${label}: ${unitType} في ${project}${location ? " - " + location : ""}، ${priceText}${bedrooms ? "، " + bedrooms : ""}${installments ? "، تقسيط " + installments : ""}`;
  }

  const label = index === 0 ? "first" : "second";
  return `${label}: ${unitType} in ${project}${location ? " - " + location : ""}, ${priceText}${bedrooms ? ", " + bedrooms : ""}${installments ? ", installments " + installments : ""}`;
}

function buildSpokenSearchSummary(query, searchData) {
  const arabic = isArabicText(query);
  const found = searchData?.results || [];
  const totalMatches = Number(searchData?.total_matches || found.length || 0);
  const developers = Array.isArray(searchData?.developers) ? searchData.developers.filter(Boolean) : [];
  const projects = Array.isArray(searchData?.projects) ? searchData.projects.filter(Boolean) : [];
  const priceRange = searchData?.price_range || {};
  const minPrice = Number(priceRange.min || 0);
  const maxPrice = Number(priceRange.max || 0);

  if (!found.length) {
    return arabic
      ? "مش لاقي نتيجة مطابقة دلوقتي. قولي المنطقة أو نوع الوحدة اللي بتدور عليها وأنا أرشحلك الأفضل."
      : "I couldn't find an exact match yet. Tell me the location or unit type and I'll recommend the best options.";
  }

  if (arabic) {
    let message = totalMatches > 6
      ? `عندي حالياً ${totalMatches} وحدة مناسبة لبحثك`
      : "عندي اختيارات مناسبة لبحثك";

    if (developers.length) {
      message += ` من ${developers.slice(0, 3).join(" و ")}`;
    } else if (projects.length) {
      message += ` في ${projects.slice(0, 3).join(" و ")}`;
    }

    if (minPrice && maxPrice && minPrice !== maxPrice) {
      message += `. الأسعار بتبدأ من ${formatShortPrice(minPrice, true)} وتوصل لحوالي ${formatShortPrice(maxPrice, true)}`;
    }

    message += ". في مشروع معين في بالك ولا تحب أرشحلك الأنسب؟";
    return message;
  }

  let message = totalMatches > 6
    ? `I currently have ${totalMatches} matching options`
    : "I found suitable options";

  if (developers.length) {
    message += ` from ${developers.slice(0, 3).join(", ")}`;
  } else if (projects.length) {
    message += ` in ${projects.slice(0, 3).join(", ")}`;
  }

  if (minPrice && maxPrice && minPrice !== maxPrice) {
    message += `. Prices start from ${formatShortPrice(minPrice, false)} and go up to around ${formatShortPrice(maxPrice, false)}`;
  }

  message += ". Do you already have a project in mind, or would you like me to recommend the best fit?";
  return message;
}

function showPhoneConfirmation(leadRow) {
  pendingVoiceLead = { ...leadRow };
  const detected = normalizePhoneDisplay(leadRow.phone);

  if (phoneConfirmBox) phoneConfirmBox.classList.remove("hidden");
  if (detectedPhoneInput) detectedPhoneInput.value = detected;
  if (leadStatus) {
    leadStatus.classList.remove("hidden");
    leadStatus.className = "status";
    leadStatus.textContent = "الرقم ظاهر قدامك. راجعه واضغط حفظ لو صحيح.";
  }

  setVoiceStatus("الرقم ظاهر قدامك على الشاشة. راجعه واضغط حفظ لو صحيح.", "status");
}

async function confirmPendingVoiceLead() {
  if (!pendingVoiceLead) {
    setVoiceStatus(ui("مفيش ليد صوتي مستني تأكيد.", "No pending voice lead to confirm."), "status error");
    return;
  }

  const confirmedPhone = normalizePhoneDisplay(detectedPhoneInput?.value || pendingVoiceLead.phone);

  if (!confirmedPhone || confirmedPhone.length < 8) {
    setVoiceStatus(ui("اكتب رقم واتساب صحيح قبل الحفظ.", "Please enter a valid phone number before saving."), "status error");
    return;
  }

  const row = {
    ...pendingVoiceLead,
    phone: confirmedPhone,
    source: "website_voice_confirmed_phone"
  };

  await insertRow("leads", row);

  pendingVoiceLead = null;
  if (phoneConfirmBox) phoneConfirmBox.classList.add("hidden");

  if (leadStatus) {
    leadStatus.classList.remove("hidden");
    leadStatus.className = "status success";
    leadStatus.textContent = "تم حفظ بيانات العميل بعد تأكيد الرقم.";
  }

  setVoiceStatus("تم حفظ بيانات العميل برقم واتساب مؤكد.", "status success");
}

function cancelPendingVoiceLead() {
  pendingVoiceLead = null;
  if (phoneConfirmBox) phoneConfirmBox.classList.add("hidden");
  setVoiceStatus(ui("اتلغى تأكيد الرقم. اضغط للتحدث تاني عشان تكمل.", "Phone confirmation cancelled. Hold to Talk again to continue."));
}

async function saveVoiceLeadFromArgs(args) {
  const phoneRaw = normalizePhoneDisplay(args.phone || args.whatsapp || "");

  const row = {
    name: args.name || null,
    phone: phoneRaw || "voice-not-provided",
    message: args.message || args.notes || "Voice lead captured from website voice agent",
    preferred_location: args.preferred_location || args.location || null,
    budget: parseBudgetNumber(args.budget),
    unit_type: args.unit_type || null,
    project_interest: args.project_interest || args.project || null,
    source: phoneRaw ? "website_voice_pending_confirmation" : "website_voice_pending_phone"
  };

  if (phoneRaw) {
    showPhoneConfirmation(row);
    return {
      ...row,
      pending_confirmation: true,
      saved: false
    };
  }

  await insertRow("leads", row);
  return {
    ...row,
    pending_confirmation: false,
    saved: true
  };
}

function sendToolOutput(callId, output) {
  realtimeDc.send(JSON.stringify({
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id: callId,
      output: JSON.stringify(output)
    }
  }));
}

async function handleRealtimeEvent(event) {
  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch {
    return;
  }

  console.log("Realtime event:", payload);

  if (payload.type === "error") {
    setVoiceStatus(ui("خطأ في المساعد الصوتي: ", "Realtime error: ") + (payload.error?.message || ui("خطأ غير معروف", "Unknown error")), "status error");
    return;
  }

  if (payload.type === "session.created") {
    setVoiceStatus(ui("المساعد الصوتي اتصل. اضغط للتحدث واسأل عن العقار.", "Voice agent connected. Hold Push to Talk and ask for a property."), "status success");
  }

  if (payload.type === "input_audio_buffer.speech_started") {
    setVoiceStatus(ui("بيسمع...", "Listening..."));
  }

  if (payload.type === "input_audio_buffer.speech_stopped") {
    setVoiceStatus(ui("بيعالج طلبك...", "Processing your request..."));
  }

  if (payload.type === "response.created") {
    setMicEnabled(false);
    setVoiceStatus(ui("المساعد بيرد. سيب الميكروفون مقفول.", "AI is answering. Keep mic released."));
  }

  if (payload.type === "response.audio.done" || payload.type === "response.done") {
    setMicEnabled(false);
    setVoiceStatus(ui("المساعد خلص. اضغط للتحدث تاني عشان تكمل.", "AI finished. Hold Push to Talk again to continue."), "status success");
  }

  if (payload.type === "conversation.item.input_audio_transcription.completed" && payload.transcript) {
    searchInput.value = payload.transcript;
  }

  if (payload.type !== "response.function_call_arguments.done") {
    return;
  }

  const callId = payload.call_id;

  if (!callId || handledFunctionCalls.has(callId)) {
    return;
  }

  handledFunctionCalls.add(callId);

  let args = {};
  try { args = JSON.parse(payload.arguments || "{}"); } catch (_) {}

  if (payload.name === "search_properties") {
    const query = args.query || args.search_query || searchInput.value || "property search";

    searchInput.value = query;
    setVoiceStatus(ui("بيدور في المخزون عن: ", "Searching live inventory for: ") + query);

    const searchData = await runAISearch(query);
    const spokenSummary = buildSpokenSearchSummary(query, searchData);

    const toolOutput = {
      must_read_first: spokenSummary,
      answer_language_hint: isArabicText(query) ? "egyptian_arabic" : "english",
      answer: searchData?.answer || "Search completed.",
      inventory_count: searchData?.total_matches || (searchData?.results || []).length,
      developers: searchData?.developers || [],
      projects: searchData?.projects || [],
      price_range: searchData?.price_range || null,
      results_count: (searchData?.results || []).length,
      results: (searchData?.results || []).slice(0, 6).map(unit => ({
        project_name: unit.project_name,
        developer: unit.developer,
        location: unit.location,
        unit_type: unit.unit_type,
        bedrooms_text: unit.bedrooms_text,
        starting_price: unit.starting_price,
        down_payment_text: unit.down_payment_text,
        installments_text: unit.installments_text,
        delivery_text: unit.delivery_text,
        image_url: unit.image_url,
        brochure_url: unit.brochure_url,
        video_url: unit.video_url
      }))
    };

    sendToolOutput(callId, toolOutput);

    realtimeDc.send(JSON.stringify({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        instructions: `
You just received search_properties tool output.

You are Tycoons Investments Senior Property Consultant.

Critical:
- First, read the field must_read_first to the user.
- Do not call save_voice_lead in this response.
- Do not ask for phone in this response.
- Do not ask for budget in this response unless the user already asked for prices.
- Do not say the search is still continuing.
- Do not say you will check or search.
- Do not mention AI, database, Supabase, tools, functions, or search engine.
- Speak like a real estate consultant, not a support bot.
- Keep the response under 3 short sentences.
- Ask only ONE question.

Consultant behavior:
- Mention inventory size when must_read_first includes it.
- Mention developers when must_read_first includes them.
- Mention price range only if must_read_first includes it or the user asked for prices.
- If the user gave a broad request, ask whether they have a specific project in mind or want a recommendation.
- If the user asked for a specific unit type, ask purpose: personal use or investment.
- Ask for WhatsApp only in a later turn after the customer asks for offer, brochure, availability details, or says send details.

If Arabic:
- Reply in natural Egyptian Arabic only.
- Do not use formal Arabic.
- Keep project and developer names in English.

If English:
- Reply in simple warm English.

After this response, wait for the user's next push-to-talk message.
`
      }
    }));

    return;
  }

  if (payload.name === "save_voice_lead") {
    setVoiceStatus(ui("بيجهز الليد الصوتي...", "Preparing voice lead..."));

    try {
      const savedLead = await saveVoiceLeadFromArgs(args);

      if (leadStatus) {
        leadStatus.classList.remove("hidden");
        leadStatus.className = "status success";
        leadStatus.textContent = savedLead.pending_confirmation ? "الرقم ظاهر قدامك. راجعه واضغط حفظ لو صحيح." : "تم حفظ بيانات العميل.";
      }

      sendToolOutput(callId, {
        saved: savedLead.saved === true,
        pending_confirmation: savedLead.pending_confirmation === true,
        saved_to: savedLead.saved === true ? "Supabase leads table" : "waiting_for_user_phone_confirmation",
        phone_status: savedLead.phone === "voice-not-provided" ? "phone_not_provided" : "phone_pending_confirmation",
        lead: savedLead
      });

      realtimeDc.send(JSON.stringify({
        type: "response.create",
        response: {
          output_modalities: ["audio"],
          instructions: `
The save_voice_lead tool returned status.

If pending_confirmation is true:
- Say exactly in Egyptian Arabic: الرقم ظاهر قدامك على الشاشة، راجعه واضغط حفظ لو صحيح.
- Do not say the lead is saved yet.
- Do not say: مش هسجل الليد، مش هحفظ الليد، لن يتم الحفظ, waiting for database, or any negative warning.
- Do not mention database, Supabase, tools, or confirmation logic.

If saved is true:
- Say exactly in Egyptian Arabic: تم حفظ بياناتك، وفريق المبيعات هيراجع الاختيارات المناسبة.

If phone_status is phone_not_provided:
- Ask one short question in Egyptian Arabic: رقم واتساب للتواصل؟

Use the user's language, but if Arabic use Egyptian Arabic only.
`
        }
      }));
    } catch (error) {
      console.error("Voice lead save error:", error);

      sendToolOutput(callId, {
        saved: false,
        error: error.message || ui("تعذر حفظ الليد الصوتي", "Could not save voice lead")
      });

      realtimeDc.send(JSON.stringify({
        type: "response.create",
        response: {
          output_modalities: ["audio"],
          instructions: ui("لم يتم حفظ الليد. اعتذر باختصار واطلب من المستخدم استخدام نموذج التواصل.", "The lead was not saved. Apologize briefly and ask the user to use the contact form.")
        }
      }));
    }

    return;
  }
}

async function startRealtimeAgent() {
  try {
    startVoiceAgentBtn.disabled = true;
    stopVoiceAgentBtn.disabled = false;
    holdToTalkBtn.disabled = true;
    handledFunctionCalls.clear();
    setVoiceStatus(ui("بيبدأ اتصال المساعد الصوتي...", "Starting Realtime voice connection..."));

    window.speechSynthesis?.cancel?.();

    realtimePc = new RTCPeerConnection();

    remoteAudio = document.createElement("audio");
    remoteAudio.autoplay = true;
    remoteAudio.playsInline = true;

    realtimePc.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
    };

    realtimePc.onconnectionstatechange = () => {
      console.log("WebRTC connection state:", realtimePc.connectionState);
      if (["failed", "disconnected", "closed"].includes(realtimePc.connectionState)) {
        setVoiceStatus(ui("حالة اتصال الصوت: ", "Voice connection state: ") + realtimePc.connectionState);
      }
    };

    realtimeStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      }
    });

    micTrack = realtimeStream.getAudioTracks()[0];
    if (micTrack) micTrack.enabled = false;

    realtimeStream.getTracks().forEach(track => realtimePc.addTrack(track, realtimeStream));

    realtimeDc = realtimePc.createDataChannel("oai-events");
    realtimeDc.addEventListener("message", handleRealtimeEvent);

    realtimeDc.addEventListener("open", () => {
      holdToTalkBtn.disabled = false;
      setVoiceStatus(ui("المساعد الصوتي شغال. اضغط مطولًا للتحدث.", "Realtime voice agent is live. Hold Push to Talk while speaking."), "status success");
    });

    realtimeDc.addEventListener("close", () => {
      setVoiceStatus(ui("اتصال بيانات الصوت اتقفل.", "Realtime voice data channel closed."), "status error");
      holdToTalkBtn.disabled = true;
    });

    const offer = await realtimePc.createOffer();
    await realtimePc.setLocalDescription(offer);

    const sdpRes = await fetch("/api/realtime-connect", {
      method: "POST",
      body: offer.sdp,
      headers: {
        "Content-Type": "application/sdp"
      }
    });

    if (!sdpRes.ok) {
      const errorText = await sdpRes.text();
      throw new Error(errorText);
    }

    const answerSdp = await sdpRes.text();

    if (!answerSdp.includes("v=0")) {
      throw new Error("Invalid SDP answer returned: " + answerSdp.slice(0, 300));
    }

    await realtimePc.setRemoteDescription({
      type: "answer",
      sdp: answerSdp
    });
  } catch (err) {
    console.error(err);
    stopRealtimeAgent(ui("تعذر تشغيل المساعد الصوتي: ", "Could not start voice agent: ") + err.message);
    voiceStatus.className = "status error";
  }
}

function beginPushToTalk(event) {
  event.preventDefault();
  if (!realtimeDc || realtimeDc.readyState !== "open" || !micTrack) return;
  window.speechSynthesis?.cancel?.();
  setMicEnabled(true);
}

function endPushToTalk(event) {
  event.preventDefault();
  setMicEnabled(false);
}

holdToTalkBtn.addEventListener("mousedown", beginPushToTalk);
holdToTalkBtn.addEventListener("mouseup", endPushToTalk);
holdToTalkBtn.addEventListener("mouseleave", endPushToTalk);
holdToTalkBtn.addEventListener("touchstart", beginPushToTalk, { passive: false });
holdToTalkBtn.addEventListener("touchend", endPushToTalk, { passive: false });
holdToTalkBtn.addEventListener("touchcancel", endPushToTalk, { passive: false });

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat && document.activeElement.tagName !== "TEXTAREA" && document.activeElement.tagName !== "INPUT") {
    beginPushToTalk(event);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space" && document.activeElement.tagName !== "TEXTAREA" && document.activeElement.tagName !== "INPUT") {
    endPushToTalk(event);
  }
});

if (confirmPhoneBtn) {
  confirmPhoneBtn.addEventListener("click", async () => {
    try {
      confirmPhoneBtn.disabled = true;
      await confirmPendingVoiceLead();
    } catch (error) {
      console.error("Confirm phone save error:", error);
      setVoiceStatus(ui("تعذر حفظ الليد بعد التأكيد: ", "Could not save confirmed lead: ") + (error.message || ui("خطأ غير معروف", "Unknown error")), "status error");
    } finally {
      confirmPhoneBtn.disabled = false;
    }
  });
}

if (cancelPhoneBtn) {
  cancelPhoneBtn.addEventListener("click", cancelPendingVoiceLead);
}

startVoiceAgentBtn.addEventListener("click", startRealtimeAgent);
stopVoiceAgentBtn.addEventListener("click", () => stopRealtimeAgent(ui("تم إيقاف الجلسة الصوتية.", "Voice session stopped.")));
window.addEventListener("beforeunload", () => stopRealtimeAgent(tr("voiceOff")));


/* ============================================================
   SAFE PROPERTY CARD IMAGE CAROUSEL
   ------------------------------------------------------------
   image_url = first/main image
   gallery_urls = extra images separated by commas or line breaks
   If gallery_urls is empty, old single-image cards stay unchanged.
   ============================================================ */

function updatePropertyCarousel(carousel, nextIndex) {
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll(".carousel-img"));
  if (!slides.length) return;

  const total = slides.length;
  const safeIndex = ((Number(nextIndex || 0) % total) + total) % total;

  carousel.dataset.carouselIndex = String(safeIndex);

  slides.forEach((slide, index) => {
    slide.classList.toggle("active", index === safeIndex);
  });

  carousel.querySelectorAll(".carousel-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === safeIndex);
  });

  const counter = carousel.querySelector(".carousel-counter");
  if (counter) counter.textContent = `${safeIndex + 1} / ${total}`;
}

document.addEventListener("click", function handlePropertyCarouselClick(event) {
  const clicked = event.target;
  if (!clicked || !clicked.closest) return;

  const navButton = clicked.closest("[data-carousel-dir]");
  const dotButton = clicked.closest("[data-carousel-dot]");

  if (!navButton && !dotButton) return;

  const carousel = clicked.closest(".image-carousel");
  if (!carousel) return;

  event.preventDefault();
  event.stopPropagation();

  const currentIndex = Number(carousel.dataset.carouselIndex || 0);

  if (navButton) {
    const direction = Number(navButton.dataset.carouselDir || 1);
    updatePropertyCarousel(carousel, currentIndex + direction);
    return;
  }

  updatePropertyCarousel(carousel, Number(dotButton.dataset.carouselDot || 0));
});


/* ============================================================
   ELEVENLABS SARAH CLIENT TOOLS
   ------------------------------------------------------------
   These tools let the ElevenLabs widget search Tycoons live
   inventory and update the same cards under the search area.
   Required matching client tools in ElevenLabs dashboard:
   - search_properties
   - save_lead
   ============================================================ */

function compactElevenLabsUnit(unit) {
  return {
    project_name: unit.project_name || unit.name || "",
    developer: unit.developer || "",
    location: unit.location || "",
    unit_type: unit.unit_type || "",
    bedrooms_text: unit.bedrooms_text || "",
    area: areaText(unit.area_sqm),
    starting_price: price(unit.starting_price || unit.min_price),
    delivery: unit.delivery_text || "",
    finishing: unit.finishing || "",
    brochure_url: unit.brochure_url || "",
    page_url: projectPageUrl(unit.project_name || unit.name, unit.location)
  };
}

function buildElevenLabsSearchQuery(args = {}) {
  const parts = [
    args.query,
    args.location,
    args.area,
    args.unit_type,
    args.budget,
    args.budget_range,
    args.purpose,
    args.delivery_timing
  ];
  return parts.map(value => String(value || "").trim()).filter(Boolean).join(" ").trim();
}

async function elevenlabsSearchProperties(args = {}) {
  const query = buildElevenLabsSearchQuery(args);

  if (!query) {
    return {
      success: false,
      message: ui("اسأل العميل عن المنطقة أو نوع الوحدة الأول.", "Ask the client for the area or unit type first.")
    };
  }

  if (searchInput) searchInput.value = query;
  setElevenLabsStatus(ui("Sarah بتدور في المخزون وبتعرض النتائج تحت...", "Sarah is searching the inventory and showing results below..."));

  const data = await runAISearch(query);
  const shownResults = (data?.results || []).slice(0, 3).map(compactElevenLabsUnit);

  try {
    const resultsSection = document.querySelector(".results-section");
    if (resultsSection) resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (_) {}

  if (!shownResults.length) {
    setElevenLabsStatus(ui("مفيش نتيجة مطابقة ظهرت، Sarah تقدر تطلب بيانات العميل للمتابعة.", "No matching cards appeared. Sarah can collect details for follow-up."), "warning");
    return {
      success: true,
      query,
      shown_on_page: true,
      results_count: 0,
      message: ui("مش لاقية اختيار مطابق 100% للمعايير دي دلوقتي.", "I am not seeing a perfect match for those criteria right now."),
      results: []
    };
  }

  setElevenLabsStatus(ui("ظهرت نتائج البحث تحت. Sarah تقدر تلخص أول 2 أو 3 اختيارات.", "Search results appeared below. Sarah can summarize the first 2 or 3 options."), "success");

  return {
    success: true,
    query,
    shown_on_page: true,
    results_count: shownResults.length,
    message: ui("النتائج ظهرت في الكروت تحت.", "The results are now shown in the cards below."),
    results: shownResults
  };
}

async function elevenlabsSaveLead(args = {}) {
  const name = String(args.name || args.full_name || "").trim();
  const phone = normalizePhoneDisplay(args.phone || args.whatsapp || args.whatsapp_number || "");

  if (!name || !phone) {
    return {
      success: false,
      missing: !name ? "name" : "phone",
      message: ui("اطلب الاسم ورقم الواتساب قبل حفظ الليد.", "Ask for the name and WhatsApp number before saving the lead.")
    };
  }

  const row = {
    name,
    phone,
    message: args.notes || args.message || "Lead captured by ElevenLabs Sarah voice agent",
    preferred_location: args.preferred_location || args.location || args.area || null,
    budget: parseBudgetNumber(args.budget || args.budget_range),
    unit_type: args.unit_type || null,
    project_interest: args.project_interest || args.project || null,
    source: "website_elevenlabs_voice_agent"
  };

  await insertRow("leads", row);

  if (leadStatus) {
    leadStatus.classList.remove("hidden");
    leadStatus.className = "status success";
    leadStatus.textContent = ui("تم حفظ بيانات العميل من Sarah.", "Lead saved from Sarah.");
  }

  setElevenLabsStatus(ui("تم حفظ بيانات العميل، وفريق المبيعات يقدر يتابع على واتساب.", "Lead saved. The sales team can follow up on WhatsApp."), "success");

  return {
    success: true,
    saved: true,
    name,
    phone,
    message: ui(`شكراً يا ${name}. هنبعتلك التفاصيل على واتساب.`, `Thank you, ${name}. The team will send you the details on WhatsApp.`)
  };
}

loadData();

async function loadData() {
  try {
    statusBox.className = "status";
    statusBox.textContent = tr("loadingSupabase");

    units = await getRows("units", "?select=*&availability_status=eq.available&order=starting_price.asc");
    projects = await getRows("projects", "?select=*&order=min_price.asc");
    projects = enrichProjectsWithUnitMedia(projects);

    render(units.slice(0, 6), results);
    render(projects, projectGrid, "project");
    applySiteLanguage();

    statusBox.className = "status success";
    statusBox.textContent = tr("connectedPrefix") + units.length + tr("unitsAnd") + projects.length + tr("projectsLoaded");

    // If the visitor arrived from a project page with a search query
    // in the URL (e.g. /?q=villa#search), run that search automatically.
    try {
      const params = new URLSearchParams(window.location.search);
      const incomingQuery = (params.get("q") || "").trim();
      if (incomingQuery && searchInput) {
        searchInput.value = incomingQuery;
        const searchSection = document.getElementById("search");
        if (searchSection) searchSection.scrollIntoView({ behavior: "smooth" });
        runAISearch(incomingQuery);
      }
    } catch (_) {}
  } catch (err) {
    console.error(err);
    statusBox.className = "status error";
    statusBox.textContent = ui("تعذر تحميل بيانات Supabase. راجع إعدادات API/RLS.", "Could not load Supabase data. Check the API key, URL, and RLS policies.");
  }
}
/* ============================================================
   FREE VOICE SEARCH ADD-ON
   --------------------------------------------------------------
   Uses the browser's built-in SpeechRecognition (speech-to-text)
   and SpeechSynthesis (text-to-speech) — both are free, built
   into the browser, no OpenAI Realtime API cost at all.

   Flow:
   1. Tap "Voice Search"
   2. Browser listens, converts speech to text
   3. Text is sent to the EXISTING /api/ai-search endpoint
      (already cheap — gpt-5.4-mini with a free local fallback)
   4. The AI's text answer is read aloud using speechSynthesis

   This does not touch or replace the paid "Start Voice Agent"
   (OpenAI Realtime) feature — it is a separate, free alternative
   button placed next to it.
   ============================================================ */

(function () {
  const freeVoiceBtn = document.getElementById("freeVoiceBtn");
  if (!freeVoiceBtn) return;

  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionImpl) {
    freeVoiceBtn.addEventListener("click", () => {
      voiceStatus.className = "status error";
      voiceStatus.textContent = ui("البحث الصوتي المجاني محتاج متصفح بيدعم Speech Recognition زي Chrome.", "Free voice search needs a browser with speech recognition support, like Chrome on desktop or Android.");
    });
    return;
  }

  const freeRecognition = new SpeechRecognitionImpl();
  freeRecognition.lang = "ar-EG";
  freeRecognition.interimResults = false;
  freeRecognition.continuous = false;

  let freeVoiceActive = false;

  function speak(text, lang) {
    if (!window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((voice) => voice.lang && voice.lang.startsWith(lang.split("-")[0]));
    if (matchedVoice) utterance.voice = matchedVoice;

    window.speechSynthesis.speak(utterance);
  }

  freeVoiceBtn.addEventListener("click", () => {
    if (freeVoiceActive || isSearching) return;

    window.speechSynthesis?.cancel?.();
    freeVoiceActive = true;
    freeVoiceBtn.disabled = true;
    freeVoiceBtn.textContent = ui("بيسمع...", "Listening...");
    voiceStatus.className = "status";
    voiceStatus.textContent = ui("بيسمع بحثك الصوتي المجاني...", "Listening for your free voice search...");

    try {
      freeRecognition.start();
    } catch (err) {
      freeVoiceActive = false;
      freeVoiceBtn.disabled = false;
      freeVoiceBtn.textContent = ui("بحث صوتي", "Voice Search");
      voiceStatus.className = "status error";
      voiceStatus.textContent = ui("الميكروفون مشتغلش. راجع صلاحيات المتصفح وجرب تاني.", "Microphone could not start. Check browser permissions and try again.");
    }
  });

  freeRecognition.addEventListener("result", async (event) => {
    const transcript = event.results[0][0].transcript;
    const arabic = /[\u0600-\u06FF]/.test(transcript);

    searchInput.value = transcript;
    voiceStatus.className = "status";
    voiceStatus.textContent = ui("سمعت: " + transcript + " — بيدور دلوقتي...", "Heard: " + transcript + " — searching now...");

    const data = await runAISearch(transcript);

    if (data && data.answer) {
      voiceStatus.className = "status success";
      voiceStatus.textContent = data.answer;
      speak(data.answer, arabic ? "ar-EG" : "en-US");
    } else {
      voiceStatus.className = "status error";
      voiceStatus.textContent = ui("مفيش رد صوتي رجع. شوف النتائج تحت.", "No spoken answer was returned. Check the results below instead.");
    }
  });

  freeRecognition.addEventListener("end", () => {
    freeVoiceActive = false;
    freeVoiceBtn.disabled = false;
    freeVoiceBtn.textContent = ui("بحث صوتي", "Voice Search");
  });

  freeRecognition.addEventListener("error", (event) => {
    freeVoiceActive = false;
    freeVoiceBtn.disabled = false;
    freeVoiceBtn.textContent = ui("بحث صوتي", "Voice Search");
    voiceStatus.className = "status error";
    voiceStatus.textContent = ui("خطأ في الصوت: " + event.error + ". اكتب البحث بدل الصوت.", "Voice input error: " + event.error + ". You can type your search instead.");
  });
})();


/* ============================================================
   WHATSAPP LEAD TRACKING V1
   ------------------------------------------------------------
   Tracks WhatsApp clicks by source before opening WhatsApp.
   It works for:
   - header WhatsApp button
   - floating WhatsApp button
   - lead section WhatsApp button
   - static page WhatsApp buttons
   - dynamic unit/project card WhatsApp buttons
   If Supabase table whatsapp_clicks does not exist yet, clicks still open WhatsApp normally.
   ============================================================ */

function getWhatsAppSource(link) {
  if (link.dataset.waSource) return link.dataset.waSource;
  if (link.classList.contains("floating-whatsapp")) return "floating_whatsapp";
  if (link.classList.contains("header-whatsapp")) return "header_whatsapp";
  if (link.classList.contains("card-whatsapp")) return "card_whatsapp";
  if (link.closest(".lead-section")) return "lead_section_whatsapp";
  if (link.closest(".aio-answer-card")) return "aio_answer_whatsapp";
  if (link.closest(".static-hero")) return "static_hero_whatsapp";
  if (link.closest(".static-card")) return "static_card_whatsapp";
  return "website_whatsapp";
}

function getWhatsAppBaseMessage(link, source) {
  if (link.dataset.waMessage) return link.dataset.waMessage;

  try {
    const url = new URL(link.href);
    const existing = url.searchParams.get("text");
    if (existing) return existing;
  } catch (_) {}

  return "Hello Tycoons Investments, I want help finding a suitable property.";
}

function buildWhatsAppTrackingContext(link) {
  const source = getWhatsAppSource(link);
  const trackingId = "wa_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

  return {
    tracking_id: trackingId,
    source,
    page_url: window.location.href,
    page_path: window.location.pathname || "/",
    referrer: document.referrer || null,
    user_agent: navigator.userAgent || null,
    project_name: link.dataset.waProject_name || link.dataset.waProjectName || null,
    unit_type: link.dataset.waUnit_type || link.dataset.waUnitType || null,
    bedrooms_text: link.dataset.waBedrooms_text || link.dataset.waBedroomsText || null,
    starting_price: link.dataset.waStarting_price || link.dataset.waStartingPrice || null,
    utm_source: WHATSAPP_UTM_SOURCE,
    utm_medium: WHATSAPP_UTM_MEDIUM,
    utm_campaign: WHATSAPP_UTM_CAMPAIGN
  };
}

function buildTrackedWhatsAppUrl(link, context) {
  const baseMessage = getWhatsAppBaseMessage(link, context.source);
  const finalMessage = [
    baseMessage,
    "",
    "Source: " + context.source,
    "Page: " + context.page_path,
    context.project_name ? "Project: " + context.project_name : "",
    context.unit_type ? "Unit type: " + context.unit_type : "",
    context.bedrooms_text ? "Bedrooms: " + context.bedrooms_text : "",
    context.starting_price ? "Starting price: " + context.starting_price : "",
    "Tracking ID: " + context.tracking_id
  ].filter(Boolean).join("\n");

  return "https://wa.me/" + TYCOONS_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(finalMessage);
}

function trackWhatsAppClick(context, whatsappUrl) {
  const row = {
    tracking_id: context.tracking_id,
    source: context.source,
    page_url: context.page_url,
    page_path: context.page_path,
    referrer: context.referrer,
    user_agent: context.user_agent,
    project_name: context.project_name,
    unit_type: context.unit_type,
    bedrooms_text: context.bedrooms_text,
    starting_price: context.starting_price ? Number(context.starting_price) : null,
    whatsapp_url: whatsappUrl,
    utm_source: context.utm_source,
    utm_medium: context.utm_medium,
    utm_campaign: context.utm_campaign
  };

  try {
    fetch(API_BASE + "/" + WHATSAPP_TRACKING_TABLE, {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify(row),
      keepalive: true
    }).catch((error) => {
      console.warn("WhatsApp click tracking was not saved:", error);
    });
  } catch (error) {
    console.warn("WhatsApp click tracking skipped:", error);
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href*="wa.me/"], a[href*="api.whatsapp.com/send"]');
  if (!link) return;

  const context = buildWhatsAppTrackingContext(link);
  const trackedUrl = buildTrackedWhatsAppUrl(link, context);

  trackWhatsAppClick(context, trackedUrl);

  event.preventDefault();
  window.open(trackedUrl, "_blank", "noopener,noreferrer");
});


/* ============================================================
   ASK FOR BROCHURE — lead capture popup
   ------------------------------------------------------------
   Replaces direct brochure downloads with a short popup asking
   for name + WhatsApp number. On submit, the lead is saved to
   Supabase (same "leads" table as the main contact form), then
   the actual brochure opens automatically.

   Triggered by any element with class "js-ask-brochure" and
   data-project / data-brochure-url / data-source attributes.
   This same widget is also used (with its own inline copy) on
   the static project pages built by scripts/generate-pages.js.
   ============================================================ */

(function () {
  function buildBrochureModal() {
    if (document.getElementById("brochureModalBackdrop")) return;

    const wrap = document.createElement("div");
    wrap.id = "brochureModalBackdrop";
    wrap.className = "brochure-modal-backdrop hidden";
    wrap.innerHTML = `
      <div class="brochure-modal" role="dialog" aria-modal="true">
        <button type="button" class="brochure-modal-close" aria-label="Close">&times;</button>
        <h3>${ui("اطلب البروشور", "Ask for Brochure")}</h3>
        <p class="brochure-modal-project"></p>
        <form class="brochure-modal-form">
          <input type="text" name="name" placeholder="${ui("اسمك", "Your name")}" required>
          <input type="tel" name="phone" placeholder="${ui("رقم واتساب", "WhatsApp number")}" required>
          <button type="submit">${ui("ابعت وافتح واتساب", "Send &amp; Get Brochure")}</button>
        </form>
        <div class="brochure-modal-status"></div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  function openBrochureModal(projectName, brochureUrl, source) {
    buildBrochureModal();
    const backdrop = document.getElementById("brochureModalBackdrop");
    backdrop.classList.remove("hidden");
    backdrop.dataset.brochureUrl = brochureUrl || "";
    backdrop.dataset.projectName = projectName || "";
    backdrop.dataset.source = source || "brochure_request";
    backdrop.querySelector(".brochure-modal-project").textContent = projectName ? ui("المشروع: ", "For: ") + projectName : "";
    backdrop.querySelector(".brochure-modal-status").textContent = "";
    backdrop.querySelector(".brochure-modal-form").reset();
  }

  function closeBrochureModal() {
    const backdrop = document.getElementById("brochureModalBackdrop");
    if (backdrop) backdrop.classList.add("hidden");
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".js-ask-brochure");
    if (trigger) {
      event.preventDefault();
      openBrochureModal(trigger.dataset.project || "", trigger.dataset.brochureUrl || "", trigger.dataset.source || "brochure_request");
      return;
    }
    if (event.target.closest(".brochure-modal-close") || event.target.id === "brochureModalBackdrop") {
      closeBrochureModal();
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest(".brochure-modal-form");
    if (!form) return;
    event.preventDefault();

    const backdrop = document.getElementById("brochureModalBackdrop");
    const statusEl = backdrop.querySelector(".brochure-modal-status");
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const projectName = backdrop.dataset.projectName;
    const source = backdrop.dataset.source;

    if (!name || !phone) {
      statusEl.textContent = ui("اكتب اسمك ورقم واتساب.", "Please fill in your name and number.");
      return;
    }

    statusEl.textContent = ui("بيفتح واتساب...", "Opening WhatsApp...");

    const message = [
      "Hello Tycoons Investments,",
      "I am requesting the brochure for:",
      projectName,
      "",
      "Name: " + name,
      "WhatsApp: " + phone
    ].filter(Boolean).join("\n");

    const waUrl = "https://wa.me/" + TYCOONS_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
    window.open(waUrl, "_blank", "noopener");

    setTimeout(closeBrochureModal, 600);
  });
})();
