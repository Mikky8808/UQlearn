<?php
require_once __DIR__ . '/cors.php';
/**
 * LMS Platform Database Models & Schema Definitions
 * Database: uqlearno_lms
 * Host Server: uqlearn.org
 * Path: /api/v1/model.php
 * 
 * This file serves dual purposes:
 * 1. Provides PHP Object-Oriented Model classes representing all database tables and fields.
 * 2. When accessed directly via HTTP GET, returns the complete database schema and table definitions in JSON.
 */

if (!isset($conn) && file_exists(__DIR__ . '/db.php')) {
    require_once __DIR__ . '/db.php';
}

if (basename($_SERVER['PHP_SELF']) === 'model.php' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        "success" => true,
        "database" => "uqlearno_lms",
        "server" => "uqlearn.org",
        "tables" => [
            "users" => [
                "description" => "Platform users (learners, instructors, admins)",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "role" => "ENUM('learner', 'instructor', 'admin')",
                    "first_name" => "VARCHAR(100)",
                    "last_name" => "VARCHAR(100)",
                    "email" => "VARCHAR(191) UNIQUE",
                    "password_hash" => "VARCHAR(255)",
                    "country_code" => "VARCHAR(10)",
                    "phone_number" => "VARCHAR(30)",
                    "preferred_language" => "VARCHAR(10)",
                    "avatar_url" => "VARCHAR(500)",
                    "auth_provider" => "ENUM('email', 'google', 'apple')",
                    "firebase_uid" => "VARCHAR(128)",
                    "agreed_terms" => "TINYINT(1)",
                    "agreed_marketing" => "TINYINT(1)",
                    "is_email_verified" => "TINYINT(1)",
                    "last_login_at" => "DATETIME",
                    "created_at" => "TIMESTAMP",
                    "updated_at" => "TIMESTAMP"
                ]
            ],
            "email_verifications" => [
                "description" => "OTP verification codes for email registration",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "email" => "VARCHAR(191)",
                    "otp_code" => "VARCHAR(10)",
                    "is_used" => "TINYINT(1)",
                    "expires_at" => "DATETIME",
                    "created_at" => "TIMESTAMP"
                ]
            ],
            "settings" => [
                "description" => "System branding and global configuration key-values",
                "fields" => [
                    "setting_key" => "VARCHAR(64) PRIMARY KEY",
                    "setting_value" => "LONGTEXT",
                    "updated_at" => "TIMESTAMP"
                ]
            ],
            "course_categories" => [
                "description" => "Categories for organizing courses",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "name" => "VARCHAR(100) UNIQUE",
                    "slug" => "VARCHAR(120) UNIQUE",
                    "description" => "TEXT",
                    "icon" => "VARCHAR(50)",
                    "color" => "VARCHAR(100)",
                    "order_index" => "INT",
                    "is_active" => "TINYINT(1)",
                    "is_featured" => "TINYINT(1)",
                    "created_at" => "TIMESTAMP",
                    "updated_at" => "TIMESTAMP"
                ]
            ],
            "courses" => [
                "description" => "LMS Courses catalog",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "title" => "VARCHAR(255)",
                    "subtitle" => "TEXT",
                    "description" => "LONGTEXT",
                    "instructor" => "VARCHAR(150)",
                    "instructor_title" => "VARCHAR(150)",
                    "instructor_avatar" => "VARCHAR(255)",
                    "created_by" => "VARCHAR(64)",
                    "category" => "VARCHAR(100)",
                    "level" => "ENUM('Beginner', 'Intermediate', 'Advanced', 'All Levels')",
                    "price" => "DECIMAL(10,2)",
                    "original_price" => "DECIMAL(10,2)",
                    "rating" => "DECIMAL(3,2)",
                    "review_count" => "INT",
                    "learners_enrolled" => "INT",
                    "image" => "TEXT",
                    "duration" => "VARCHAR(50)",
                    "is_published" => "TINYINT(1)",
                    "best_seller" => "TINYINT(1)",
                    "is_deleted" => "TINYINT(1)",
                    "deleted_at" => "DATETIME",
                    "created_at" => "TIMESTAMP",
                    "updated_at" => "TIMESTAMP"
                ]
            ],
            "modules" => [
                "description" => "Course modules (sections)",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "course_id`" => "VARCHAR(64) FOREIGN KEY -> courses(id)",
                    "title" => "VARCHAR(255)",
                    "description" => "TEXT",
                    "order_index" => "INT",
                    "created_at" => "TIMESTAMP"
                ]
            ],
            "lessons" => [
                "description" => "Module lessons (video, article, quiz, audio, scorm)",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "module_id" => "VARCHAR(64) FOREIGN KEY -> modules(id)",
                    "title" => "VARCHAR(255)",
                    "duration" => "VARCHAR(50)",
                    "type" => "ENUM('video', 'article', 'quiz', 'audio', 'scorm')",
                    "video_url" => "VARCHAR(255)",
                    "video_path" => "VARCHAR(500)",
                    "content" => "LONGTEXT",
                    "is_preview" => "TINYINT(1)",
                    "resources" => "LONGTEXT",
                    "order_index" => "INT",
                    "created_at" => "TIMESTAMP"
                ]
            ],
            "learning_outcomes" => [
                "description" => "Key learning outcomes for courses",
                "fields" => [
                    "id" => "INT AUTO_INCREMENT PRIMARY KEY",
                    "course_id" => "VARCHAR(64) FOREIGN KEY -> courses(id)",
                    "outcome" => "TEXT"
                ]
            ],
            "quizzes" => [
                "description" => "Lesson assessments and quizzes",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "lesson_id" => "VARCHAR(64) FOREIGN KEY -> lessons(id)",
                    "title" => "VARCHAR(255)",
                    "description" => "TEXT",
                    "passing_score" => "INT",
                    "time_limit_minutes" => "INT",
                    "max_attempts" => "INT"
                ]
            ],
            "quiz_questions" => [
                "description" => "Questions associated with quizzes",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "quiz_id" => "VARCHAR(64) FOREIGN KEY -> quizzes(id)",
                    "question" => "TEXT",
                    "type" => "VARCHAR(50)",
                    "points" => "INT",
                    "difficulty" => "VARCHAR(50)",
                    "explanation" => "TEXT"
                ]
            ],
            "quiz_options" => [
                "description" => "Multiple choice options for quiz questions",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "question_id" => "VARCHAR(64) FOREIGN KEY -> quiz_questions(id)",
                    "text" => "TEXT",
                    "is_correct" => "TINYINT(1)",
                    "explanation" => "TEXT"
                ]
            ],
            "purchases" => [
                "description" => "Course enrollment and purchase transactions",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "course_id" => "VARCHAR(64) FOREIGN KEY -> courses(id)",
                    "course_title" => "VARCHAR(255)",
                    "amount" => "DECIMAL(10,2)",
                    "payment_method" => "VARCHAR(100)",
                    "date" => "DATE",
                    "status" => "ENUM('success', 'pending', 'refunded')",
                    "created_at" => "TIMESTAMP"
                ]
            ],
            "payment_gateways" => [
                "description" => "Configured payment gateway integrations",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "name" => "VARCHAR(128)",
                    "slug" => "VARCHAR(64)",
                    "logo_url" => "TEXT",
                    "is_active" => "TINYINT(1)",
                    "api_key" => "TEXT",
                    "secret_key" => "TEXT",
                    "environment" => "VARCHAR(32)",
                    "created_at" => "TIMESTAMP",
                    "updated_at" => "TIMESTAMP"
                ]
            ],
            "video_playback_progress" => [
                "description" => "Learner video watch timestamps and completion percentage",
                "fields" => [
                    "id" => "VARCHAR(128) PRIMARY KEY",
                    "user_id" => "VARCHAR(64)",
                    "lesson_id" => "VARCHAR(64)",
                    "course_id`" => "VARCHAR(64)",
                    "current_time" => "FLOAT",
                    "duration" => "FLOAT",
                    "percentage" => "INT",
                    "updated_at" => "TIMESTAMP"
                ]
            ],
            "instructor_compliance" => [
                "description" => "Instructor compliance submissions (videos/docs)",
                "fields" => [
                    "id" => "VARCHAR(64) PRIMARY KEY",
                    "instructor_id" => "VARCHAR(64)",
                    "file_path" => "VARCHAR(512)",
                    "summary" => "TEXT",
                    "status" => "ENUM('pending', 'approved', 'rejected')",
                    "reviewed_at" => "TIMESTAMP",
                    "created_at" => "TIMESTAMP"
                ]
            ]
        ]
    ], JSON_PRETTY_PRINT);
    exit();
}

