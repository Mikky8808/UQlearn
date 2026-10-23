const fs = require('fs');
const file = 'src/components/instructor/CourseBuilder.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = "      {activeTab === 'content' && (";
const endStr = "      {/* ========================================================================= */}\n      {/* TAB 3: DYNAMIC ASSESSMENT & QUIZ BUILDER                                  */}";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `      {activeTab === 'content' && (
        <CourseContentBuilder
          allLessons={allLessons}
          selectedLessonId={selectedLessonId}
          setSelectedLessonId={setSelectedLessonId}
          currentLesson={currentLesson}
          handleUpdateCurrentLesson={handleUpdateCurrentLesson}
          handleGenerateAiLessonNotes={handleGenerateAiLessonNotes}
          showNotification={showNotification}
        />
      )}

`;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(file, content);
  console.log('Replaced successfully!');
} else {
  console.log('Could not find boundaries', { startIndex, endIndex });
}
