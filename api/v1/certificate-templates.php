<?php
require_once __DIR__ . '/cors.php';
/**
 * Certificate Templates API for UQLearn
 * Stores and retrieves certificate templates & styling.
 */

error_reporting(0);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';

function ensureCertificateTemplatesTable($conn) {
    if (!$conn || !($conn instanceof mysqli)) return false;
    try {
        $sql = "CREATE TABLE IF NOT EXISTS `certificate_templates` (
            `id` VARCHAR(128) NOT NULL,
            `name` VARCHAR(255) NOT NULL,
            `primary_color` VARCHAR(32) DEFAULT '#00A3B1',
            `secondary_color` VARCHAR(32) DEFAULT '#5E17EB',
            `accent_color` VARCHAR(32) DEFAULT '#00C853',
            `layout_style` VARCHAR(64) DEFAULT 'uqlearn_standard',
            `tagline` VARCHAR(255) DEFAULT 'LEARN ★ SKILL ★ INNOVATE ★ GROW ★ LEAD',
            `footer_slogan` VARCHAR(255) DEFAULT 'BETTER SKILLS. BRIGHTER FUTURES.',
            `is_default` TINYINT DEFAULT 1,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        $conn->query($sql);

        $res = $conn->query("SELECT COUNT(*) as cnt FROM certificate_templates");
        $row = $res ? $res->fetch_assoc() : ['cnt' => 0];
        if ($row['cnt'] == 0) {
            $conn->query("INSERT INTO certificate_templates (id, name, primary_color, secondary_color, accent_color, layout_style, tagline, footer_slogan, is_default) VALUES ('tpl-default', 'UQLearn Standard Accredited Template', '#00A3B1', '#5E17EB', '#00C853', 'uqlearn_standard', 'LEARN ★ SKILL ★ INNOVATE ★ GROW ★ LEAD', 'BETTER SKILLS. BRIGHTER FUTURES.', 1)");
        }
        return true;
    } catch (Exception $e) {
        return false;
    }
}

if (isset($conn) && $conn instanceof mysqli) {
    ensureCertificateTemplatesTable($conn);
}

$method = $_SERVER['REQUEST_METHOD'];
$jsonStoreFile = __DIR__ . '/../../uploads/certificate_templates.json';

function getTemplatesStore() {
    global $jsonStoreFile;
    if (file_exists($jsonStoreFile)) {
        $data = json_decode(file_get_contents($jsonStoreFile), true);
        if (is_array($data)) return $data;
    }
    return [
        [
            'id' => 'tpl-default',
            'name' => 'UQLearn Standard Accredited Template',
            'primary_color' => '#00A3B1',
            'secondary_color' => '#5E17EB',
            'accent_color' => '#00C853',
            'layout_style' => 'uqlearn_standard',
            'tagline' => 'LEARN ★ SKILL ★ INNOVATE ★ GROW ★ LEAD',
            'footer_slogan' => 'BETTER SKILLS. BRIGHTER FUTURES.',
            'is_default' => true
        ]
    ];
}

function saveTemplatesStore($data) {
    global $jsonStoreFile;
    $dir = dirname($jsonStoreFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    file_put_contents($jsonStoreFile, json_encode($data, JSON_PRETTY_PRINT));
}

if ($method === 'GET') {
    $templates = [];
    if (isset($conn) && $conn instanceof mysqli) {
        $res = $conn->query("SELECT * FROM certificate_templates");
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $row['is_default'] = (bool)$row['is_default'];
                $templates[] = $row;
            }
        }
    }
    if (empty($templates)) {
        $templates = getTemplatesStore();
    }
    echo json_encode(['success' => true, 'templates' => $templates]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? ('tpl-' . time());
    $name = $input['name'] ?? 'Custom Template';
    $primary_color = $input['primary_color'] ?? '#00A3B1';
    $secondary_color = $input['secondary_color'] ?? '#5E17EB';
    $accent_color = $input['accent_color'] ?? '#00C853';
    $layout_style = $input['layout_style'] ?? 'uqlearn_standard';
    $tagline = $input['tagline'] ?? 'LEARN ★ SKILL ★ INNOVATE ★ GROW ★ LEAD';
    $footer_slogan = $input['footer_slogan'] ?? 'BETTER SKILLS. BRIGHTER FUTURES.';
    $is_default = $input['is_default'] ?? 0;

    if (isset($conn) && $conn instanceof mysqli) {
        $stmt = $conn->prepare("INSERT INTO certificate_templates (id, name, primary_color, secondary_color, accent_color, layout_style, tagline, footer_slogan, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), primary_color=VALUES(primary_color), secondary_color=VALUES(secondary_color), accent_color=VALUES(accent_color), layout_style=VALUES(layout_style), tagline=VALUES(tagline), footer_slogan=VALUES(footer_slogan), is_default=VALUES(is_default)");
        if ($stmt) {
            $stmt->bind_param("ssssssssi", $id, $name, $primary_color, $secondary_color, $accent_color, $layout_style, $tagline, $footer_slogan, $is_default);
            $stmt->execute();
            $stmt->close();
        }
    }

    $store = getTemplatesStore();
    $tpl = [
        'id' => $id,
        'name' => $name,
        'primary_color' => $primary_color,
        'secondary_color' => $secondary_color,
        'accent_color' => $accent_color,
        'layout_style' => $layout_style,
        'tagline' => $tagline,
        'footer_slogan' => $footer_slogan,
        'is_default' => $is_default
    ];
    $found = false;
    foreach ($store as &$t) {
        if ($t['id'] === $id) {
            $t = $tpl;
            $found = true;
            break;
        }
    }
    unset($t);
    if (!$found) {
        $store[] = $tpl;
    }
    saveTemplatesStore($store);

    echo json_encode(['success' => true, 'template' => $tpl]);
    exit;
}
