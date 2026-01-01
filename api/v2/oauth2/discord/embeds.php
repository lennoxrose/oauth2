<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'env.php';
require_once 'db.php';

// API Authentication
$api_secret = env('API_SECRET');
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if (!$auth_header || $auth_header !== 'Bearer ' . $api_secret) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized - Invalid API key']);
    exit;
}

$db = $pdo;
$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['REQUEST_URI'];

// Extract embed ID if present
$embedId = null;
if (preg_match('/\/embeds\/(\d+)/', $path, $matches)) {
    $embedId = (int)$matches[1];
}

// GET - List all embeds or get specific embed
if ($method === 'GET') {
    if ($embedId) {
        // Get specific embed
        $stmt = $db->prepare("SELECT * FROM embeds WHERE id = ?");
        $stmt->execute([$embedId]);
        $embed = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($embed) {
            $embed['timestamp'] = (bool)$embed['timestamp'];
            $embed['fields'] = $embed['fields'] ? json_decode($embed['fields'], true) : [];
            echo json_encode($embed);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Embed not found']);
        }
    } else {
        // Get all embeds
        $stmt = $db->query("SELECT * FROM embeds ORDER BY created_at DESC");
        $embeds = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($embeds as &$embed) {
            $embed['timestamp'] = (bool)$embed['timestamp'];
            $embed['fields'] = $embed['fields'] ? json_decode($embed['fields'], true) : [];
        }
        
        echo json_encode(['embeds' => $embeds]);
    }
}

// POST - Create new embed
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Name is required']);
        exit;
    }
    
    $name = trim($input['name']);
    $description = $input['description'] ?? null;
    $color = $input['color'] ?? '#000000';
    $title = $input['title'] ?? null;
    $title_url = $input['title_url'] ?? null;
    $footer_text = $input['footer_text'] ?? null;
    $footer_icon_url = $input['footer_icon_url'] ?? null;
    $timestamp = isset($input['timestamp']) ? (bool)$input['timestamp'] : false;
    $author_name = $input['author_name'] ?? null;
    $author_icon_url = $input['author_icon_url'] ?? null;
    $author_url = $input['author_url'] ?? null;
    $image_url = $input['image_url'] ?? null;
    $thumbnail_url = $input['thumbnail_url'] ?? null;
    $fields = isset($input['fields']) ? json_encode($input['fields']) : null;
    
    try {
        $stmt = $db->prepare("
            INSERT INTO embeds (
                name, description, color, title, title_url, 
                footer_text, footer_icon_url, timestamp,
                author_name, author_icon_url, author_url,
                image_url, thumbnail_url, fields
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $name, $description, $color, $title, $title_url,
            $footer_text, $footer_icon_url, $timestamp ? 1 : 0,
            $author_name, $author_icon_url, $author_url,
            $image_url, $thumbnail_url, $fields
        ]);
        
        $newId = $db->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'id' => $newId,
            'message' => 'Embed created successfully'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create embed: ' . $e->getMessage()]);
    }
}

// PUT - Update embed
elseif ($method === 'PUT' && $embedId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $updates = [];
    $params = [];
    
    $allowedFields = [
        'name', 'description', 'color', 'title', 'title_url',
        'footer_text', 'footer_icon_url', 'timestamp',
        'author_name', 'author_icon_url', 'author_url',
        'image_url', 'thumbnail_url'
    ];
    
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $input)) {
            $updates[] = "$field = ?";
            if ($field === 'timestamp') {
                $params[] = (bool)$input[$field] ? 1 : 0;
            } else {
                $params[] = $input[$field];
            }
        }
    }
    
    if (isset($input['fields'])) {
        $updates[] = "fields = ?";
        $params[] = json_encode($input['fields']);
    }
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['error' => 'No fields to update']);
        exit;
    }
    
    $params[] = $embedId;
    
    try {
        $stmt = $db->prepare("UPDATE embeds SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => 'Embed updated successfully'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update embed: ' . $e->getMessage()]);
    }
}

// DELETE - Delete embed
elseif ($method === 'DELETE' && $embedId) {
    try {
        $stmt = $db->prepare("DELETE FROM embeds WHERE id = ?");
        $stmt->execute([$embedId]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Embed deleted successfully'
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Embed not found']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete embed: ' . $e->getMessage()]);
    }
}

else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
