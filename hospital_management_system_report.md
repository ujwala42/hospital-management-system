# St. Jude Hospital Management System (HMS)
## Complete Technical Specification & Implementation Report

---

## Executive Summary

The **St. Jude Hospital Management System (HMS)** is an enterprise-grade, web-enabled healthcare management platform designed to centralize patient health records, streamline clinical workflows, automate appointment scheduling, track inpatient room availability, and handle medical billing. The solution provides secure, anytime/anywhere data access for authorized medical and administrative personnel while enforcing operational data integrity through relational constraints.

---

## Activity A2.1: Functional Requirements Specification

The system requirements are organized into eight (8) operational modules:

### 1. Requirements Traceability Matrix

| Requirement ID | Module Name | Functional Requirement Description | Target User Role | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **FR-1.1** | Patient Management | Register new outpatients and inpatients with complete personal demographics, blood group, and emergency contact details. | Receptionist / Admin | **High** |
| **FR-1.2** | Patient Management | Search, filter, and inspect comprehensive patient profile history including consultation dates, diagnosis logs, and invoices. | Doctor / Nurse / Admin | **High** |
| **FR-1.3** | Patient Management | Update patient admission/care status (Outpatient, Inpatient, Discharged). | Nurse / Admin | **Medium** |
| **FR-2.1** | Staff Directory | Maintain doctor profiles with specialized medical qualifications, department assignments, and consulting fees. | Admin / HR | **High** |
| **FR-2.2** | Staff Directory | Manage doctor availability status (`Active`, `On Leave`, `Inactive`). | Admin | **Medium** |
| **FR-3.1** | Appointments | Schedule new consultation slots linking patients to doctors with specific time slots and visit reasons. | Receptionist / Patient | **High** |
| **FR-3.2** | Appointments | Track and update appointment lifecycle (`Scheduled` &rarr; `Completed`, `Cancelled`, `No-Show`). | Doctor / Receptionist | **High** |
| **FR-4.1** | Electronic Health Records | Log clinical examination notes, patient symptoms, and official diagnoses following consultations. | Doctor | **High** |
| **FR-4.2** | EHR & Prescriptions | Generate electronic prescriptions including medication name, dosage, daily frequency, and duration. | Doctor / Pharmacist | **High** |
| **FR-5.1** | Inpatient Wards | Track hospital room inventory across General Wards, Semi-Private, Private VIP, and ICU rooms. | Ward Manager / Nurse | **High** |
| **FR-5.2** | Inpatient Wards | Toggle room occupancy status (`Available`, `Occupied`, `Maintenance`) with daily room rate calculations. | Nurse / Admin | **Medium** |
| **FR-6.1** | Financial Billing | Auto-generate itemized billing invoices combining consultation fees, procedure costs, and applicable discounts. | Billing Clerk / Admin | **High** |
| **FR-6.2** | Financial Billing | Record invoice payments across payment modes (Cash, Credit Card, Insurance, UPI) and update ledger status. | Billing Clerk | **High** |
| **FR-7.1** | System Analytics | Display executive dashboard metrics for real-time patient count, active doctors, today's appointments, ward occupancy, and revenue. | Administrator | **High** |
| **FR-8.1** | Live SQL Console | Provide an embedded SQL query interface for administrative database maintenance and ad-hoc data analysis. | DB Administrator | **High** |

---

## Activity A2.2: Relational Database Schema Implementation

The system utilizes an ANSI-compliant SQLite relational database (`hospital.db`). Relational integrity is enforced using primary keys, foreign key relationships, candidate unique keys, and domain check constraints.

### 1. Entity Relationship (ER) Data Model

```
+------------------+         +------------------+         +------------------+
|   DEPARTMENTS    | 1     * |     DOCTORS      | 1     * |   APPOINTMENTS   |
+------------------+<--------+------------------+<--------+------------------+
| department_id PK |         | doctor_id PK     |         | appointment_id PK|
| name UNIQUE      |         | department_id FK |         | patient_id FK    |
| location         |         | specialization   |         | doctor_id FK     |
+------------------+         +------------------+         | date, slot       |
         |                                |               +------------------+
         | 1                              | 1                      | 1
         |                                |                        |
         | *                              | *                      | *
+------------------+         +------------------+         +------------------+
|      ROOMS       |         | MEDICAL_RECORDS  |         |     BILLING      |
+------------------+         +------------------+         +------------------+
| room_id PK       |         | record_id PK     |         | bill_id PK       |
| room_number UNQ  |         | patient_id FK    |         | patient_id FK    |
| department_id FK |         | doctor_id FK     |         | appointment_id FK|
| status           |         | diagnosis        |         | net_amount       |
+------------------+         +------------------+         +------------------+
                                      | 1
                                      |
                                      | *
                             +------------------+
                             |  PRESCRIPTIONS   |
                             +------------------+
                             | prescription_id  |
                             | record_id FK     |
                             | medicine_name    |
                             +------------------+
```

### 2. Complete SQL DDL Script (`schema.sql`)

