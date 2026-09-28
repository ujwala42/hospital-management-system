import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import database

app = FastAPI(title="MS Hospital Management System API", version="1.0.0")

# Ensure database is initialized
database.init_db()

# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------

class PatientCreate(BaseModel):
    name: str
    dob: str
    gender: str
    blood_group: str
    phone: str
    email: Optional[str] = None
    address: str
    emergency_contact: str
    status: Optional[str] = "Outpatient"

class DoctorCreate(BaseModel):
    name: str
    specialization: str
    qualification: str
    email: str
    phone: str
    department_id: int
    consulting_fee: float
    status: Optional[str] = "Active"

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: str
    time_slot: str
    reason: str

class MedicalRecordCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    diagnosis: str
    symptoms: Optional[str] = None
    treatment: str
    notes: Optional[str] = None
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration_days: Optional[int] = 7
    instructions: Optional[str] = None

class BillingCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    gross_amount: float
    discount: Optional[float] = 0.0
    payment_status: Optional[str] = "Pending"
    payment_mode: Optional[str] = "Cash"

class SQLQueryRequest(BaseModel):
    sql: str

# -------------------------------------------------------------
# DASHBOARD ENDPOINT
# -------------------------------------------------------------

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    total_patients = database.query_one("SELECT COUNT(*) as count FROM patients")["count"]
    active_doctors = database.query_one("SELECT COUNT(*) as count FROM doctors WHERE status = 'Active'")["count"]
    today_appointments = database.query_one("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = DATE('now')")["count"]
    
    total_revenue_row = database.query_one("SELECT SUM(net_amount) as total FROM billing WHERE payment_status = 'Paid'")
    total_revenue = total_revenue_row["total"] if total_revenue_row and total_revenue_row["total"] else 0.0

    total_rooms = database.query_one("SELECT COUNT(*) as count FROM rooms")["count"]
    occupied_rooms = database.query_one("SELECT COUNT(*) as count FROM rooms WHERE status = 'Occupied'")["count"]

    recent_appointments = database.query_all("""
        SELECT a.appointment_id, p.name as patient_name, d.name as doctor_name, 
               d.specialization, a.appointment_date, a.time_slot, a.status
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        JOIN doctors d ON a.doctor_id = d.doctor_id
        ORDER BY a.appointment_id DESC LIMIT 5
    """)

    recent_bills = database.query_all("""
        SELECT b.bill_id, p.name as patient_name, b.net_amount, b.payment_status, b.payment_mode, b.bill_date
        FROM billing b
        JOIN patients p ON b.patient_id = p.patient_id
        ORDER BY b.bill_id DESC LIMIT 5
    """)

    dept_stats = database.query_all("""
        SELECT d.name as dept_name, COUNT(doc.doctor_id) as doctor_count
        FROM departments d
        LEFT JOIN doctors doc ON d.department_id = doc.department_id
        GROUP BY d.department_id
    """)

    return {
        "total_patients": total_patients,
        "active_doctors": active_doctors,
        "today_appointments": today_appointments,
        "total_revenue": total_revenue,
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "occupancy_rate": round((occupied_rooms / total_rooms * 100), 1) if total_rooms > 0 else 0,
        "recent_appointments": recent_appointments,
        "recent_bills": recent_bills,
        "dept_stats": dept_stats
    }

# -------------------------------------------------------------
# PATIENTS ENDPOINTS
# -------------------------------------------------------------

@app.get("/api/patients")
def get_patients(search: Optional[str] = None):
    if search:
        query = """
            SELECT * FROM patients 
            WHERE name LIKE ? OR phone LIKE ? OR blood_group LIKE ? OR status LIKE ?
            ORDER BY patient_id DESC
        """
        pattern = f"%{search}%"
        return database.query_all(query, (pattern, pattern, pattern, pattern))
    return database.query_all("SELECT * FROM patients ORDER BY patient_id DESC")

