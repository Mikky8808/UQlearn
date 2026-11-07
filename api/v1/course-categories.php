<?php
require_once __DIR__ . '/cors.php';
/**
 * Course Categories API Endpoint (PHP Backend for MySQL)
 * LMS Platform - UQlearn
 * 
 * Path: /api/v1/course-categories.php
 * 
 * Manages course categories in the database with full CRUD, reordering,
 * dynamic course counts, and auto-seeding.
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    // Ensure course_categories table exists
    $createTableSql = "CREATE TABLE IF NOT EXISTS `course_categories` (
        `id` VARCHAR(64) PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL UNIQUE,
        `slug` VARCHAR(120) NOT NULL UNIQUE,
        `description` TEXT DEFAULT NULL,
        `icon` VARCHAR(50) DEFAULT '📚',
        `color` VARCHAR(100) DEFAULT 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
        `order_index` INT DEFAULT 0,
        `is_active` TINYINT(1) DEFAULT 1,
        `is_featured` TINYINT(1) DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_slug` (`slug`),
        INDEX `idx_order` (`order_index`),
        INDEX `idx_active` (`is_active`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    @$conn->query($createTableSql);

    // Auto-seed default categories if empty
    $countRes = $conn->query("SELECT COUNT(*) as total FROM `course_categories`");
    $totalCategories = 0;
    if ($countRes) {
        $cRow = $countRes->fetch_assoc();
        $totalCategories = (int)($cRow['total'] ?? 0);
    }

    if ($totalCategories === 0) {
        $defaults = [
            ['cat-1', 'Development', 'development', 'Software engineering, web apps, backend APIs & cloud architecture', '💻', 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400', 0, 1, 1],
            ['cat-2', 'Data Science', 'data-science', 'Machine learning, AI agents, Python data analysis & deep neural networks', '📊', 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400', 1, 1, 1],
            ['cat-3', 'Design', 'design', 'UI/UX systems, product design, Figma workflows & responsive design', '🎨', 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400', 2, 1, 1],
            ['cat-4', 'Business', 'business', 'Product management, SaaS startups, enterprise strategy & finance', '📈', 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400', 3, 1, 1],
            ['cat-5', 'Marketing', 'marketing', 'Growth hacking, SEO optimization, social campaigns & paid acquisition', '🚀', 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400', 4, 1, 0],
            ['cat-6', 'Personal Growth', 'personal-growth', 'Leadership mastery, productivity habits, communication & public speaking', '🌟', 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400', 5, 1, 0],
        ];

        $seedStmt = $conn->prepare("INSERT INTO `course_categories` (`id`, `name`, `slug`, `description`, `icon`, `color`, `order_index`, `is_active`, `is_featured`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)");
        if ($seedStmt) {
            foreach ($defaults as $d) {
                $seedStmt->bind_param("ssssssiii", $d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7], $d[8]);
                $seedStmt->execute();
            }
            $seedStmt->close();
        }
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // Helper function to build category payload with course count
    function formatCategoryRow($row) {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'slug' => $row['slug'] ?? strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $row['name'])),
            'description' => $row['description'] ?? '',
            'icon' => $row['icon'] ?? '📚',
            'color' => $row['color'] ?? 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
            'orderIndex' => (int)($row['order_index'] ?? 0),
            'order_index' => (int)($row['order_index'] ?? 0),
            'isActive' => (bool)($row['is_active'] ?? 1),
            'is_active' => (bool)($row['is_active'] ?? 1),
            'isFeatured' => (bool)($row['is_featured'] ?? 0),
            'is_featured' => (bool)($row['is_featured'] ?? 0),
            'courseCount' => (int)($row['course_count'] ?? 0),
            'createdAt' => $row['created_at'] ?? date('Y-m-d H:i:s'),
            'updatedAt' => $row['updated_at'] ?? date('Y-m-d H:i:s')
        ];
    }

    // =========================================================================
    // GET: Fetch categories list or single category details
    // =========================================================================
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? trim($_GET['id']) : '';
        $slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
        $includeInactive = isset($_GET['include_inactive']) && ($_GET['include_inactive'] === '1' || $_GET['include_inactive'] === 'true');
        $featuredOnly = isset($_GET['featured_only']) && ($_GET['featured_only'] === '1' || $_GET['featured_only'] === 'true');

        // 1. Single Category by ID or Slug
        if (!empty($id) || !empty($slug)) {
            $whereClause = !empty($id) ? "c.id = '" . $conn->real_escape_string($id) . "'" : "c.slug = '" . $conn->real_escape_string($slug) . "'";
            $sql = "SELECT c.*, 
                           (SELECT COUNT(*) FROM courses cr WHERE cr.category = c.name AND (cr.is_deleted IS NULL OR cr.is_deleted = 0) AND cr.deleted_at IS NULL) as course_count 
                    FROM course_categories c 
                    WHERE $whereClause 
                    LIMIT 1";

            $res = $conn->query($sql);
            if ($res && $res->num_rows > 0) {
                $catRow = $res->fetch_assoc();
                $categoryData = formatCategoryRow($catRow);

                // Fetch attached active courses
                $catNameSafe = $conn->real_escape_string($catRow['name']);
                $coursesSql = "SELECT id, title, subtitle, instructor, price, image, level, duration, rating, review_count, learners_enrolled 
                               FROM courses 
                               WHERE category = '$catNameSafe' AND (is_deleted IS NULL OR is_deleted = 0) AND deleted_at IS NULL 
                               ORDER BY created_at DESC LIMIT 50";
                $coursesRes = $conn->query($coursesSql);
                $coursesList = [];
                if ($coursesRes) {
                    while ($c = $coursesRes->fetch_assoc()) {
                        $coursesList[] = $c;
                    }
                }
                $categoryData['courses'] = $coursesList;

                echo json_encode([
                    "success" => true,
                    "data" => $categoryData
                ], JSON_PRETTY_PRINT);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Course category not found"]);
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // 2. All Categories List
        $where = [];
        if (!$includeInactive) {
            $where[] = "c.is_active = 1";
        }
        if ($featuredOnly) {
            $where[] = "c.is_featured = 1";
        }
        $whereStr = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "SELECT c.*, 
                       (SELECT COUNT(*) FROM courses cr WHERE cr.category = c.name AND (cr.is_deleted IS NULL OR cr.is_deleted = 0) AND cr.deleted_at IS NULL) as course_count 
                FROM course_categories c 
                $whereStr 
                ORDER BY c.order_index ASC, c.name ASC";

        $res = $conn->query($sql);
        $categories = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $categories[] = formatCategoryRow($row);
            }
        }

        echo json_encode([
            "success" => true,
            "total" => count($categories),
            "data" => $categories
        ], JSON_PRETTY_PRINT);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // =========================================================================
    // DELETE: Delete a category
    // =========================================================================
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? trim($_GET['id']) : '';
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);

        if (empty($id) && !empty($input['id'])) {
            $id = trim($input['id']);
        }

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Category ID is required for deletion"]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $idSafe = $conn->real_escape_string($id);

        // Fetch existing category name
        $chk = $conn->query("SELECT name FROM course_categories WHERE id = '$idSafe' LIMIT 1");
        if (!$chk || $chk->num_rows === 0) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Category not found"]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }
        $catName = $chk->fetch_assoc()['name'];
        $catNameSafe = $conn->real_escape_string($catName);

        // Check if courses are currently assigned
        $courseChk = $conn->query("SELECT COUNT(*) as total FROM courses WHERE category = '$catNameSafe' AND (is_deleted IS NULL OR is_deleted = 0)");
        $attachedCourses = 0;
        if ($courseChk) {
            $attachedCourses = (int)($courseChk->fetch_assoc()['total'] ?? 0);
        }

        $reassignTo = !empty($input['reassignTo']) ? trim($input['reassignTo']) : (!empty($_GET['reassignTo']) ? trim($_GET['reassignTo']) : '');
        $force = isset($input['force']) && ($input['force'] === true || $input['force'] === 1);

        if ($attachedCourses > 0 && empty($reassignTo) && !$force) {
            http_response_code(409);
            echo json_encode([
                "success" => false,
                "message" => "Cannot delete category '$catName': $attachedCourses active courses are currently assigned to it.",
                "attachedCourses" => $attachedCourses,
                "categoryName" => $catName,
                "hint" => "Provide 'reassignTo' with a replacement category name or pass force=true to proceed."
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $conn->begin_transaction();
        try {
            if (!empty($reassignTo)) {
                $reassignSafe = $conn->real_escape_string($reassignTo);
                $conn->query("UPDATE courses SET category = '$reassignSafe' WHERE category = '$catNameSafe'");
            }

            $delSql = "DELETE FROM course_categories WHERE id = '$idSafe'";
            $conn->query($delSql);

            $conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Category '$catName' successfully deleted.",
                "deletedId" => $id,
                "reassignedCourses" => $attachedCourses
            ]);
        } catch (\Throwable $e) {
            $conn->rollback();
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // =========================================================================
    // POST / PUT: Create, Update, Reorder, or Batch Sync Categories
    // =========================================================================
    if ($method === 'POST' || $method === 'PUT') {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);

        if (!$input || !is_array($input)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid JSON payload received."]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $action = $input['action'] ?? ($_GET['action'] ?? '');

        // Action 1: Reorder Categories
        if ($action === 'reorder' || $action === 'reorder_categories') {
            $orders = $input['orders'] ?? ($input['categories'] ?? []);
            if (!is_array($orders) || count($orders) === 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Array of category IDs and order indexes required for reordering."]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }

            $conn->begin_transaction();
            try {
                $stmt = $conn->prepare("UPDATE `course_categories` SET `order_index` = ? WHERE `id` = ? OR `name` = ?");
                foreach ($orders as $idx => $item) {
                    $orderVal = isset($item['orderIndex']) ? (int)$item['orderIndex'] : (isset($item['order_index']) ? (int)$item['order_index'] : $idx);
                    $lookupId = $item['id'] ?? ($item['name'] ?? '');
                    $lookupName = $item['name'] ?? ($item['id'] ?? '');
                    if (!empty($lookupId)) {
                        $stmt->bind_param("iss", $orderVal, $lookupId, $lookupName);
                        $stmt->execute();
                    }
                }
                $stmt->close();
                $conn->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Category order updated successfully."
                ]);
            } catch (\Throwable $e) {
                $conn->rollback();
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Reorder failed: " . $e->getMessage()]);
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Action 2: Batch Sync / Upsert array of categories
        if ($action === 'batch_sync' || $action === 'sync' || isset($input['categories'])) {
            $catList = $input['categories'] ?? ($input['payload'] ?? []);
            if (!is_array($catList) || count($catList) === 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Categories array is required for batch sync."]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }

            $conn->begin_transaction();
            try {
                $upsertStmt = $conn->prepare("
                    INSERT INTO `course_categories` 
                    (`id`, `name`, `slug`, `description`, `icon`, `color`, `order_index`, `is_active`, `is_featured`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        `name` = VALUES(`name`),
                        `slug` = VALUES(`slug`),
                        `description` = VALUES(`description`),
                        `icon` = VALUES(`icon`),
                        `color` = VALUES(`color`),
                        `order_index` = VALUES(`order_index`),
                        `is_active` = VALUES(`is_active`),
                        `is_featured` = VALUES(`is_featured`),
                        `updated_at` = NOW()
                ");

                $syncedCount = 0;
                foreach ($catList as $idx => $c) {
                    $cName = trim($c['name'] ?? '');
                    if (empty($cName)) continue;

                    $cId = !empty($c['id']) ? trim($c['id']) : 'cat-' . ($idx + 1);
                    $cSlug = !empty($c['slug']) ? trim($c['slug']) : strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $cName));
                    $cDesc = $c['description'] ?? '';
                    $cIcon = $c['icon'] ?? '📚';
                    $cColor = $c['color'] ?? 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400';
                    $cOrder = isset($c['orderIndex']) ? (int)$c['orderIndex'] : (isset($c['order_index']) ? (int)$c['order_index'] : $idx);
                    $cActive = isset($c['isActive']) ? ((int)$c['isActive'] ? 1 : 0) : (isset($c['is_active']) ? ((int)$c['is_active'] ? 1 : 0) : 1);
                    $cFeatured = isset($c['isFeatured']) ? ((int)$c['isFeatured'] ? 1 : 0) : (isset($c['is_featured']) ? ((int)$c['is_featured'] ? 1 : 0) : 0);

                    $upsertStmt->bind_param("ssssssiii", $cId, $cName, $cSlug, $cDesc, $cIcon, $cColor, $cOrder, $cActive, $cFeatured);
                    $upsertStmt->execute();
                    $syncedCount++;
                }
                $upsertStmt->close();
                $conn->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Successfully synchronized $syncedCount course categories to MySQL database.",
                    "syncedCount" => $syncedCount
                ]);
            } catch (\Throwable $e) {
                $conn->rollback();
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Batch sync failed: " . $e->getMessage()]);
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Action 3: Toggle Active / Inactive Status
        if ($action === 'toggle_status') {
            $catId = $input['id'] ?? ($_GET['id'] ?? '');
            if (empty($catId)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Category ID is required to toggle status."]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }
            $catIdSafe = $conn->real_escape_string($catId);
            $conn->query("UPDATE `course_categories` SET `is_active` = IF(`is_active` = 1, 0, 1) WHERE `id` = '$catIdSafe'");
            
            $chk = $conn->query("SELECT * FROM `course_categories` WHERE `id` = '$catIdSafe'");
            $updatedCat = $chk ? $chk->fetch_assoc() : null;

            echo json_encode([
                "success" => true,
                "message" => "Category status toggled successfully.",
                "data" => $updatedCat ? formatCategoryRow($updatedCat) : null
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Action 4: Single Category Create or Update
        $name = trim($input['name'] ?? '');
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Category 'name' is required."]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $id = !empty($input['id']) ? trim($input['id']) : 'cat-' . bin2hex(random_bytes(4));
        $slug = !empty($input['slug']) ? trim($input['slug']) : strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
        $description = $input['description'] ?? '';
        $icon = $input['icon'] ?? '📚';
        $color = $input['color'] ?? 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400';
        $orderIndex = isset($input['orderIndex']) ? (int)$input['orderIndex'] : (isset($input['order_index']) ? (int)$input['order_index'] : 0);
        $isActive = isset($input['isActive']) ? ($input['isActive'] ? 1 : 0) : (isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1);
        $isFeatured = isset($input['isFeatured']) ? ($input['isFeatured'] ? 1 : 0) : (isset($input['is_featured']) ? ($input['is_featured'] ? 1 : 0) : 0);

        $oldName = !empty($input['oldName']) ? trim($input['oldName']) : '';

        $stmt = $conn->prepare("
            INSERT INTO `course_categories` 
            (`id`, `name`, `slug`, `description`, `icon`, `color`, `order_index`, `is_active`, `is_featured`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `slug` = VALUES(`slug`),
                `description` = VALUES(`description`),
                `icon` = VALUES(`icon`),
                `color` = VALUES(`color`),
                `order_index` = VALUES(`order_index`),
                `is_active` = VALUES(`is_active`),
                `is_featured` = VALUES(`is_featured`),
                `updated_at` = NOW()
        ");

        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Prepare statement error: " . $conn->error]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $stmt->bind_param("ssssssiii", $id, $name, $slug, $description, $icon, $color, $orderIndex, $isActive, $isFeatured);
        $exec = $stmt->execute();
        $stmt->close();

        if ($exec) {
            // If category name was renamed, update references in courses table
            if (!empty($oldName) && $oldName !== $name) {
                $oldSafe = $conn->real_escape_string($oldName);
                $newSafe = $conn->real_escape_string($name);
                $conn->query("UPDATE `courses` SET `category` = '$newSafe' WHERE `category` = '$oldSafe'");
            }

            echo json_encode([
                "success" => true,
                "message" => "Category '$name' saved successfully.",
                "data" => [
                    "id" => $id,
                    "name" => $name,
                    "slug" => $slug,
                    "description" => $description,
                    "icon" => $icon,
                    "color" => $color,
                    "orderIndex" => $orderIndex,
                    "isActive" => (bool)$isActive,
                    "isFeatured" => (bool)$isFeatured
                ]
            ], JSON_PRETTY_PRINT);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database execute error: " . $conn->error]);
        }
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Category API server error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
