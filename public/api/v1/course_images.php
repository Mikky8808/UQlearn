<?php
require_once __DIR__ . '/cors.php';
/**
 * Course Images Status API — Per Instructor
 * LMS Platform
 *
 * Path: /api/v1/course_images.php
 *
 * Primary use case:
 *   Given an instructor ID, return their courses that are missing/broken images
 *   so the admin or instructor dashboard can highlight and prompt updates.
 *
 * Usage:
 *   GET /api/v1/course_images.php?created_by=user-42
 *       -> Default: returns ONLY problem courses (missing/broken/empty) for that instructor
 *
 *   GET /api/v1/course_images.php?created_by=user-42&include_ok=1
 *       -> Returns ALL of that instructor's courses, each with a status field
 *
 *   GET /api/v1/course_images.php?created_by=user-42&filter=missing
 *       -> Only courses whose image is 404 / file not found
 *
 *   GET /api/v1/course_images.php?created_by=user-42&filter=empty
 *       -> Only courses that never had an image uploaded
 *
 *   GET /api/v1/course_images.php?created_by=user-42&filter=broken
 *       -> Only courses whose image exists but is unreadable / not an image
 *
 *   GET /api/v1/course_images.php?created_by=user-42&include_ok=1&check_remote=0
 *       -> Fast mode: skip HTTP HEAD checks (DB-only), statuses limited to empty/ok
 *
 *   GET /api/v1/course_images.php?id=course-123
 *       -> Single course check (still scoped to created_by if provided)
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function checkRemoteImage(string $url, int $timeout = 5): array
{
    $result = [
        'ok' => false,
        'http_code' => 0,
        'content_type' => null,
        'content_length' => null,
        'error' => null,
    ];

    if (!function_exists('curl_init')) {
        $result['error'] = 'cURL extension not available';
        return $result;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_NOBODY => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => max(1, $timeout),
        CURLOPT_CONNECTTIMEOUT => max(1, $timeout),
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_USERAGENT => 'LMS-ImageStatusChecker/1.0',
    ]);

    curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $contentLength = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);

    if ($errno !== 0 || $httpCode === 0 || $httpCode >= 400) {
        curl_setopt($ch, CURLOPT_NOBODY, false);
        curl_setopt($ch, CURLOPT_RANGE, '0-0');
        curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $contentLength = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
    }

    curl_close($ch);

    $result['http_code'] = $httpCode;
    $result['content_type'] = $contentType ?: null;
    $result['content_length'] = is_numeric($contentLength) && $contentLength > 0 ? (int) $contentLength : null;

    if ($errno !== 0) {
        $result['error'] = 'cURL error ' . $errno . ': ' . $error;
        return $result;
    }

    $result['ok'] = ($httpCode >= 200 && $httpCode < 400) && (
        $result['content_type'] === null || stripos($result['content_type'], 'image/') === 0
    );

    if ($httpCode >= 400) {
        $result['error'] = 'HTTP ' . $httpCode;
    } elseif ($result['content_type'] !== null && stripos($result['content_type'], 'image/') !== 0) {
        $result['error'] = 'Not an image (Content-Type: ' . $result['content_type'] . ')';
        $result['ok'] = false;
    }

    return $result;
}

function getImageDimensions(string $url): array
{
    try {
        $info = @getimagesize($url);
        if ($info && isset($info[0], $info[1])) {
            return [(int) $info[0], (int) $info[1]];
        }
    } catch (\Throwable $e) {
    }
    return [null, null];
}

function resolveImageSource(?string $image): array
{
    $image = trim((string) $image);

    if ($image === '') {
        return ['source' => null, 'kind' => 'empty', 'is_remote' => false];
    }

    if (preg_match('#^https?://#i', $image)) {
        return ['source' => $image, 'kind' => 'remote', 'is_remote' => true];
    }

    if (strpos($image, '//') === 0) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https:' : 'http:';
        return ['source' => $scheme . $image, 'kind' => 'remote', 'is_remote' => true];
    }

    if (strpos($image, '/') === 0) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return ['source' => $scheme . '://' . $host . $image, 'kind' => 'remote', 'is_remote' => true];
    }

    $local = __DIR__ . '/' . ltrim($image, './');
    return ['source' => $local, 'kind' => 'local', 'is_remote' => false];
}

/**
 * Best-effort lookup of a user's display name and email from whatever
 * users-like table exists. Returns ['name'=>..., 'email'=>...] or nulls.
 */
