const fs = require('fs');
const file = 'api/v1/course-modules.php';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `        if ($conn->query($query)) {
            echo json_encode(["success" => true, "message" => "Module saved", "moduleId" => $id]);
        } else {
            echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
        }
        exit();`;
        
const replacementStr = `        if ($conn->query($query)) {
            // Save associated lessons if provided
            if (!empty($input['lessons']) && is_array($input['lessons'])) {
                foreach ($input['lessons'] as $lIdx => $l) {
                    $lesId = !empty($l['id']) ? $conn->real_escape_string($l['id']) : 'les-' . round(microtime(true) * 1000) . '-' . $lIdx;
                    $lesTitle = $conn->real_escape_string($l['title'] ?? 'Lesson ' . ($lIdx + 1));
                    $lesDur = $conn->real_escape_string($l['duration'] ?? '10:00');
                    $lesType = $conn->real_escape_string($l['type'] ?? 'video');
                    $lesVid = $conn->real_escape_string($l['videoUrl'] ?? ($l['video_url'] ?? ''));
                    $lesContent = $conn->real_escape_string($l['content'] ?? '');
                    $lesPrev = !empty($l['isPreview']) ? 1 : 0;
                    
                    $lQuery = "INSERT INTO lessons (id, module_id, title, duration, type, video_url, content, is_preview, order_index)
                                  VALUES ('$lesId', '$id', '$lesTitle', '$lesDur', '$lesType', '$lesVid', '$lesContent', $lesPrev, $lIdx)
                                  ON DUPLICATE KEY UPDATE 
                                  title = '$lesTitle', duration = '$lesDur', type = '$lesType', video_url = '$lesVid', 
                                  content = '$lesContent', is_preview = $lesPrev, order_index = $lIdx";
                    $conn->query($lQuery);
                }
            }
            echo json_encode(["success" => true, "message" => "Module and associated lessons saved", "moduleId" => $id]);
        } else {
            echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
        }
        exit();`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Fixed course-modules.php lessons array');
