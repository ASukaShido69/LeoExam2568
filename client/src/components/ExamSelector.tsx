// client/src/components/ExamSelector.tsx

import React, { useState } from "react";

interface ExamSelectorProps {
  subjects: string[];
  onSelect: (subject: string) => void;
}

const ExamSelector: React.FC<ExamSelectorProps> = ({ subjects, onSelect }) => {
  const [selectedSubject, setSelectedSubject] = useState("");

  const handleSubjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSubject = event.target.value;
    setSelectedSubject(newSubject);
    onSelect(newSubject);
  };

  return (
    <div className="exam-selector-container">
      <select
        value={selectedSubject}
        onChange={handleSubjectChange}
        className="subject-dropdown"
      >
        <option value="">เลือกวิชา...</option>
        {subjects.map((subject) => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ExamSelector;
