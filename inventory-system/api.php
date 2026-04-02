<?php
// api.php - REST API for Inventory System
header('Content-Type: application/json');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

function getTable($category) {
    // Basic routing based on category mapping
    return (strtolower(trim($category)) === 'food') ? 'food' : 'other_stocks';
}

try {
    switch ($method) {
        case 'GET':
            // Fetch all items from both tables
            $stmt1 = $pdo->query("SELECT id, name, category, price, stock, created_at, 'food' as source_table FROM food");
            $food_items = $stmt1->fetchAll();

            $stmt2 = $pdo->query("SELECT id, name, category, price, stock, created_at, 'other_stocks' as source_table FROM other_stocks");
            $other_items = $stmt2->fetchAll();

            $all_items = array_merge($food_items, $other_items);
            echo json_encode($all_items);
            break;

        case 'POST':
            // Handle Registration
            if (isset($input['action']) && $input['action'] === 'register') {
                if (isset($input['fullname'], $input['email'], $input['username'], $input['password'])) {
                    try {
                        $stmt = $pdo->prepare("INSERT INTO users (fullname, email, username, password, role) VALUES (?, ?, ?, ?, 'user')");
                        $stmt->execute([$input['fullname'], $input['email'], $input['username'], $input['password']]);
                        echo json_encode(['status' => 'success', 'message' => 'User registered successfully!']);
                    } catch (PDOException $e) {
                        if ($e->getCode() == 23000) {
                            echo json_encode(['status' => 'error', 'message' => 'Username or Email already exists.']);
                        } else {
                            echo json_encode(['status' => 'error', 'message' => 'Registration failed: ' . $e->getMessage()]);
                        }
                    }
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'All fields are required for registration.']);
                }
                break;
            }

            // Handle Login
            if (isset($input['action']) && $input['action'] === 'login') {
                if (isset($input['username']) && isset($input['password'])) {
                    $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?");
                    $stmt->execute([$input['username'], $input['password']]);
                    $user = $stmt->fetch();

                    if ($user) {
                        echo json_encode(['status' => 'success', 'user' => $user]);
                    } else {
                        echo json_encode(['status' => 'error', 'message' => 'Invalid username or password.']);
                    }
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Username and password required.']);
                }
                break;
            }

            // Handle Product Creation
            if (isset($input['name']) && isset($input['category'])) {
                $table = getTable($input['category']);
                
                if ($table === 'food') {
                    $sql = "INSERT INTO food (name, category, price, stock) VALUES (?, ?, ?, ?)";
                } else {
                    $sql = "INSERT INTO other_stocks (name, category, price, stock) VALUES (?, ?, ?, ?)";
                }
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $input['name'], 
                    $input['category'], 
                    $input['price'] ?? 0, 
                    $input['stock'] ?? 0
                ]);
                
                echo json_encode(['status' => 'success', 'id' => $pdo->lastInsertId(), 'table' => $table]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Missing product details.']);
            }
            break;

        case 'PUT':
            if (isset($input['id']) && isset($input['source_table'])) {
                $table = $input['source_table'];
                
                if (isset($input['stock_only']) && $input['stock_only']) {
                    $sql = "UPDATE $table SET stock = ? WHERE id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$input['stock'], $input['id']]);
                } else {
                    if ($table === 'food') {
                        $sql = "UPDATE food SET name = ?, category = ?, price = ? WHERE id = ?";
                    } else {
                        $sql = "UPDATE other_stocks SET name = ?, category = ?, price = ? WHERE id = ?";
                    }
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$input['name'], $input['category'], $input['price'], $input['id']]);
                }
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Missing product ID or table routing.']);
            }
            break;

        case 'DELETE':
            if (isset($input['id']) && isset($input['source_table'])) {
                $table = $input['source_table'];
                $sql = "DELETE FROM $table WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['id']]);
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Missing product ID or table routing.']);
            }
            break;

        default:
            echo json_encode(['status' => 'error', 'message' => 'Unsupported method']);
            break;
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'SQL Error: ' . $e->getMessage()]);
}
?>
