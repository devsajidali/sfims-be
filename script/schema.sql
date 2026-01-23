-- ======================================
-- Drop and Reset Database Objects
-- ======================================
CREATE DATABASE IF NOT EXISTS sfims;
USE sfims;
-- Drop view first
DROP VIEW IF EXISTS inventory_quantity_summary;
-- Drop tables in correct dependency order
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS asset_issue;
DROP TABLE IF EXISTS asset_request_approval;
DROP TABLE IF EXISTS asset_request;
DROP TABLE IF EXISTS team_lead;
DROP TABLE IF EXISTS employee_project;
DROP TABLE IF EXISTS employee_team;
DROP TABLE IF EXISTS employee;
DROP TABLE IF EXISTS team;
DROP TABLE IF EXISTS department;
DROP TABLE IF EXISTS project;
DROP TABLE IF EXISTS asset;
-- ======================================
-- Department Table
-- ======================================
CREATE TABLE department (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL
);
INSERT INTO department (department_name)
VALUES ('Management'),
    ('HR'),
    ('IT'),
    ('Engineering');
-- ======================================
-- Team Table
-- ======================================
CREATE TABLE team (
    team_id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(50) NOT NULL,
    department_id INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES department(department_id)
);
-- Sample teams under Engineering
INSERT INTO team (team_name, department_id)
VALUES ('FE', 4),
    ('BE', 4),
    ('QA', 4);
