-- Hospital Management System Relational Database Schema
-- Standard ANSI SQL / SQLite Compatible DDL & DML

-- Enable Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- -------------------------------------------------------------
-- TABLE 1: DEPARTMENTS
-- Stores information about various hospital departments
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    department_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    phone TEXT NOT NULL,
    budget REAL DEFAULT 0.0 CHECK (budget >= 0),
    head_doctor_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- TABLE 2: DOCTORS
-- Stores medical staff details and assignment to departments
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    department_id INTEGER NOT NULL,
    consulting_fee REAL NOT NULL CHECK (consulting_fee >= 0),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Inactive')),
    joined_date DATE DEFAULT (DATE('now')),
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -------------------------------------------------------------
-- TABLE 3: PATIENTS
-- Centralized patient demographic and contact records
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dob DATE NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    status TEXT DEFAULT 'Outpatient' CHECK (status IN ('Outpatient', 'Inpatient', 'Discharged')),
    registered_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- TABLE 4: ROOMS
-- Hospital rooms/beds for inpatient management
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    room_id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT NOT NULL UNIQUE,
    room_type TEXT NOT NULL CHECK (room_type IN ('General Ward', 'Semi-Private', 'Private VIP', 'ICU')),
    department_id INTEGER NOT NULL,
    daily_rate REAL NOT NULL CHECK (daily_rate >= 0),
    status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Maintenance')),
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- TABLE 5: APPOINTMENTS
-- Schedules doctor-patient consultations
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No-Show')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- TABLE 6: MEDICAL_RECORDS
-- Clinical diagnoses, clinical notes, and treatment history
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_id INTEGER,
    record_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    diagnosis TEXT NOT NULL,
    symptoms TEXT,
    treatment TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
);

-- -------------------------------------------------------------
-- TABLE 7: PRESCRIPTIONS
-- Medications prescribed during consultation
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    instructions TEXT,
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- TABLE 8: BILLING
-- Financial transactions, invoices, and billing status
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing (
    bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER,
    bill_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    gross_amount REAL NOT NULL CHECK (gross_amount >= 0),
    discount REAL DEFAULT 0.0 CHECK (discount >= 0),
    net_amount REAL NOT NULL CHECK (net_amount >= 0),
    payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Partially Paid', 'Cancelled')),
    payment_mode TEXT DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Credit Card', 'Insurance', 'UPI', 'Bank Transfer')),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
);

-- -------------------------------------------------------------
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_doctors_dept ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_patient ON billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(payment_status);

-- -------------------------------------------------------------
-- SAMPLE SEED DATA INSERTION
-- -------------------------------------------------------------

-- Insert Departments
INSERT OR IGNORE INTO departments (department_id, name, code, location, phone, budget, head_doctor_name) VALUES
(1, 'Cardiology', 'CARD', 'Building A, 3rd Floor', '+1-555-0101', 450000.00, 'Dr. Sarah Jenkins'),
(2, 'Neurology', 'NEUR', 'Building B, 2nd Floor', '+1-555-0102', 500000.00, 'Dr. Robert Chen'),
(3, 'Orthopedics', 'ORTH', 'Building A, 1st Floor', '+1-555-0103', 380000.00, 'Dr. Marcus Vance'),
(4, 'Pediatrics', 'PEDS', 'Building C, 1st Floor', '+1-555-0104', 320000.00, 'Dr. Elena Rostova'),
(5, 'Emergency & Trauma', 'EMRG', 'Ground Floor Wing E', '+1-555-0199', 750000.00, 'Dr. David Miller');

-- Insert Doctors
INSERT OR IGNORE INTO doctors (doctor_id, name, specialization, qualification, email, phone, department_id, consulting_fee, status) VALUES
(1, 'Dr. Sarah Jenkins', 'Cardiologist', 'MD, FACC', 's.jenkins@mshospital.org', '+1-555-0201', 1, 150.00, 'Active'),
(2, 'Dr. Robert Chen', 'Neurologist', 'MD, PhD', 'r.chen@mshospital.org', '+1-555-0202', 2, 180.00, 'Active'),
(3, 'Dr. Marcus Vance', 'Orthopedic Surgeon', 'MS (Ortho), FRCS', 'm.vance@mshospital.org', '+1-555-0203', 3, 160.00, 'Active'),
(4, 'Dr. Elena Rostova', 'Pediatrician', 'MD (Pediatrics)', 'e.rostova@mshospital.org', '+1-555-0204', 4, 120.00, 'Active'),
(5, 'Dr. David Miller', 'Emergency Physician', 'MD (Emergency Med)', 'd.miller@mshospital.org', '+1-555-0205', 5, 200.00, 'Active'),
(6, 'Dr. Amanda Brooks', 'Interventional Cardiologist', 'MD, DM', 'a.brooks@mshospital.org', '+1-555-0206', 1, 175.00, 'On Leave');