@app.get("/api/patients/{patient_id}")
def get_patient_detail(patient_id: int):
    patient = database.query_one("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    appointments = database.query_all("""
        SELECT a.*, d.name as doctor_name, d.specialization 
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.doctor_id
        WHERE a.patient_id = ? ORDER BY a.appointment_date DESC
    """, (patient_id,))

    records = database.query_all("""
        SELECT mr.*, d.name as doctor_name 
        FROM medical_records mr
        JOIN doctors d ON mr.doctor_id = d.doctor_id
        WHERE mr.patient_id = ? ORDER BY mr.record_date DESC
    """, (patient_id,))

    bills = database.query_all("SELECT * FROM billing WHERE patient_id = ? ORDER BY bill_id DESC", (patient_id,))

    return {
        "patient": patient,
        "appointments": appointments,
        "medical_records": records,
        "billing": bills
    }

@app.post("/api/patients")
def create_patient(data: PatientCreate):
    sql = """
        INSERT INTO patients (name, dob, gender, blood_group, phone, email, address, emergency_contact, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    try:
        new_id = database.execute_commit(sql, (
            data.name, data.dob, data.gender, data.blood_group, 
            data.phone, data.email, data.address, data.emergency_contact, data.status
        ))
        return {"message": "Patient registered successfully", "patient_id": new_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/patients/{patient_id}")
def update_patient(patient_id: int, data: PatientCreate):
    sql = """
        UPDATE patients 
        SET name = ?, dob = ?, gender = ?, blood_group = ?, phone = ?, email = ?, address = ?, emergency_contact = ?, status = ?
        WHERE patient_id = ?
    """
    try:
        database.execute_commit(sql, (
            data.name, data.dob, data.gender, data.blood_group, 
            data.phone, data.email, data.address, data.emergency_contact, data.status, patient_id
        ))
        return {"message": "Patient details updated in SQL database"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/patients/{patient_id}/status")
def update_patient_status(patient_id: int, status: str):
    database.execute_commit("UPDATE patients SET status = ? WHERE patient_id = ?", (status, patient_id))
    return {"message": "Patient status updated successfully"}

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: int):
    try:
        database.execute_commit("DELETE FROM patients WHERE patient_id = ?", (patient_id,))
        return {"message": f"Patient #{patient_id} deleted successfully from SQL database"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------
# DOCTORS & DEPARTMENTS ENDPOINTS
# -------------------------------------------------------------

@app.get("/api/doctors")
def get_doctors():
    sql = """
        SELECT d.*, dept.name as department_name 
        FROM doctors d
        JOIN departments dept ON d.department_id = dept.department_id
        ORDER BY d.doctor_id ASC
    """
    return database.query_all(sql)

@app.post("/api/doctors")
def create_doctor(data: DoctorCreate):
    sql = """
        INSERT INTO doctors (name, specialization, qualification, email, phone, department_id, consulting_fee, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """
    try:
        new_id = database.execute_commit(sql, (
            data.name, data.specialization, data.qualification, data.email,
            data.phone, data.department_id, data.consulting_fee, data.status
        ))
        return {"message": "Doctor registered successfully", "doctor_id": new_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/doctors/{doctor_id}")
def delete_doctor(doctor_id: int):
    try:
        database.execute_commit("DELETE FROM doctors WHERE doctor_id = ?", (doctor_id,))
        return {"message": "Doctor removed from SQL database"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int):
    try:
        database.execute_commit("DELETE FROM appointments WHERE appointment_id = ?", (appointment_id,))
        return {"message": "Appointment deleted from SQL database"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/billing/{bill_id}")
def delete_billing(bill_id: int):
    try:
        database.execute_commit("DELETE FROM billing WHERE bill_id = ?", (bill_id,))
        return {"message": "Billing invoice deleted from SQL database"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/departments")
def get_departments():
    return database.query_all("SELECT * FROM departments ORDER BY department_id ASC")

@app.get("/api/rooms")
def get_rooms():
    sql = """
        SELECT r.*, d.name as department_name
        FROM rooms r
        JOIN departments d ON r.department_id = d.department_id
        ORDER BY r.room_id ASC
    """
    return database.query_all(sql)

@app.put("/api/rooms/{room_id}/status")
def update_room_status(room_id: int, status: str):
    database.execute_commit("UPDATE rooms SET status = ? WHERE room_id = ?", (status, room_id))
    return {"message": "Room status updated successfully"}

# -------------------------------------------------------------
# APPOINTMENTS ENDPOINTS
# -------------------------------------------------------------

@app.get("/api/appointments")
def get_appointments():
    sql = """
        SELECT a.*, p.name as patient_name, p.phone as patient_phone,
               d.name as doctor_name, d.specialization, dept.name as department_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        JOIN doctors d ON a.doctor_id = d.doctor_id
        JOIN departments dept ON d.department_id = dept.department_id
        ORDER BY a.appointment_id DESC
    """
    return database.query_all(sql)

@app.post("/api/appointments")
def create_appointment(data: AppointmentCreate):
    sql = """
        INSERT INTO appointments (patient_id, doctor_id, appointment_date, time_slot, reason, status)
        VALUES (?, ?, ?, ?, ?, 'Scheduled')
    """
    try:
        new_id = database.execute_commit(sql, (
            data.patient_id, data.doctor_id, data.appointment_date, data.time_slot, data.reason
        ))
        return {"message": "Appointment scheduled successfully", "appointment_id": new_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/appointments/{appointment_id}/status")
def update_appointment_status(appointment_id: int, status: str):
    database.execute_commit("UPDATE appointments SET status = ? WHERE appointment_id = ?", (status, appointment_id))
    return {"message": "Appointment status updated"}

# -------------------------------------------------------------
# MEDICAL RECORDS & PRESCRIPTIONS ENDPOINTS
# -------------------------------------------------------------

@app.get("/api/medical-records")
def get_medical_records():
    sql = """
        SELECT mr.*, p.name as patient_name, d.name as doctor_name,
               (SELECT GROUP_CONCAT(medicine_name || ' (' || dosage || ', ' || frequency || ')', '; ') 
                FROM prescriptions pr WHERE pr.record_id = mr.record_id) as prescriptions_summary
        FROM medical_records mr
        JOIN patients p ON mr.patient_id = p.patient_id
        JOIN doctors d ON mr.doctor_id = d.doctor_id
        ORDER BY mr.record_id DESC
    """
    return database.query_all(sql)

@app.post("/api/medical-records")
def create_medical_record(data: MedicalRecordCreate):
    sql_rec = """
        INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, symptoms, treatment, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    try:
        rec_id = database.execute_commit(sql_rec, (
            data.patient_id, data.doctor_id, data.appointment_id,
            data.diagnosis, data.symptoms, data.treatment, data.notes
        ))

        # If prescription medicine info provided, insert into prescriptions table
        if data.medicine_name and data.dosage and data.frequency:
            sql_pres = """
                INSERT INTO prescriptions (record_id, medicine_name, dosage, frequency, duration_days, instructions)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            database.execute_commit(sql_pres, (
                rec_id, data.medicine_name, data.dosage, data.frequency, data.duration_days, data.instructions
            ))

        if data.appointment_id:
            database.execute_commit("UPDATE appointments SET status = 'Completed' WHERE appointment_id = ?", (data.appointment_id,))

        return {"message": "Medical record & prescription created successfully", "record_id": rec_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------
# BILLING ENDPOINTS
# -------------------------------------------------------------

@app.get("/api/billing")
def get_billing():
    sql = """
        SELECT b.*, p.name as patient_name, p.phone as patient_phone
        FROM billing b
        JOIN patients p ON b.patient_id = p.patient_id
        ORDER BY b.bill_id DESC
    """
    return database.query_all(sql)

@app.post("/api/billing")
def create_billing(data: BillingCreate):
    net_amount = max(0.0, data.gross_amount - (data.discount or 0.0))
    sql = """
        INSERT INTO billing (patient_id, appointment_id, gross_amount, discount, net_amount, payment_status, payment_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    try:
        bill_id = database.execute_commit(sql, (
            data.patient_id, data.appointment_id, data.gross_amount,
            data.discount, net_amount, data.payment_status, data.payment_mode
        ))
        return {"message": "Invoice generated successfully", "bill_id": bill_id, "net_amount": net_amount}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/billing/{bill_id}/status")
def update_billing_status(bill_id: int, status: str, mode: Optional[str] = "Cash"):
    database.execute_commit("UPDATE billing SET payment_status = ?, payment_mode = ? WHERE bill_id = ?", (status, mode, bill_id))
    return {"message": "Billing status updated"}

# -------------------------------------------------------------
# SQL INTERACTIVE CONSOLE ENDPOINT FOR DEMONSTRATION
# -------------------------------------------------------------

@app.post("/api/sql-console")
def run_sql_console(req: SQLQueryRequest):
    columns, rows, message = database.execute_raw_sql(req.sql)
    return {
        "columns": columns,
        "rows": rows,
        "message": message
    }

# -------------------------------------------------------------
# STATIC FRONTEND SERVING
# -------------------------------------------------------------

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "MS Hospital Management System API is running. GUI files missing."}