-- ======================================
-- Project Table
-- ======================================
CREATE TABLE project (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL
);
-- ======================================
-- Employee Table
-- ======================================
CREATE TABLE employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    full_name VARCHAR(101) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED,
    designation VARCHAR(50),
    role ENUM('Employee', 'TeamLead', 'Manager', 'ED', 'CEO') NOT NULL,
    email VARCHAR(100),
    contact_number VARCHAR(20),
    department_id INT,
    FOREIGN KEY (department_id) REFERENCES department(department_id) ON DELETE
    SET NULL
);
-- ======================================
-- Employee-Team Mapping
-- ======================================
CREATE TABLE employee_team (
    employee_team_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    team_id INT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    FOREIGN KEY (team_id) REFERENCES team(team_id)
);
-- ======================================
-- Employee-Project Mapping
-- ======================================
CREATE TABLE employee_project (
    employee_id INT NOT NULL,
    project_id INT NOT NULL,
    PRIMARY KEY (employee_id, project_id),
    CONSTRAINT employee_project_ibfk_1 FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE,
    CONSTRAINT employee_project_ibfk_2 FOREIGN KEY (project_id) REFERENCES project(project_id) ON DELETE CASCADE
);
-- ======================================
-- Team Lead Table
-- ======================================
CREATE TABLE team_lead (
    team_lead_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    team_id INT NOT NULL,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    FOREIGN KEY (team_id) REFERENCES team(team_id)
);
-- ======================================
-- Asset Table (Final Version)
-- ======================================
CREATE TABLE asset (
    asset_id INT NOT NULL AUTO_INCREMENT,
    asset_type VARCHAR(50) NOT NULL,
    brand VARCHAR(50) DEFAULT NULL,
    model VARCHAR(50) DEFAULT NULL,
    specifications VARCHAR(200) DEFAULT NULL,
    serial_number VARCHAR(100) NOT NULL,
    purchase_date DATE DEFAULT NULL,
    vendor VARCHAR(50) DEFAULT NULL,
    warranty_expiry DATE DEFAULT NULL,
    status ENUM(
        'Available',
        'Requested',
        'Assigned',
        'Repair',
        'Retired'
    ) DEFAULT 'Available',
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (asset_id),
    UNIQUE KEY serial_number (serial_number)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
-- ======================================
-- Asset Request Table
-- ======================================
CREATE TABLE asset_request (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    asset_id INT NOT NULL,
    request_type ENUM('Employee', 'Management') NOT NULL,
    request_status ENUM('Pending', 'Approved', 'Rejected', 'Issued') DEFAULT 'Pending',
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES employee(employee_id),
    FOREIGN KEY (asset_id) REFERENCES asset(asset_id)
);
-- ======================================
-- Asset Request Approval Table
-- ======================================
CREATE TABLE asset_request_approval (
    approval_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    approver_id INT NOT NULL,
    approval_level ENUM('TeamLead', 'IT') NOT NULL,
    approval_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    approval_date DATETIME,
    remarks VARCHAR(200),
    FOREIGN KEY (request_id) REFERENCES asset_request(request_id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES employee(employee_id)
);
-- ======================================
-- Asset Issue Table
-- ======================================
CREATE TABLE asset_issue (
    issue_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    asset_id INT NOT NULL,
    employee_id INT NOT NULL,
    issue_date DATE NOT NULL,
    quantity_issued INT NOT NULL,
    FOREIGN KEY (request_id) REFERENCES asset_request(request_id),
    FOREIGN KEY (asset_id) REFERENCES asset(asset_id),
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);
-- ======================================
-- Audit Log Table
-- ======================================
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action_type ENUM('Request', 'Approve', 'Reject', 'Issue') NOT NULL,
    request_id INT,
    performed_by INT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES asset_request(request_id),
    FOREIGN KEY (performed_by) REFERENCES employee(employee_id)
);
-- ======================================
-- Inventory View
-- ======================================
CREATE VIEW inventory_quantity_summary AS
SELECT a.asset_id,
    a.asset_type,
    a.model,
    a.quantity,
    IFNULL(SUM(i.quantity_issued), 0) AS issued_qty,
    (a.quantity - IFNULL(SUM(i.quantity_issued), 0)) AS available_qty
FROM asset a
    LEFT JOIN asset_issue i ON a.asset_id = i.asset_id
GROUP BY a.asset_id;
-- ======================================
-- Mock Data for Software House
-- ======================================
-- Employees
INSERT INTO employee (
        first_name,
        last_name,
        designation,
        role,
        email,
        contact_number,
        department_id
    )
VALUES (
        'Alice',
        'Smith',
        'CEO',
        'CEO',
        'alice@company.com',
        '9000000001',
        1
    ),
    (
        'Bob',
        'Johnson',
        'CTO',
        'ED',
        'bob@company.com',
        '9000000002',
        1
    ),
    (
        'Charlie',
        'Brown',
        'Team Lead',
        'TeamLead',
        'charlie@company.com',
        '9000000003',
        1
    ),
    (
        'David',
        'Lee',
        'FrontEnd Developer',
        'Employee',
        'david@company.com',
        '9000000004',
        4
    ),
    (
        'Eva',
        'Green',
        'BackEnd Developer',
        'Employee',
        'eva@company.com',
        '9000000005',
        4
    ),
    (
        'Frank',
        'White',
        'QA Tester',
        'Employee',
        'frank@company.com',
        '9000000006',
        4
    );
-- Employee-Team Mapping
INSERT INTO employee_team (employee_id, team_id)
VALUES (4, 1),
    -- David -> FE
    (5, 2),
    -- Eva -> BE
    (6, 3);
-- Frank -> QA
-- Employee-Project Mapping
INSERT INTO employee_project (employee_id, project_id)
VALUES (4, 1),
    -- David -> Website Redesign
    (5, 2),
    -- Eva -> Mobile App Development
    (6, 3);
-- Frank -> Internal Tools Upgrade
-- Team Leads
INSERT INTO team_lead (employee_id, team_id, status)
VALUES (3, 1, 'Active');
-- Charlie leading FE
-- Assets with specifications, vendor, purchase_date, warranty
INSERT INTO asset (
        asset_type,
        brand,
        model,
        specifications,
        serial_number,
        purchase_date,
        vendor,
        warranty_expiry,
        status,
        quantity
    )
VALUES (
        'Laptop',
        'Dell',
        'XPS 15',
        'Intel i7, 16GB RAM, 512GB SSD, Windows 11',
        'SN001',
        '2025-06-15',
        'Dell Inc.',
        '2028-06-14',
        'Available',
        5
    ),
    (
        'Laptop',
        'HP',
        'EliteBook',
        'Intel i5, 8GB RAM, 256GB SSD, Windows 10',
        'SN002',
        '2025-07-01',
        'HP',
        '2028-06-30',
        'Available',
        3
    ),
    (
        'Monitor',
        'Samsung',
        'U28E590D',
        '28 inch, 4K UHD, LED',
        'SN003',
        '2025-05-20',
        'Samsung',
        '2027-05-19',
        'Available',
        10
    ),
    (
        'Keyboard',
        'Logitech',
        'K120',
        'Wired, USB',
        'SN004',
        '2025-04-10',
        'Logitech',
        '2026-04-09',
        'Available',
        15
    );
-- Projects
INSERT INTO project (project_name)
VALUES ('Website Redesign'),
    ('Mobile App Development'),
    ('Internal Tools Upgrade');
-- Sample asset request workflow
INSERT INTO asset_request (
        requester_id,
        asset_id,
        request_type,
        request_status
    )
VALUES (4, 1, 'Employee', 'Pending'),
    (5, 2, 'Employee', 'Pending');
INSERT INTO asset_request_approval (
        request_id,
        approver_id,
        approval_level,
        approval_status
    )
VALUES (1, 3, 'TeamLead', 'Pending'),
    (2, 3, 'TeamLead', 'Pending');
INSERT INTO asset_issue (
        request_id,
        asset_id,
        employee_id,
        issue_date,
        quantity_issued
    )
VALUES (1, 1, 4, '2026-01-21', 1);
INSERT INTO audit_log (action_type, request_id, performed_by)
VALUES ('Request', 1, 4),
    ('Approve', 1, 3),
    ('Issue', 1, 4);