/**
 * Base Model Class
 */
class BaseModel {
    protected $conn;

    public function __construct($dbConnection = null) {
        global $conn;
        $this->conn = $dbConnection ? $dbConnection : $conn;
    }
}

/**
 * User Model
 */
class User extends BaseModel {
    public $id;
    public $role;
    public $first_name;
    public $last_name;
    public $email;
    public $password_hash;
    public $country_code;
    public $phone_number;
    public $preferred_language;
    public $avatar_url;
    public $auth_provider;
    public $firebase_uid;
    public $agreed_terms;
    public $agreed_marketing;
    public $is_email_verified;
    public $last_login_at;

    public static function findByEmail($email, $conn = null) {
        global $conn;
        $db = $conn ? $conn : (new BaseModel())->conn;
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $res = $stmt->get_result();
        return $res ? $res->fetch_assoc() : null;
    }

    public static function findById($id, $conn = null) {
        global $conn;
        $db = $conn ? $conn : (new BaseModel())->conn;
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
        $stmt->bind_param("s", $id);
        $stmt->execute();
        $res = $stmt->get_result();
        return $res ? $res->fetch_assoc() : null;
    }
}

/**
 * Course Model
 */
class Course extends BaseModel {
    public $id;
    public $title;
    public $subtitle;
    public $description;
    public $instructor;
    public $instructor_title;
    public $instructor_avatar;
    public $created_by;
    public $category;
    public $level;
    public $price;
    public $original_price;
    public $rating;
    public $review_count;
    public $learners_enrolled;
    public $image;
    public $duration;
    public $is_published;
    public $best_seller;
    public $is_deleted;

