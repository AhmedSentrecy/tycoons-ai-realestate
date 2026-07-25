import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { globalFaqs } from "@/data/content";

const ease = [0.22, 1, 0.36, 1] as const;

export default function FaqSection() {
  return (
    <section className="bg-[#f7f2ea] py-24 lg:py-32">
      <div className="mx-auto max-w-4xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
          className="mb-12 flex items-start gap-6"
        >
          <span className="text-stroke-ink hidden text-8xl font-black leading-none lg:block">03</span>
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#c49b5f]" />
              <span className="text-sm font-medium text-[#a3854e]">عندك سؤال؟</span>
            </div>
            <h2 className="text-4xl font-black text-[#1b2420] sm:text-5xl">الأسئلة الشائعة</h2>
            <p className="mt-4 max-w-md font-light leading-relaxed text-[#6d7a72]">
              كل اللي محتاج تعرفه عن الشراء من المطور مباشرة والبحث بالذكاء الاصطناعي.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.85, delay: 0.1, ease }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {globalFaqs.slice(0, 5).map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl border border-[#e7ddc8] bg-white/60 px-6 transition-all data-[state=open]:border-[#c49b5f]/50 data-[state=open]:bg-white data-[state=open]:shadow-[0_20px_50px_-20px_rgba(120,60,30,0.25)]"
              >
                <AccordionTrigger className="py-5 text-right text-[17px] font-bold text-[#1b2420] hover:no-underline [&>svg]:text-[#c49b5f]">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 font-light leading-relaxed text-[#6d7a72]">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10"
        >
          <Link
            to="/faq"
            className="group inline-flex items-center gap-2 text-sm font-bold text-[#1b2420] transition-colors hover:text-[#c49b5f]"
          >
            شوف كل الأسئلة الشائعة
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