```sql
PRAGMA foreign_keys = ON;

-- 1. DEPARTMENTS TABLE
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

-- 2. DOCTORS TABLE
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

-- 3. PATIENTS TABLE
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

-- 4. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    room_id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT NOT NULL UNIQUE,
    room_type TEXT NOT NULL CHECK (room_type IN ('General Ward', 'Semi-Private', 'Private VIP', 'ICU')),
    department_id INTEGER NOT NULL,
    daily_rate REAL NOT NULL CHECK (daily_rate >= 0),
    status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Maintenance')),
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);

-- 5. APPOINTMENTS TABLE
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

-- 6. MEDICAL RECORDS TABLE
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

-- 7. PRESCRIPTIONS TABLE
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

-- 8. BILLING TABLE
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

-- OPTIMIZATION INDEXES
CREATE INDEX IF NOT EXISTS idx_doctors_dept ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_patient ON billing(patient_id);
```

---

## Activity A2.3: Design and Implementation of GUI

The Graphical User Interface (GUI) was engineered using HTML5, CSS3, JavaScript (ES6+), and Google Fonts (`Inter` & `Outfit`).

### Key GUI Design Innovations

1. **Dark Modern Glassmorphism Interface**: Deep slate background (`#0b132b` / `#0f172a`), translucent card backings, glowing accent highlights (`#0ea5e9` cyan, `#10b981` emerald), and interactive hover responses.
2. **Fixed Navigation Sidebar**: Enables 1-click access across Executive Dashboard, Patient Registry, Doctors Roster, Appointment Schedule, Medical Records, Billing Ledger, Ward Inventory, and Live SQL Console.
3. **Responsive Dashboard Metrics**: Real-time KPI cards displaying Total Patients, Active Doctors, Today's Consultation Queue, Total Realized Revenue, and Inpatient Ward Occupancy Progress.
4. **Modal Dialog Framework**: Clean pop-up forms for Patient Registration, Doctor Onboarding, Appointment Booking, EHR Clinical Logging, and Invoice Generation.
5. **Interactive SQL Runner**: Embedded SQL Console allowing administrators to run custom raw SQL statements directly against the live database engine with instant table preview.

---

## Activity A2.4: Connection of Front End with Database and Results Demonstration

### 1. Connection Architecture

The system connects the web front-end to the SQLite database via a Python FastAPI REST API backend:

```
[ Web GUI (HTML/CSS/JS) ] 
       |
       | HTTP Fetch Requests (JSON)
       v
[ FastAPI REST Endpoints (main.py) ]
       |
       | Python sqlite3 Connection (database.py)
       v
[ SQLite Relational DB (hospital.db) ]
```

### 2. API Endpoints Matrix

| HTTP Method | Route | Description | Backend Logic |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/dashboard/stats` | Fetches real-time counts, revenue sum, and occupancy | Executes aggregate SQL functions (`COUNT`, `SUM`) |
| **GET / POST**| `/api/patients` | Retrieves or creates patient records | SELECT / INSERT into `patients` table |
| **GET** | `/api/patients/{id}` | Retrieves complete medical history for a patient | JOINs across `appointments`, `medical_records`, `billing` |
| **GET / POST**| `/api/doctors` | Retrieves or adds doctor profiles | SELECT / INSERT into `doctors` table |
| **GET / POST**| `/api/appointments` | Schedules or lists consultation appointments | SELECT / INSERT into `appointments` table |
| **POST** | `/api/medical-records` | Logs clinical notes and prescribed medicines | Atomic INSERT into `medical_records` & `prescriptions` |
| **GET / POST**| `/api/billing` | Generates invoices and tracks payments | SELECT / INSERT into `billing` table |
| **POST** | `/api/sql-console` | Executes arbitrary SQL query string | Direct execution via `cursor.execute()` returning schema & rows |

### 3. Empirical Verification Results

1. **Database Initialization Test**:
   - `schema.sql` successfully created 8 relational tables with constraints and populated sample records.
2. **Dashboard Real-Time Stats Test**:
   - Endpoint `/api/dashboard/stats` successfully returned:
     - `total_patients`: 5
     - `active_doctors`: 5
     - `today_appointments`: 3
     - `occupancy_rate`: 50.0% (3/6 beds occupied)
3. **SQL Console Execution Test**:
   - Executing `SELECT * FROM departments;` returned 5 department records with all columns (`department_id`, `name`, `code`, `location`, `phone`, `budget`, `head_doctor_name`).

---

## Source Code File Index

- [`schema.sql`](file:///c:/Users/UJWALA%20A/Downloads/hospital/schema.sql) : Complete ANSI SQL Database Schema DDL & DML script
- [`database.py`](file:///c:/Users/UJWALA%20A/Downloads/hospital/database.py) : SQLite database handler module
- [`main.py`](file:///c:/Users/UJWALA%20A/Downloads/hospital/main.py) : FastAPI REST application server
- [`run_server.py`](file:///c:/Users/UJWALA%20A/Downloads/hospital/run_server.py) : Uvicorn web server launcher
- [`static/index.html`](file:///c:/Users/UJWALA%20A/Downloads/hospital/static/index.html) : Main single-page web GUI application
- [`static/styles.css`](file:///c:/Users/UJWALA%20A/Downloads/hospital/static/styles.css) : Modern glassmorphism CSS design system
- [`static/app.js`](file:///c:/Users/UJWALA%20A/Downloads/hospital/static/app.js) : Front-end application controller & AJAX handler
