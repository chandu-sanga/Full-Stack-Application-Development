CREATE DATABASE IF NOT EXISTS `Relational Inventory Control & Stock Tracking System`;
USE `Relational Inventory Control & Stock Tracking System`;

CREATE TABLE IF NOT EXISTS food (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS other_stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user'
);
-- Insert default user (Password: user123)
INSERT IGNORE INTO users (username, password, role) VALUES ('user', 'user123', 'user');
-- Insert default admin (Password: admin123)
-- Note: In a real app, use password_hash() in PHP. For this XAMPP demo, we'll store it plain for simplicity or use MD5 if preferred.
INSERT IGNORE INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin');
