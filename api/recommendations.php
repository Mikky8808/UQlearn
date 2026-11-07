<?php
require_once __DIR__ . '/cors.php';
/**
 * AI Recommended Courses API - API v1
 * Path: /api/v1/recommendations.php
 * 
 * Analyzes user enrolled courses & categories and suggests relevant courses
 * using algorithmic matching based on course tags, categories, ratings, and outcomes.
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


try {
    require_once __DIR__ . '/db.php';

    $user_id = isset($_GET['user_id']) ? trim($_GET['user_id']) : (isset($_GET['userId']) ? trim($_GET['userId']) : (isset($_POST['user_id']) ? trim($_POST['user_id']) : ''));
    $email = isset($_GET['email']) ? trim($_GET['email']) : (isset($_POST['email']) ? trim($_POST['email']) : '');

    // Fetch user enrolled courses/categories
    $enrolled_categories = [];
    $enrolled_course_ids = [];

    if (!empty($user_id) || !empty($email)) {
        $table_check = $conn->query("SHOW TABLES LIKE 'purchases'");
        if ($table_check && $table_check->num_rows > 0) {
            $stmt = $conn->prepare("SELECT course_id FROM purchases WHERE (user_id = ? OR user_email = ?) AND status = 'completed'");
            if ($stmt) {
                $stmt->bind_param("ss", $user_id, $email);
                $stmt->execute();
                $res = $stmt->get_result();
                if ($res) {
                    while ($row = $res->fetch_assoc()) {
                        $enrolled_course_ids[] = $row['course_id'];
                    }
                }
                $stmt->close();
            }
        }
    }

    if (isset($_GET['categories'])) {
        $cats = explode(',', $_GET['categories']);
        foreach ($cats as $c) {
            $cleanCat = trim($c);
            if (!empty($cleanCat)) {
                $enrolled_categories[] = $cleanCat;
            }
        }
    }

    $courses_query = "SELECT * FROM courses WHERE (is_published = 1 OR is_published IS NULL) AND (is_deleted IS NULL OR is_deleted = 0) AND deleted_at IS NULL";
    $courses_result = $conn->query($courses_query);
    $all_courses = [];
    if ($courses_result) {
        while ($row = $courses_result->fetch_assoc()) {
            if (isset($row['learning_outcomes']) && is_string($row['learning_outcomes'])) {
                $row['learning_outcomes'] = json_decode($row['learning_outcomes'], true) ?: [];
            }
            $all_courses[] = $row;
        }
    }

    $target_tags = [];
    foreach ($all_courses as $c) {
        if (in_array($c['id'], $enrolled_course_ids)) {
            if (!empty($c['category'])) {
                $enrolled_categories[] = $c['category'];
            }
            if (!empty($c['tags'])) {
                $tags = explode(',', $c['tags']);
                foreach ($tags as $t) {
                    $target_tags[] = trim(strtolower($t));
                }
            }
        }
    }
    $enrolled_categories = array_unique(array_filter($enrolled_categories));
    $target_tags = array_unique(array_filter($target_tags));

    $recommendations = [];
    foreach ($all_courses as $c) {
        if (in_array($c['id'], $enrolled_course_ids)) {
            continue;
        }

        $score = 0;
        $match_reasons = [];

        if (in_array($c['category'], $enrolled_categories)) {
            $score += 50;
            $match_reasons[] = "Matches your enrolled category: " . $c['category'];
        }

        if (!empty($c['tags'])) {
            $c_tags = explode(',', $c['tags']);
            $matched_tags = 0;
            foreach ($c_tags as $ct) {
                $clean_tag = trim(strtolower($ct));
                if (in_array($clean_tag, $target_tags)) {
                    $matched_tags++;
                    $score += 25;
                }
            }
            if ($matched_tags > 0) {
                $match_reasons[] = "$matched_tags shared topic tag(s)";
            }
        }

        $rating = isset($c['rating']) ? floatval($c['rating']) : 4.5;
        $score += intval($rating * 5);

        if (empty($match_reasons)) {
            $match_reasons[] = "Top rated in catalog";
            $score += 10;
        }

        $recommendations[] = [
            "course" => $c,
            "score" => $score,
            "match_reasons" => $match_reasons,
            "matchReasons" => $match_reasons,
            "ai_confidence" => min(98, max(75, 60 + $score)),
            "aiConfidence" => min(98, max(75, 60 + $score))
        ];
    }

    usort($recommendations, function($a, $b) {
        return $b['score'] - $a['score'];
    });

    $top_recommendations = array_slice($recommendations, 0, 6);

    echo json_encode([
        "success" => true,
        "user_enrolled_categories" => array_values($enrolled_categories),
        "analyzed_tags" => array_values($target_tags),
        "recommendations" => $top_recommendations
    ]);

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Recommendations API error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>