<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';
require_once 'db.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['REQUEST_URI'];

// Extract emoji ID if present
$emojiId = null;
if (preg_match('/\/emojis\/(\d+)/', $path, $matches)) {
    $emojiId = (int)$matches[1];
}

// GET - List all emojis or get specific emoji
if ($method === 'GET') {
    if ($emojiId) {
        // Get specific emoji
        $stmt = $db->prepare("SELECT * FROM nitro_emojis WHERE id = ?");
        $stmt->execute([$emojiId]);
        $emoji = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($emoji) {
            $emoji['animated'] = (bool)$emoji['animated'];
            echo json_encode($emoji);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Emoji not found']);
        }
    } else {
        // Get all emojis
        $stmt = $db->query("SELECT * FROM nitro_emojis ORDER BY name ASC");
        $emojis = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($emojis as &$emoji) {
            $emoji['animated'] = (bool)$emoji['animated'];
        }
        
        echo json_encode(['emojis' => $emojis]);
    }
}

// POST - Create new emoji
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['name']) || !isset($input['hash'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Name and hash are required']);
        exit;
    }
    
    $name = trim($input['name']);
    $hash = trim($input['hash']);
    $animated = isset($input['animated']) ? (bool)$input['animated'] : false;
    
    // Validate emoji hash (should be a snowflake ID)
    if (!preg_match('/^\d{17,20}$/', $hash)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid emoji hash format']);
        exit;
    }
    
    try {
        $stmt = $db->prepare("INSERT INTO nitro_emojis (name, hash, animated) VALUES (?, ?, ?)");
        $stmt->execute([$name, $hash, $animated ? 1 : 0]);
        
        $newId = $db->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'id' => $newId,
            'message' => 'Emoji added successfully'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to add emoji: ' . $e->getMessage()]);
    }
}

// PUT - Update emoji
elseif ($method === 'PUT' && $emojiId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $updates = [];
    $params = [];
    
    if (isset($input['name'])) {
        $updates[] = "name = ?";
        $params[] = trim($input['name']);
    }
    
    if (isset($input['hash'])) {
        $hash = trim($input['hash']);
        if (!preg_match('/^\d{17,20}$/', $hash)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid emoji hash format']);
            exit;
        }
        $updates[] = "hash = ?";
        $params[] = $hash;
    }
    
    if (isset($input['animated'])) {
        $updates[] = "animated = ?";
        $params[] = (bool)$input['animated'] ? 1 : 0;
    }
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['error' => 'No fields to update']);
        exit;
    }
    
    $params[] = $emojiId;
    
    try {
        $stmt = $db->prepare("UPDATE nitro_emojis SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => 'Emoji updated successfully'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update emoji: ' . $e->getMessage()]);
    }
}

// DELETE - Delete emoji
elseif ($method === 'DELETE' && $emojiId) {
    try {
        $stmt = $db->prepare("DELETE FROM nitro_emojis WHERE id = ?");
        $stmt->execute([$emojiId]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Emoji deleted successfully'
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Emoji not found']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete emoji: ' . $e->getMessage()]);
    }
}

else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
