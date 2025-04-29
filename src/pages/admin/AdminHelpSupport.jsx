import React, { useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";

const faqs = [
  {
    question: "How do I log a found item?",
    answer: "You can log a found item by filling out the form in the 'Found Items' section in the 'Items' page.",
  },
  {
    question: "What do I do if a student looks for an item?",
    answer: `1. Navigate to the 'Items' page.<br />
             2. In the search bar, type in the description given by the student.<br />
             3. Once the student confirms the item as theirs, click 'Claim'.`,
  },
  {
    question: "What should I do if I found an item?",
    answer: "Please submit the found item to the Lost and Found Office so it can be logged and returned to its owner.",
  },
];

const FAQAccordion = () => {
  // Changed: Use a Set to track multiple open indices
  const [openIndices, setOpenIndices] = useState(new Set());

  // Changed: Toggle logic to handle multiple indices
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
            className={`cursor-pointer w-full p-3 md:p-4 text-left font-medium text-base md:text-lg flex justify-between items-center transition-colors ${
              // Changed: Check if index is in openIndices
              openIndices.has(index)
                ? "bg-amber-200 text-amber-900"
                : "bg-amber-100 text-amber-800 hover:bg-amber-150"
            }`}
            onClick={() => toggleFAQ(index)}
            // Changed: Update aria-expanded to check openIndices
            aria-expanded={openIndices.has(index)}
            aria-controls={`faq-answer-${index}`}
          >
            <span className="flex-1">{faq.question}</span>
            <span className="ml-4 w-6 h-6 flex items-center justify-center rounded-full bg-amber-300 text-amber-800 transition-transform duration-200 ease-in-out">
              <svg
                className={`w-4 h-4 transform transition-transform duration-200 ${
                  // Changed: Rotate arrow based on openIndices
                  openIndices.has(index) ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          <div
            id={`faq-answer-${index}`}
            className={`transition-all duration-200 ease-in-out overflow-hidden ${
              // Changed: Expand/collapse based on openIndices
              openIndices.has(index) ? "max-h-96 p-3 md:p-4 bg-white text-gray-700" : "max-h-0"
            }`}
            role="region"
            aria-labelledby={`faq-question-${index}`}
          >
            {/* Render the answer safely with line breaks */}
            <p dangerouslySetInnerHTML={{ __html: faq.answer }} />
          </div>
        </div>
      ))}
    </div>
  );
};

function AdminHelp() {
  return (
    <div className="flex min-h-screen bg-amber-50">
      <AdminSidebar className="hidden md:block" /> {/* Hide sidebar on mobile */}
      <div className="flex-1 p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-500 mb-4 md:mb-6">
          HELP & SUPPORT
        </h1>
        <FAQAccordion />
      </div>
    </div>
  );
}

export default AdminHelp;