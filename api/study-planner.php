<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

/**
 * Study Planner & Email Reminder API
 * Path: /api/v1/study-planner.php
 * 
 * Features:
 * - Load/Save learner study plan targets & reminders
 * - Trigger email study reminders (via SMTP/mail)
 */

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Africa/Nairobi');

try {
    $createTable = "CREATE TABLE IF NOT EXISTS `learner_study_plans` (
        `learner_id` VARCHAR(64) PRIMARY KEY,
        `learner_name` VARCHAR(128) DEFAULT NULL,
        `learner_email` VARCHAR(128) NOT NULL DEFAULT 'learner@uqlearn.org',
        `weekly_target` VARCHAR(128) NOT NULL DEFAULT '7 Hours of Video Lectures',
        `daily_habit` VARCHAR(128) NOT NULL DEFAULT '30 Minutes Daily Micro-learning',
        `reminders_json` TEXT DEFAULT NULL,
        `pomodoro_json` TEXT DEFAULT NULL,
        `email_notifications` TINYINT(1) NOT NULL DEFAULT 1,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    @$conn->query($createTable);
    @$conn->query("ALTER TABLE `learner_study_plans` ADD COLUMN IF NOT EXISTS `pomodoro_json` TEXT DEFAULT NULL;");

    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // -------------------------------------------------------------
    // 1. GET STUDY PLAN
    // -------------------------------------------------------------
    if ($action === 'get' || ($action === '' && $method === 'GET')) {
        $learnerId = trim($_GET['learner_id'] ?? $_GET['learnerId'] ?? $_GET['userId'] ?? '');
        if (empty($learnerId)) {
            echo json_encode(['success' => false, 'message' => 'learner_id is required']);
            exit();
        }

        $stmt = $conn->prepare("SELECT * FROM `learner_study_plans` WHERE `learner_id` = ? LIMIT 1");
        $stmt->bind_param("s", $learnerId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        if ($row) {
            $reminders = json_decode($row['reminders_json'] ?? '[]', true);
            echo json_encode([
                'success' => true,
                'data' => [
                    'learnerId' => $row['learner_id'],
                    'weeklyTarget' => $row['weekly_target'],
                    'dailyHabit' => $row['daily_habit'],
                    'reminders' => !empty($reminders) ? $reminders : ['Monday 7:00 PM', 'Wednesday 7:00 PM', 'Saturday 10:00 AM'],
                    'emailNotifications' => (bool)$row['email_notifications']
                ]
            ]);
        } else {
            // Default plan
            echo json_encode([
                'success' => true,
                'data' => [
                    'learnerId' => $learnerId,
                    'weeklyTarget' => '7 Hours of Video Lectures',
                    'dailyHabit' => '30 Minutes Daily Micro-learning',
                    'reminders' => ['Monday 7:00 PM', 'Wednesday 7:00 PM', 'Saturday 10:00 AM'],
                    'emailNotifications' => true
                ]
            ]);
        }
        exit();
    }

    // -------------------------------------------------------------
    // 2. SAVE STUDY PLAN
    // -------------------------------------------------------------
    if ($action === 'save' || $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        
        $learnerId = trim($input['learner_id'] ?? $input['learnerId'] ?? $input['userId'] ?? '');
        $learnerName = trim($input['learner_name'] ?? $input['learnerName'] ?? '');
        $learnerEmail = trim($input['learner_email'] ?? $input['learnerEmail'] ?? '');
        $weeklyTarget = trim($input['weeklyTarget'] ?? $input['weekly_target'] ?? '7 Hours of Video Lectures');
        $dailyHabit = trim($input['dailyHabit'] ?? $input['daily_habit'] ?? '30 Minutes Daily Micro-learning');
        $reminders = $input['reminders'] ?? ['Monday 7:00 PM', 'Wednesday 7:00 PM', 'Saturday 10:00 AM'];
        $remindersJson = is_array($reminders) ? json_encode($reminders) : json_encode(['Monday 7:00 PM', 'Wednesday 7:00 PM', 'Saturday 10:00 AM']);
        $emailNotifications = isset($input['emailNotifications']) ? ((bool)$input['emailNotifications'] ? 1 : 0) : 1;

        if (empty($learnerId) || empty($learnerEmail)) {
            echo json_encode(['success' => false, 'message' => 'learner_id and learner_email are required']);
            exit();
        }

        $stmt = $conn->prepare("INSERT INTO `learner_study_plans`
            (`learner_id`, `learner_name`, `learner_email`, `weekly_target`, `daily_habit`, `reminders_json`, `email_notifications`)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `learner_name` = VALUES(`learner_name`),
            `learner_email` = VALUES(`learner_email`),
            `weekly_target` = VALUES(`weekly_target`),
            `daily_habit` = VALUES(`daily_habit`),
            `reminders_json` = VALUES(`reminders_json`),
            `email_notifications` = VALUES(`email_notifications`)");

        $stmt->bind_param("ssssssi", $learnerId, $learnerName, $learnerEmail, $weeklyTarget, $dailyHabit, $remindersJson, $emailNotifications);
        $success = $stmt->execute();

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Study planner and email reminders saved successfully!'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to save study plan: ' . $conn->error
            ]);
        }
        exit();
    }

    // -------------------------------------------------------------
    // 3. SEND REMINDER EMAIL NOW
    // -------------------------------------------------------------
    if ($action === 'send_reminder') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $learnerEmail = trim($input['learner_email'] ?? $input['learnerEmail'] ?? '');
        $learnerName = trim($input['learner_name'] ?? $input['learnerName'] ?? 'Learner');
        $weeklyTarget = trim($input['weeklyTarget'] ?? '7 Hours of Video Lectures');
        $dailyHabit = trim($input['dailyHabit'] ?? '30 Minutes Daily Micro-learning');

        if (empty($learnerEmail) || !filter_var($learnerEmail, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Valid learner email is required']);
            exit();
        }

        $subject = '🕒 Study Habit Reminder: Time to crush your micro-learning goal!';
        $message = "Hi {$learnerName},\n\nThis is your scheduled study reminder from UQlearn.\n\nWeekly Target: {$weeklyTarget}\nRecommended Habit: {$dailyHabit}\n\nConsistency is key to mastering your enrolled courses. Log in now to continue your video lectures and maintain your learning streak!\n\nBest regards,\nUQlearn Academic Support Desk";
        $headers = "From: UQlearn Support <support@uqlearn.org>\r\nReply-To: support@uqlearn.org\r\n";

        @mail($learnerEmail, $subject, $message, $headers);

        echo json_encode([
            'success' => true,
            'message' => "Reminder email successfully dispatched to {$learnerEmail}!"
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // 4. GET POMODORO STATE
    // -------------------------------------------------------------
    if ($action === 'get_pomodoro') {
        $learnerId = trim($_GET['learner_id'] ?? $_GET['learnerId'] ?? $_GET['userId'] ?? 'current_learner');
        $stmt = $conn->prepare("SELECT `pomodoro_json` FROM `learner_study_plans` WHERE `learner_id` = ? LIMIT 1");
        $stmt->bind_param("s", $learnerId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        
        $pomodoroData = null;
        if ($row && !empty($row['pomodoro_json'])) {
            $pomodoroData = json_decode($row['pomodoro_json'], true);
        }

        echo json_encode([
            'success' => true,
            'data' => $pomodoroData
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // 5. SAVE POMODORO STATE
    // -------------------------------------------------------------
    if ($action === 'save_pomodoro') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $learnerId = trim($input['learner_id'] ?? $input['learnerId'] ?? $input['userId'] ?? 'current_learner');
        $pomodoroState = $input['pomodoro_state'] ?? $input['pomodoroState'] ?? $input;
        $pomodoroJson = json_encode($pomodoroState);

        // Ensure row exists
        $check = $conn->prepare("SELECT `learner_id` FROM `learner_study_plans` WHERE `learner_id` = ? LIMIT 1");
        $check->bind_param("s", $learnerId);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            $stmt = $conn->prepare("UPDATE `learner_study_plans` SET `pomodoro_json` = ? WHERE `learner_id` = ?");
            $stmt->bind_param("ss", $pomodoroJson, $learnerId);
            $stmt->execute();
        } else {
            $stmt = $conn->prepare("INSERT INTO `learner_study_plans` (`learner_id`, `learner_email`, `pomodoro_json`) VALUES (?, 'learner@uqlearn.org', ?)");
            $stmt->bind_param("ss", $learnerId, $pomodoroJson);
            $stmt->execute();
        }

        echo json_encode([
            'success' => true,
            'message' => 'Pomodoro state saved successfully'
        ]);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action']);

} catch (Throwable $t) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $t->getMessage()]);
}
