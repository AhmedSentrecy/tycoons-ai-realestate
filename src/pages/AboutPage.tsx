import { useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, Target, Eye, HeartHandshake, Mic, FileCheck, Users } from "lucide-react";
import Navbar from "@/sections/Navbar";
import Footer from "@/sections/Footer";

const ease = [0.22, 1, 0.36, 1] as const;

const values = [
  {
    icon: FileCheck,
    title: "الشفافية أولًا",
    desc: "السعر اللي بتشوفه هو سعر المطور الرسمي. مفيش زيادات خفية ولا أوفر متخبي — العقد النهائي بيتم مع الشركة المطورة نفسها.",
  },
  {
    icon: Mic,
    title: "التكنولوجيا في الخدمة",
    desc: "بنستخدم الذكاء الاصطناعي مش كموضة، لكن عشان نوفرلك ساعات من البحث: صف اللي عايزه بجملة واحدة والمساعد يفهم ويرشح من مخزون موثق.",
  },
  {
    icon: HeartHandshake,
    title: "معاك لحد المفتاح",
    desc: "من أول رسالة لحد المعاينة والتعاقد، فريقنا بيفضل معاك. مبنبيعش ونسيبك — بنجاوب على كل سؤال حتى بعد الاستلام.",
  },
];

const milestones = [
  { year: "٢٠٢٤", text: "انطلاق تايكونز بفكرة واحدة: الشراء من المطور مباشرة من غير دوشة السماسرة" },
  { year: "٢٠٢٥", text: "إطلاق المساعد الذكي بالبحث الصوتي — الأول بالعربي المصري في السوق" },
  { year: "٢٠٢٦", text: "+٦٤٤ مشروع موثق من ٨ مطورين كبار، وأكتر من ١٢٠٠ عميل اتوصّلوا بوحدتهم" },
];

export default function AboutPage() {
  useEffect(() => {
    document.title = "من نحن — تايكونز للاستثمار العقاري";
    window.scrollTo(0, 0);
    return () => {
      document.title = "Tycoons Investments | ابحث عن عقارك في مصر بالذكاء الاصطناعي";
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f2ea]">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#0d1f18] pb-24 pt-40">
        <div className="mx-auto max-w-4xl px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
          >
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowRight className="h-4 w-4" />
              الرئيسية
            </Link>
            <h1 className="text-4xl font-extrabold leading-snug text-white sm:text-6xl sm:leading-snug">
              إحنا بنغيّر طريقة
              <span className="gold-gradient-text block">شراء العقار في مصر.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-light leading-loose text-white/70">
              تايكونز للاستثمار العقاري اتأسست عشان تحل مشكلة حقيقية: سوق مليان إعلانات
              مكررة وأسعار وهمية ووسطاء بياكلوا من السعر. فكرتنا بسيطة — وحدات موثقة من
              المطوّر مباشرة، ومساعد ذكي يفهمك ويوصّلك للوحدة المناسبة.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & vision */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              icon: Target,
              title: "مهمتنا",
              text: "إن أي حد في مصر يقدر يشتري عقار من المطور مباشرة، بسعر شفاف وخطوات واضحة، من غير ما يحتاج «يعرف حد يعرف حد».",
            },
            {
              icon: Eye,
              title: "رؤيتنا",
              text: "إن البحث عن عقار يبقى زي المحادثة مع صاحبك اللي فاهم في السوق — تقول اللي عايزه، وتلاقي الإجابة الصح في دقايق.",
            },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: i * 0.12, ease }}
              className="rounded-3xl border border-[#e7ddc8] bg-white/70 p-9"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#14352a] text-[#e8d5ae]">
                <c.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold text-[#1b2420]">{c.title}</h2>
              <p className="mt-3 font-light leading-loose text-[#5c6a62]">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#efe7d8] py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="mb-12 text-center text-3xl font-extrabold text-[#1b2420] sm:text-4xl"
          >
            قيمنا
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.12, ease }}
                className="rounded-3xl bg-white/60 p-8"
              >
                <v.icon className="h-8 w-8 text-[#a3854e]" />
                <h3 className="mt-5 text-xl font-extrabold text-[#1b2420]">{v.title}</h3>
                <p className="mt-3 font-light leading-loose text-[#5c6a62]">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-4xl px-5 py-20 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="mb-12 text-center text-3xl font-extrabold text-[#1b2420] sm:text-4xl"
        >
          رحلتنا
        </motion.h2>
        <div>
          {milestones.map((m, i) => (
            <motion.div
              key={m.year}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease }}
              className="relative flex gap-8 border-r-2 border-[#c49b5f]/40 pb-12 pr-8 last:pb-0"
            >
              <span className="absolute -right-[9px] top-1 h-4 w-4 rounded-full border-4 border-[#f7f2ea] bg-[#c49b5f]" />
              <span className="w-20 shrink-0 text-2xl font-extrabold text-[#14352a]">{m.year}</span>
              <p className="pt-1 font-light leading-relaxed text-[#5c6a62]">{m.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-5 pb-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="rounded-[2rem] bg-[#0d1f18] p-10 text-center"
        >
          <Users className="mx-auto h-8 w-8 text-[#d9b87c]" />
          <h2 className="mt-5 text-2xl font-extrabold text-white sm:text-3xl">
            فريق واحد هدفه وحدتك الجاية
          </h2>
          <p className="mx-auto mt-3 max-w-md font-light leading-relaxed text-white/65">
            جرّب المساعد الذكي أو كلمنا مباشرة — وهنشوف إزاي نقدر نساعدك توصل للعقار المناسب.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/"
              className="rounded-full bg-[#c49b5f] px-8 py-3.5 text-sm font-bold text-[#231a0c] transition-transform hover:scale-[1.04]"
            >
              ابدأ البحث
            </Link>
            <Link
              to="/faq"
              className="rounded-full border border-white/25 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              الأسئلة الشائعة
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