-- Insert Patients
INSERT OR IGNORE INTO patients (patient_id, name, dob, gender, blood_group, phone, email, address, emergency_contact, status) VALUES
(1, 'John Doe', '1985-04-12', 'Male', 'O+', '+1-555-1001', 'john.doe@example.com', '742 Evergreen Terrace, Springfield', '+1-555-9001 (Mary Doe)', 'Inpatient'),
(2, 'Alice Smith', '1992-08-25', 'Female', 'A+', '+1-555-1002', 'alice.smith@example.com', '123 Maple Street, Metropolis', '+1-555-9002 (Bob Smith)', 'Outpatient'),
(3, 'Michael Brown', '1978-11-03', 'Male', 'B-', '+1-555-1003', 'm.brown@example.com', '456 Oak Avenue, Gotham', '+1-555-9003 (Sarah Brown)', 'Inpatient'),
(4, 'Emily Watson', '2001-01-19', 'Female', 'AB+', '+1-555-1004', 'emily.w@example.com', '89 Pine Road, Star City', '+1-555-9004 (Tom Watson)', 'Outpatient'),
(5, 'James Wilson', '1965-06-30', 'Male', 'O-', '+1-555-1005', 'j.wilson@example.com', '321 Elm Lane, Central City', '+1-555-9005 (Linda Wilson)', 'Outpatient');

-- Insert Rooms
INSERT OR IGNORE INTO rooms (room_id, room_number, room_type, department_id, daily_rate, status) VALUES
(1, '101-G', 'General Ward', 1, 100.00, 'Occupied'),
(2, '102-P', 'Private VIP', 1, 350.00, 'Available'),
(3, '201-SP', 'Semi-Private', 2, 200.00, 'Occupied'),
(4, '202-ICU', 'ICU', 2, 850.00, 'Occupied'),
(5, '301-P', 'Private VIP', 3, 350.00, 'Available'),
(6, '401-G', 'General Ward', 4, 90.00, 'Available');

-- Insert Appointments
INSERT OR IGNORE INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, time_slot, reason, status) VALUES
(1, 1, 1, '2026-09-28', '09:00 AM - 09:30 AM', 'Routine Cardiac Evaluation', 'Completed'),
(2, 2, 2, '2026-09-28', '10:30 AM - 11:00 AM', 'Persistent Migraine Follow-up', 'Scheduled'),
(3, 3, 3, '2026-09-29', '11:15 AM - 11:45 AM', 'Knee Joint Pain Consultation', 'Scheduled'),
(4, 4, 4, '2026-09-29', '02:00 PM - 02:30 PM', 'Pediatric Vaccination & Health Check', 'Scheduled'),
(5, 5, 5, '2026-09-28', '08:00 AM - 08:30 AM', 'Emergency Chest Discomfort', 'Completed');

-- Insert Medical Records
INSERT OR IGNORE INTO medical_records (record_id, patient_id, doctor_id, appointment_id, diagnosis, symptoms, treatment, notes) VALUES
(1, 1, 1, 1, 'Mild Hypertensive Heart Disease', 'Shortness of breath on exertion, slight chest heaviness', 'Prescribed anti-hypertensive medication, low sodium diet, ECG scheduled in 2 weeks', 'Patient advised to monitor BP daily morning and evening.'),
(2, 5, 5, 5, 'Acute Angina Pectoris', 'Sharp retrosternal pain radiating to left arm', 'Sublingual nitroglycerin administered, IV fluid therapy, admitted to ICU for monitoring', 'ECHO done, regular cardiac enzymes monitoring ordered.');

-- Insert Prescriptions
INSERT OR IGNORE INTO prescriptions (prescription_id, record_id, medicine_name, dosage, frequency, duration_days, instructions) VALUES
(1, 1, 'Amlodipine 5mg', '1 Tablet', 'Once Daily (Morning)', 30, 'Take after breakfast with water'),
(2, 1, 'Atorvastatin 10mg', '1 Tablet', 'Once Daily (Bedtime)', 30, 'Take after dinner'),
(3, 2, 'Clopidogrel 75mg', '1 Tablet', 'Once Daily', 14, 'Do not stop abruptly without doctor advise'),
(4, 2, 'Nitroglycerin 0.4mg', 'Sublingual', 'As needed for chest pain', 7, 'Place under tongue during acute pain episode');

-- Insert Billing
INSERT OR IGNORE INTO billing (bill_id, patient_id, appointment_id, gross_amount, discount, net_amount, payment_status, payment_mode) VALUES
(1, 1, 1, 250.00, 25.00, 225.00, 'Paid', 'Credit Card'),
(2, 2, 2, 180.00, 0.00, 180.00, 'Pending', 'Cash'),
(3, 3, 3, 160.00, 10.00, 150.00, 'Pending', 'Insurance'),
(4, 5, 5, 1450.00, 100.00, 1350.00, 'Partially Paid', 'UPI');