function resolveInstructor(mysqli $conn, string $uid): array
{
    $uid = trim($uid);
    if ($uid === '') {
        return ['name' => null, 'email' => null];
    }

    $candidates = ['users', 'instructors', 'accounts', 'admin_users'];
    foreach ($candidates as $tbl) {
        $chk = $conn->query("SHOW TABLES LIKE '" . $conn->real_escape_string($tbl) . "'");
        if (!$chk || $chk->num_rows === 0) {
            continue;
        }

        // Find id column
        $idCol = null;
        foreach (['id', 'user_id', 'uid'] as $c) {
            $colChk = $conn->query("SHOW COLUMNS FROM `$tbl` LIKE '" . $conn->real_escape_string($c) . "'");
            if ($colChk && $colChk->num_rows > 0) {
                $idCol = $c;
                break;
            }
        }
        if (!$idCol) {
            continue;
        }

        // Find name + email columns
        $nameCol = null;
        foreach (['full_name', 'name', 'display_name', 'first_name'] as $c) {
            $colChk = $conn->query("SHOW COLUMNS FROM `$tbl` LIKE '" . $conn->real_escape_string($c) . "'");
            if ($colChk && $colChk->num_rows > 0) {
                $nameCol = $c;
                break;
            }
        }
        $emailCol = null;
        foreach (['email', 'email_address', 'user_email'] as $c) {
            $colChk = $conn->query("SHOW COLUMNS FROM `$tbl` LIKE '" . $conn->real_escape_string($c) . "'");
            if ($colChk && $colChk->num_rows > 0) {
                $emailCol = $c;
                break;
            }
        }

        $selectParts = ["`$idCol` AS id"];
        if ($nameCol)  $selectParts[] = "`$nameCol` AS name";
        if ($emailCol) $selectParts[] = "`$emailCol` AS email";

        $safe = $conn->real_escape_string($uid);
        $q = $conn->query("SELECT " . implode(", ", $selectParts) . " FROM `$tbl` WHERE `$idCol` = '$safe' LIMIT 1");
        if ($q && $q->num_rows > 0) {
            $row = $q->fetch_assoc();
            return [
                'name' => $row['name'] ?? null,
                'email' => $row['email'] ?? null,
            ];
        }
    }

    return ['name' => null, 'email' => null];
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

try {
    require_once __DIR__ . '/db.php';

    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new \RuntimeException('Database connection not available.');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed. Use GET."]);
        if ($conn instanceof mysqli) $conn->close();
        exit();
    }

    // ---- params ----
    $instructorId   = isset($_GET['created_by']) ? trim((string) $_GET['created_by'])
                    : (isset($_GET['createdBy']) ? trim((string) $_GET['createdBy'])
                    : (isset($_GET['instructor_id']) ? trim((string) $_GET['instructor_id']) : ''));
    $courseId       = isset($_GET['id']) ? trim((string) $_GET['id'])
                    : (isset($_GET['course_id']) ? trim((string) $_GET['course_id']) : '');
    $filter         = isset($_GET['filter']) ? strtolower(trim((string) $_GET['filter'])) : '';
    $includeOk      = isset($_GET['include_ok']) && ($_GET['include_ok'] === '1' || $_GET['include_ok'] === 'true');
    $checkRemote    = !(isset($_GET['check_remote']) && ($_GET['check_remote'] === '0' || $_GET['check_remote'] === 'false'));
    $timeout        = isset($_GET['timeout']) ? max(1, (int) $_GET['timeout']) : 5;
    $includeDeleted = isset($_GET['include_deleted']) && ($_GET['include_deleted'] === '1' || $_GET['include_deleted'] === 'true');
    $limit          = isset($_GET['limit']) ? max(1, (int) $_GET['limit']) : 500;
    $offset         = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;

    // ---- validate: require either instructorId or courseId ----
    if ($instructorId === '' && $courseId === '') {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Provide ?created_by=<instructorId> (recommended) or ?id=<courseId>.",
        ]);
        if ($conn instanceof mysqli) $conn->close();
        exit();
    }

    // ---- table check ----
    $tblCheck = $conn->query("SHOW TABLES LIKE 'courses'");
    if (!$tblCheck || $tblCheck->num_rows === 0) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Courses table not found in database."]);
        if ($conn instanceof mysqli) $conn->close();
        exit();
    }

    // ---- build WHERE ----
    $where = [];
    if ($instructorId !== '') {
        $safe = $conn->real_escape_string($instructorId);
        // Also check creator_id or instructor column if needed
        $where[] = "(created_by = '$safe' OR (created_by IS NULL AND id LIKE '%$safe%'))";
    }
    if ($courseId !== '') {
        $safe = $conn->real_escape_string($courseId);
        $where[] = "id = '$safe'";
    }
    if (!$includeDeleted) {
        // Safe check if is_deleted column exists
        $delColChk = $conn->query("SHOW COLUMNS FROM `courses` LIKE 'is_deleted'");
        if ($delColChk && $delColChk->num_rows > 0) {
            $where[] = "(is_deleted IS NULL OR is_deleted = 0)";
        }
    }

    $whereClause = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

    $sql = "SELECT id, title, image, instructor, created_by, is_published, created_at
            FROM courses
            $whereClause
            ORDER BY created_at DESC
            LIMIT $limit OFFSET $offset";

    $res = $conn->query($sql);
    if (!$res) {
        // Fallback without created_at if not present
        $sql = "SELECT id, title, image, instructor, created_by, is_published
                FROM courses
                $whereClause
                LIMIT $limit OFFSET $offset";
        $res = $conn->query($sql);
        if (!$res) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Query failed: " . $conn->error]);
            if ($conn instanceof mysqli) $conn->close();
            exit();
        }
    }

    // ---- instructor enrichment ----
    $instructor = ['name' => null, 'email' => null];
    if ($instructorId !== '') {
        $instructor = resolveInstructor($conn, $instructorId);
    }

    // ---- iterate courses ----
    $rows = [];
    $summary = [
        'totalCourses' => 0,
        'ok' => 0,
        'missing' => 0,
        'broken' => 0,
        'empty' => 0,
        'skipped' => 0,
        'problemCourseCount' => 0,
    ];

    while ($row = $res->fetch_assoc()) {
        $image = $row['image'] ?? '';
        $resolved = resolveImageSource($image);

        $status = 'empty';
        $httpCode = null;
        $contentType = null;
        $fileSize = null;
        $width = null;
        $height = null;
        $error = null;

        if ($resolved['source'] === null) {
            $status = 'empty';
        } elseif ($resolved['is_remote']) {
            if ($checkRemote) {
                $check = checkRemoteImage($resolved['source'], $timeout);
                $httpCode = $check['http_code'] ?: null;
                $contentType = $check['content_type'];
                $fileSize = $check['content_length'];
                $error = $check['error'];

                if ($check['ok']) {
                    $status = 'ok';
                    [$width, $height] = getImageDimensions($resolved['source']);
                } elseif ($httpCode === 404) {
                    $status = 'missing';
                } else {
                    $status = 'broken';
                }
            } else {
                $status = 'skipped';
            }
        } else {
            if (is_file($resolved['source'])) {
                $status = 'ok';
                $fileSize = @filesize($resolved['source']) ?: null;
                $mime = @mime_content_type($resolved['source']);
                $contentType = $mime ?: null;
                [$width, $height] = getImageDimensions($resolved['source']);
            } else {
                $status = 'missing';
                $error = 'Local file not found';
            }
        }

        // Apply filter (explicit filter overrides the include_ok default)
        $isProblem = in_array($status, ['missing', 'broken', 'empty'], true);

        $pass = true;
        if ($filter !== '' && $filter !== 'all') {
            switch ($filter) {
                case 'ok':      $pass = ($status === 'ok'); break;
                case 'missing': $pass = ($status === 'missing'); break;
                case 'broken':  $pass = ($status === 'broken'); break;
                case 'empty':   $pass = ($status === 'empty'); break;
                case 'problem':
                case 'invalid': $pass = $isProblem; break;
                default:        $pass = true;
            }
        } elseif (!$includeOk) {
            // Default behavior: only problems
            $pass = $isProblem;
        }

        // Always count toward summary (based on the raw status),
        // regardless of whether we return the row.
        $summary['totalCourses']++;
        if (isset($summary[$status])) {
            $summary[$status]++;
        }
        if ($isProblem) {
            $summary['problemCourseCount']++;
        }

        if (!$pass) {
            continue;
        }

        $rows[] = [
            'courseId' => $row['id'],
            'title' => $row['title'],
            'image' => $image,
            'resolvedSource' => $resolved['source'],
            'sourceKind' => $resolved['kind'],
            'status' => $status,
            'httpCode' => $httpCode,
            'contentType' => $contentType,
            'fileSize' => $fileSize,
            'width' => $width,
            'height' => $height,
            'error' => $error,
            'createdBy' => $row['created_by'] ?? null,
            'instructor' => $row['instructor'] ?? null,
            'isPublished' => (bool) ($row['is_published'] ?? false),
            'createdAt' => $row['created_at'] ?? null,
        ];
    }

    // ---- response ----
    $payload = [
        "success" => true,
        "instructorId" => $instructorId !== '' ? $instructorId : null,
        "instructorName" => $instructor['name'],
        "instructorEmail" => $instructor['email'],
        "needsAttention" => $summary['problemCourseCount'] > 0,
        "summary" => $summary,
        "filters" => [
            "filter" => $filter ?: ($includeOk ? 'all' : 'problem'),
            "includeOk" => $includeOk,
            "checkRemote" => $checkRemote,
            "includeDeleted" => $includeDeleted,
            "courseId" => $courseId ?: null,
        ],
        "count" => count($rows),
        "data" => $rows,
    ];

    if ($instructorId !== '' && $courseId === '') {
        $payload['message'] = $summary['problemCourseCount'] > 0
            ? "Instructor has {$summary['problemCourseCount']} course(s) with image issues."
            : "All of this instructor's course images look good.";
    }

    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($conn instanceof mysqli) $conn->close();
    exit();

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unhandled course_images API exception: " . $err->getMessage(),
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