    public static function all($conn = null) {
        global $conn;
        $db = $conn ? $conn : (new BaseModel())->conn;
        $res = $db->query("SELECT * FROM courses WHERE is_deleted = 0 ORDER BY created_at DESC");
        return $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    }

    public static function findById($id, $conn = null) {
        global $conn;
        $db = $conn ? $conn : (new BaseModel())->conn;
        $stmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
        $stmt->bind_param("s", $id);
        $stmt->execute();
        $res = $stmt->get_result();
        return $res ? $res->fetch_assoc() : null;
    }
}

/**
 * Module Model
 */
class CourseModule extends BaseModel {
    public $id;
    public $course_id;
    public $title;
    public $description;
    public $order_index;
}

/**
 * Lesson Model
 */
class Lesson extends BaseModel {
    public $id;
    public $module_id;
    public $title;
    public $duration;
    public $type;
    public $video_url;
    public $video_path;
    public $content;
    public $is_preview;
    public $resources;
    public $order_index;
}

/**
 * Purchase Model
 */
class Purchase extends BaseModel {
    public $id;
    public $course_id;
    public $course_title;
    public $amount;
    public $payment_method;
    public $date;
    public $status;
}

/**
 * PaymentGateway Model
 */
class PaymentGateway extends BaseModel {
    public $id;
    public $name;
    public $slug;
    public $logo_url;
    public $is_active;
    public $api_key;
    public $secret_key;
    public $environment;
}

/**
 * VideoProgress Model
 */
class VideoProgress extends BaseModel {
    public $id;
    public $user_id;
    public $lesson_id;
    public $course_id;
    public $current_time;
    public $duration;
    public $percentage;
}

/**
 * InstructorCompliance Model
 */
class InstructorCompliance extends BaseModel {
    public $id;
    public $instructor_id;
    public $file_path;
    public $summary;
    public $status;
    public $reviewed_at;
    public $created_at;
}
?>
