const fs = require('fs');
const file = 'src/components/instructor/CurriculumOrganizer.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `  const handleSaveCurriculum = () => {
    if (onSave) onSave(modules);
    showNotification('Curriculum order saved successfully!');
  };`;
  
const replacementStr = `  const [isSavingCurriculum, setIsSavingCurriculum] = useState(false);
  const handleSaveCurriculum = async () => {
    setIsSavingCurriculum(true);
    if (onSave) onSave(modules);
    
    if (courseId) {
      try {
        for (let i = 0; i < modules.length; i++) {
          const mod = modules[i];
          await upsertModuleApi({
            id: mod.id,
            course_id: courseId,
            title: mod.title,
            description: mod.description,
            order_index: i,
            lessons: mod.lessons.map((l, lIdx) => ({
              ...l,
              order_index: lIdx
            }))
          });
        }
        showNotification('Curriculum structure saved to database!');
      } catch (err) {
        console.error('Failed to save curriculum to API:', err);
        showNotification('Error saving curriculum to database.', 'error');
      }
    } else {
      showNotification('Curriculum order saved locally (draft)!');
    }
    
    setIsSavingCurriculum(false);
  };`;
  
content = content.replace(targetStr, replacementStr);
content = content.replace('onClick={handleSaveCurriculum}', 'onClick={handleSaveCurriculum}\n              disabled={isSavingCurriculum}');
content = content.replace('onClick={handleSaveCurriculum}', 'onClick={handleSaveCurriculum}\n            disabled={isSavingCurriculum}');
fs.writeFileSync(file, content);
console.log('Fixed CurriculumOrganizer handleSaveCurriculum');
