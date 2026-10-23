const fs = require('fs');
const file = 'api/v1/course-modules.php';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `        if (empty($courseId)) {
            echo json_encode(["success" => false, "message" => "course_id is required"]);
            exit();
        }`;
        
const replacement = `        if (empty($courseId)) {
            echo json_encode(["success" => false, "message" => "course_id is required"]);
            exit();
        }

        // Ensure course exists (create stub if missing to satisfy foreign key)
        $courseCheck = $conn->query("SELECT id FROM courses WHERE id = '$courseId'");
        if ($courseCheck && $courseCheck->num_rows === 0) {
            $conn->query("INSERT INTO courses (id, title, is_published) VALUES ('$courseId', 'Untitled Course', 0)");
        }`;
        
content = content.replace(targetStr, replacement);
fs.writeFileSync(file, content);
console.log('Fixed course-modules.php');
