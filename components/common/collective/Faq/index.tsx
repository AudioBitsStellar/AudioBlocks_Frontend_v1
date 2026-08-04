import * as Accordion from '@radix-ui/react-accordion';
import { ArrowRight } from 'lucide-react';
import { faqs } from './data';

const Faq = () => {
  return (
    <>
      <section className=" m-auto text-white py-10">
        <div className="w-4/5 mx-auto px-4">
          <h2 className="md:text-3xl text-2xl font-semibold mb-6">FAQs</h2>
          <Accordion.Root
            collapsible
            className="space-y-2 border p-6 w-full rounded-2xl"
            type="single"
          >
            {faqs.map((faq, i) => (
              <Accordion.Item
                key={i}
                className="border border-white/10 rounded-lg px-4 py-3"
                value={`item-${i}`}
              >
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between text-left text-white text-base font-semibold">
                    {faq.question}
                    <span className="transition-transform border text-[#F2AFC9] rounded-full p-2 duration-300 group-data-[state=open]:rotate-90">
                      <ArrowRight size={13} />
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="mt-2 text-sm text-white/80 data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                  {faq.answer}
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </section>
    </>
  );
};

export default Faq;
