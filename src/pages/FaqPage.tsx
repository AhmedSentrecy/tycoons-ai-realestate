import { useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import Navbar from "@/sections/Navbar";
import Footer from "@/sections/Footer";
import { globalFaqs } from "@/data/content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ease = [0.22, 1, 0.36, 1] as const;

export default function FaqPage() {
  useEffect(() => {
    document.title = "الأسئلة الشائعة — كل حاجة عن الشراء من المطور مباشرة | تايكونز";
    window.scrollTo(0, 0);
    return () => {
      document.title = "Tycoons Investments | ابحث عن عقارك في مصر بالذكاء الاصطناعي";
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f2ea]">
      <Navbar />

      <section className="bg-[#0d1f18] pb-20 pt-40">
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
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl">الأسئلة الشائعة</h1>
            <p className="mt-4 max-w-lg font-light leading-relaxed text-white/65">
              إجابات واضحة على أكتر الأسئلة اللي بتتسأل — عن الأسعار، التقسيط، البحث الذكي،
              وطريقة شغلنا مع المطورين.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {globalFaqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl border border-[#e7ddc8] bg-white/70 px-6 transition-colors data-[state=open]:border-[#c49b5f]/50 data-[state=open]:bg-white"
              >
                <AccordionTrigger className="py-5 text-right text-[17px] font-bold text-[#1b2420] hover:no-underline [&>svg]:text-[#c49b5f]">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 font-light leading-relaxed text-[#5c6a62]">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="mt-14 rounded-3xl bg-[#0d1f18] p-9 text-center"
        >
          <h2 className="text-2xl font-extrabold text-white">لسه عندك سؤال؟</h2>
          <p className="mx-auto mt-3 max-w-sm font-light text-white/65">
            المساعد وفريقنا جاهزين يردوا عليك في دقايق.
          </p>
          <a
            href="https://wa.me/201200704344"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-[#1faa59] px-8 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.04]"
          >
            <MessageCircle className="h-4 w-4" />
            اسأل على واتساب
          </a>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
