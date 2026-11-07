<?php
require_once __DIR__ . '/cors.php';

/**
 * UQlearn AI Assistant & Content Generation Backend (PHP / Shared Host)
 * Endpoints: 
 *   /api/v1/ai.php
 *   /api/v1/ai/assistant-explain.php
 *   /api/v1/assistant-explain.php
 */

header("Content-Type: application/json; charset=UTF-8");

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Helper to query active Gemini API Key from MySQL
function get_active_gemini_config() {
    $defaultModel = 'gemini-2.5-flash';
    $apiKey = getenv('GEMINI_API_KEY') ?: '';

    try {
        if (file_exists(__DIR__ . '/db.php')) {
            require_once __DIR__ . '/db.php';
            if (isset($conn) && $conn instanceof mysqli) {
                // Ensure table exists
                $conn->query("CREATE TABLE IF NOT EXISTS `gemini_api_keys` (
                    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
                    `key_name` VARCHAR(255) NOT NULL,
                    `api_key` TEXT NOT NULL,
                    `model_default` VARCHAR(100) DEFAULT 'gemini-2.5-flash',
                    `is_default` TINYINT(1) DEFAULT 0,
                    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Get default active key
                $res = $conn->query("SELECT api_key, model_default FROM gemini_api_keys WHERE is_default = 1 LIMIT 1");
                if ($res && $row = $res->fetch_assoc()) {
                    if (!empty($row['api_key'])) {
                        $apiKey = trim($row['api_key']);
                        if (!empty($row['model_default'])) {
                            $defaultModel = trim($row['model_default']);
                        }
                    }
                }

                // If not found, get most recent
                if (empty($apiKey)) {
                    $res2 = $conn->query("SELECT api_key, model_default FROM gemini_api_keys ORDER BY created_at DESC LIMIT 1");
                    if ($res2 && $row2 = $res2->fetch_assoc()) {
                        if (!empty($row2['api_key'])) {
                            $apiKey = trim($row2['api_key']);
                            if (!empty($row2['model_default'])) {
                                $defaultModel = trim($row2['model_default']);
                            }
                        }
                    }
                }
            }
        }
    } catch (Throwable $e) {
        // Continue with env var or fallback
    }

    return [
        'api_key' => $apiKey,
        'model' => $defaultModel
    ];
}

// Helper to call Google Gemini REST API via cURL
function call_gemini_api($prompt, $apiKey, $model = 'gemini-2.5-flash', $isJson = false) {
    if (empty($apiKey)) {
        return null;
    }

    // Modern Gemini model normalization
    $targetModel = $model;
    if (strpos($targetModel, 'gemini-3.8') !== false) {
        // Fallback to supported 2.5-flash or 1.5-flash if preview alias not available
        $targetModel = 'gemini-2.5-flash';
    }

    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$targetModel}:generateContent?key=" . urlencode($apiKey);

    $payload = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $prompt]
                ]
            ]
        ]
    ];

    if ($isJson) {
        $payload["generationConfig"] = [
            "responseMimeType" => "application/json"
        ];
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            return $data['candidates'][0]['content']['parts'][0]['text'];
        }
    }

    // Try secondary fallback model gemini-1.5-flash if the primary model failed
    if ($targetModel !== 'gemini-1.5-flash') {
        $fallbackUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . urlencode($apiKey);
        $ch2 = curl_init($fallbackUrl);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_POST, true);
        curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch2, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch2, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, true);
        $response2 = curl_exec($ch2);
        $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);

        if ($httpCode2 === 200 && $response2) {
            $data2 = json_decode($response2, true);
            if (isset($data2['candidates'][0]['content']['parts'][0]['text'])) {
                return $data2['candidates'][0]['content']['parts'][0]['text'];
            }
        }
    }

    return null;
}

// Parse request input
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];
if (empty($input)) {
    $input = $_POST;
}

// Action parameter detection
$action = $input['action'] ?? ($_GET['action'] ?? '');
if (empty($action)) {
    // Detect action by path or input keys
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($requestUri, 'assistant-explain') !== false || isset($input['prompt'])) {
        $action = 'assistant-explain';
    } elseif (strpos($requestUri, 'generate-syllabus') !== false || isset($input['topic'])) {
        $action = 'generate-syllabus';
    } elseif (strpos($requestUri, 'generate-lesson-notes') !== false || isset($input['lessonTitle'])) {
        $action = 'generate-lesson-notes';
    } elseif (strpos($requestUri, 'generate-quiz-questions') !== false) {
        $action = 'generate-quiz-questions';
    } else {
        $action = 'assistant-explain';
    }
}

$geminiConfig = get_active_gemini_config();
$apiKey = $geminiConfig['api_key'];
$model = $geminiConfig['model'];

