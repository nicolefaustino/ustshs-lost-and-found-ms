import React, { useState } from "react";
import StudentSidebar from "../../components/student/StudentSidebar";

const faqs = [
  {
    question: "Who can I contact for support?",
    answer:
      "Please send an email to office.shs@ust.edu.ph.",
  },
  {
    question: "How do I report a lost item?",
    answer:
      "You can report a lost item by filling out the form in the 'Report Item' section.",
  },
  {
    question: "What do I do after reporting a lost item?",
    answer:
      "The UST-SHS Office will automatically send you an email if the system has found a match for your item.",
  },
  {
    question: "Where can I claim an item?",
    answer:
      "Found items can be claimed at the UST-SHS Office on the 8th floor.",
  },
  {
    question: "What should I do if I found an item?",
    answer:
      "Please submit the found item to the UST-SHS Office at the 8th floor so it can be logged and returned to its owner.",
  },
];

const FAQAccordion = () => {
  const [openIndices, setOpenIndices] = useState(new Set());

  const toggleFAQ = (index) => {
    setOpenIndices((prevIndices) => {
      const newIndices = new Set(prevIndices);
      if (newIndices.has(index)) {
        newIndices.delete(index);
      } else {
        newIndices.add(index);
      }
      return newIndices;
    });
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="border border-amber-300 rounded-lg overflow-hidden transition-shadow hover:shadow-md"
        >
          <button
            className={`cursor-pointer w-full p-4 text-left font-medium text-base md:text-lg flex justify-between items-center transition-colors ${
              openIndices.has(index)
                ? "bg-amber-200 text-amber-900"
                : "bg-amber-100 text-amber-800 hover:bg-amber-150"
            }`}
            onClick={() => toggleFAQ(index)}
            aria-expanded={openIndices.has(index)}
            aria-controls={`faq-answer-${index}`}
          >
            <span className="flex-1">{faq.question}</span>
            <span className="ml-4 w-6 h-6 flex items-center justify-center rounded-full bg-amber-300 text-amber-800 transition-transform duration-200 ease-in-out">
              <svg
                className={`w-4 h-4 transform transition-transform duration-200 ${
                  openIndices.has(index) ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </button>
          <div
            id={`faq-answer-${index}`}
            className={`transition-all duration-200 ease-in-out overflow-hidden ${
              openIndices.has(index) ? "max-h-96" : "max-h-0"
            }`}
            role="region"
            aria-labelledby={`faq-question-${index}`}
          >
            <p className="p-4 text-sm md:text-base text-gray-700 bg-white">
              {faq.answer}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

function StudentHelp() {
  return (
    <div className="flex min-h-screen bg-amber-50">
      {/* Sidebar - Hidden on mobile */}
      <StudentSidebar />

      {/* Main Content */}
      <div className="flex-1 h-screen overflow-auto p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-500 mb-6">
          HELP & SUPPORT
        </h1>
        <FAQAccordion />
      </div>
    </div>
  );
}

export default StudentHelp;
