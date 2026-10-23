const fs = require('fs');
const file = 'src/components/instructor/CurriculumOrganizer.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /disabled=\{isSavingCurriculum\}\s*disabled=\{isSavingCurriculum\}/g,
  'disabled={isSavingCurriculum}'
);

fs.writeFileSync(file, content);
console.log('Fixed duplicate disabled attribute');