// =========================================================================
// ACTION: assistant-explain (Student Course Player AI Tutor)
// =========================================================================
if ($action === 'assistant-explain') {
    $prompt = trim($input['prompt'] ?? ($input['text'] ?? ($_GET['prompt'] ?? '')));
    $courseTitle = trim($input['courseTitle'] ?? ($input['course_title'] ?? ($_GET['courseTitle'] ?? 'Online Course')));
    $lessonTitle = trim($input['lessonTitle'] ?? ($input['lesson_title'] ?? ($_GET['lessonTitle'] ?? 'Current Lesson')));

    if (empty($prompt)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Prompt is required"]);
        exit();
    }

    $systemPrompt = "You are a knowledgeable, friendly, and expert AI teaching assistant for the course \"{$courseTitle}\". The student is currently studying the lesson \"{$lessonTitle}\".\nAnswer the student's question clearly, pedagogically, and concisely with markdown formatting, code examples if relevant, and practical insights:\n\nStudent Question: {$prompt}";

    $generatedText = call_gemini_api($systemPrompt, $apiKey, $model, false);

    if ($generatedText) {
        echo json_encode([
            "success" => true,
            "answer" => $generatedText,
            "source" => "gemini-api"
        ]);
        exit();
    }

    // High-quality contextual pedagogical fallback
    $fallbackAnswer = "### Explanation regarding \"{$lessonTitle}\"\n\n**{$prompt}** is an essential concept within **{$courseTitle}**.\n\n" .
        "1. **Core Concept**: To understand this effectively, break it down into fundamental principles and trace the execution flow step-by-step.\n" .
        "2. **Best Practice**: Always decouple responsibilities and test edge cases under realistic constraints.\n" .
        "3. **Practical Application**: Try implementing a minimal working example in your code editor or notes.\n\n" .
        "> 💡 **Instructor Tip**: Revisit the lecture video around the key timestamps and practice the hands-on exercise!";

    echo json_encode([
        "success" => true,
        "answer" => $fallbackAnswer,
        "source" => "pedagogical-fallback"
    ]);
    exit();
}

// =========================================================================
// ACTION: generate-syllabus
// =========================================================================
if ($action === 'generate-syllabus') {
    $topic = trim($input['topic'] ?? 'Modern Development');
    $category = trim($input['category'] ?? 'Development');
    $level = trim($input['level'] ?? 'Intermediate');

    $syllabusPrompt = "You are a world-class course architect. Generate a structured JSON curriculum for a course on \"{$topic}\". Category: \"{$category}\", Level: \"{$level}\".\nOutput strictly valid JSON with this exact shape:\n{\n  \"title\": \"Course Title\",\n  \"subtitle\": \"Compelling one sentence subtitle\",\n  \"description\": \"Comprehensive 2-sentence description\",\n  \"learningOutcomes\": [\"Outcome 1\", \"Outcome 2\", \"Outcome 3\", \"Outcome 4\"],\n  \"modules\": [\n    {\n      \"id\": \"mod-1\",\n      \"title\": \"Module 1: Title\",\n      \"description\": \"Brief description\",\n      \"lessons\": [\n        { \"id\": \"les-1\", \"title\": \"Lesson 1 Title\", \"duration\": \"12:00\", \"type\": \"video\" },\n        { \"id\": \"les-2\", \"title\": \"Lesson 2 Title\", \"duration\": \"10:00\", \"type\": \"article\" }\n      ]\n    }\n  ]\n}";

    $generatedJson = call_gemini_api($syllabusPrompt, $apiKey, $model, true);

    if ($generatedJson) {
        $parsed = json_decode($generatedJson, true);
        if ($parsed && isset($parsed['title'])) {
            echo json_encode($parsed);
            exit();
        }
    }

    // Fallback curriculum
    echo json_encode([
        "title" => "{$topic} Masterclass 2026",
        "subtitle" => "Master {$topic} with hands-on architecture patterns and practical workflows.",
        "description" => "A comprehensive curriculum designed to take learners from core primitives to advanced systems in {$topic}.",
        "learningOutcomes" => [
            "Architect resilient systems with {$topic}",
            "Apply industry design patterns and best practices",
            "Build and deploy production-ready capstone projects",
            "Optimize workflow performance and maintainability"
        ],
        "modules" => [
            [
                "id" => "mod-" . time() . "-1",
                "title" => "Module 1: Foundations of {$topic}",
                "description" => "Core fundamentals, mindset, and workspace setup.",
                "lessons" => [
                    ["id" => "les-1", "title" => "1.1 Architectural Overview & Setup", "duration" => "12:00", "type" => "video"],
                    ["id" => "les-2", "title" => "1.2 Essential Tools & Cheatsheet", "duration" => "15:00", "type" => "article"]
                ]
            ],
            [
                "id" => "mod-" . time() . "-2",
                "title" => "Module 2: Advanced Implementation & Capstone",
                "description" => "Real-world project construction and assessment.",
                "lessons" => [
                    ["id" => "les-3", "title" => "2.1 Practical Project Walkthrough", "duration" => "25:00", "type" => "video"],
                    ["id" => "les-4", "title" => "2.2 Capstone Knowledge Check", "duration" => "15:00", "type" => "quiz"]
                ]
            ]
        ]
    ]);
    exit();
}

// =========================================================================
// ACTION: generate-lesson-notes
// =========================================================================
if ($action === 'generate-lesson-notes') {
    $lessonTitle = trim($input['lessonTitle'] ?? 'Lesson Overview');
    $courseTitle = trim($input['courseTitle'] ?? 'Online Course');

    $notesPrompt = "Write a comprehensive, professional educational Markdown article for a course lesson titled \"{$lessonTitle}\" within the course \"{$courseTitle}\". Include learning objectives, code snippet or framework example if relevant, callout quotes, and key takeaways.";

    $notes = call_gemini_api($notesPrompt, $apiKey, $model, false);
    if ($notes) {
        echo json_encode(["markdown" => $notes]);
        exit();
    }

    echo json_encode([
        "markdown" => "# {$lessonTitle}\n\n## Overview\nIn this lesson, you will master key principles and hands-on implementations for **{$courseTitle}**.\n\n### Key Takeaways\n- Master core architectural trade-offs.\n- Implement production-ready design patterns.\n- Follow security, optimization, and validation best practices.\n\n> Pro-Tip: Regular active experimentation is the fastest path to mastery."
    ]);
    exit();
}

// Default 400
http_response_code(400);
echo json_encode(["success" => false, "message" => "Unknown action: {$action}"]);
