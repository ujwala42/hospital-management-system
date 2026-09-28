/* Hospital Management System - Front-end Application Controller */

let currentView = 'dashboard';
let cachedPatients = [];
let cachedDoctors = [];
let cachedDepartments = [];

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    fetchPatients();
    fetchDoctors();
    fetchDepartments();
    fetchAppointments();
    fetchMedicalRecords();
    fetchBilling();
    fetchRooms();

    // Hide search results dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const resultsBox = document.getElementById('dash-patient-results');
        const input = document.getElementById('dash-patient-input');
        if (resultsBox && input && !resultsBox.contains(e.target) && !input.contains(e.target)) {
            resultsBox.style.display = 'none';
        }
    });

    // Set today date as default in appointment form
    const appDate = document.getElementById('app-date');
    if (appDate) appDate.value = new Date().toISOString().split('T')[0];
});

// -------------------------------------------------------------
// VIEW SWITCHING LOGIC
// -------------------------------------------------------------
function switchView(viewName, btnElement) {
    currentView = viewName;
    
    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    // Deactivate nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    // Show target view
    const targetPanel = document.getElementById(`view-${viewName}`);
    if (targetPanel) targetPanel.classList.add('active');

    // Activate nav button
    if (btnElement) {
        btnElement.parentElement.classList.add('active');
    }

    // Update Topbar Title
    const titles = {
        'dashboard': 'Executive Dashboard & Real-Time Analytics',
        'patients': 'Centralized Patients Registry',
        'doctors': 'Medical Staff & Specialists Directory',
        'appointments': 'Consultation & Appointment Schedule',
        'records': 'Electronic Medical Records (EHR) & Prescriptions',
        'billing': 'Financial Invoices & Payment Ledger',
        'rooms': 'Inpatient Wards & Room Occupancy',
        'sql-console': 'Interactive SQL Query Console',
        'requirements': 'Activity A2.1 Functional Requirements'
    };
    document.getElementById('page-heading').innerText = titles[viewName] || 'MS Hospital HMS';

    // Refresh view-specific data
    if (viewName === 'dashboard') loadDashboardStats();
    if (viewName === 'patients') fetchPatients();
    if (viewName === 'doctors') fetchDoctors();
    if (viewName === 'appointments') fetchAppointments();
    if (viewName === 'records') fetchMedicalRecords();
    if (viewName === 'billing') fetchBilling();
    if (viewName === 'rooms') fetchRooms();
}

// -------------------------------------------------------------
// DASHBOARD CONTROLLER & PATIENT NAME ENTRY
// -------------------------------------------------------------
async function handleDashboardPatientSearch(val) {
    const resultsBox = document.getElementById('dash-patient-results');
    if (!resultsBox) return;

    const query = val.trim().toLowerCase();
    if (!query) {
        resultsBox.style.display = 'none';
        return;
    }

    // Filter from cached patients or fetch from API
    let matches = cachedPatients.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.phone && p.phone.includes(query)) ||
        (p.blood_group && p.blood_group.toLowerCase().includes(query))
    );

    resultsBox.style.display = 'block';

    if (matches.length === 0) {
        resultsBox.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text-secondary);">
                <p style="margin-bottom: 8px;">No existing patient found matching "<strong>${escapeHtml(val)}</strong>"</p>
                <button class="btn btn-primary btn-sm" onclick="openQuickRegister('${escapeHtml(val)}')">
                    <i class="fa-solid fa-user-plus"></i> Register "${escapeHtml(val)}" Now
                </button>
            </div>
        `;
        return;
    }

    resultsBox.innerHTML = matches.map(p => `
        <div style="padding: 0.85rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; transition: background 0.2s ease; cursor: pointer;" onmouseover="this.style.background='rgba(30,41,59,0.9)'" onmouseout="this.style.background='transparent'">
            <div onclick="viewPatientDetail(${p.patient_id}); document.getElementById('dash-patient-results').style.display='none';">
                <strong style="color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(p.name)}</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 8px;">(#P-${p.patient_id})</span>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                    Phone: ${escapeHtml(p.phone)} | DOB: ${p.dob} | Blood: <span class="badge badge-danger">${p.blood_group}</span>
                </div>
            </div>
            <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm" onclick="viewPatientDetail(${p.patient_id}); document.getElementById('dash-patient-results').style.display='none';">
                    <i class="fa-solid fa-id-card"></i> Profile
                </button>
                <button class="btn btn-primary btn-sm" onclick="quickBookAppointmentFor(${p.patient_id}); document.getElementById('dash-patient-results').style.display='none';">
                    <i class="fa-solid fa-calendar-plus"></i> Book Appt
                </button>
            </div>
        </div>
    `).join('');
}

function searchDashboardPatient() {
    const input = document.getElementById('dash-patient-input');
    if (input && input.value.trim()) {
        handleDashboardPatientSearch(input.value);
    }
}

function openQuickRegister(suggestedName = '') {
    const input = document.getElementById('dash-patient-input');
    const nameToUse = suggestedName || (input ? input.value.trim() : '');
    openModal('modal-patient');
    if (nameToUse) {
        document.getElementById('p-name').value = nameToUse;
    }
    const resultsBox = document.getElementById('dash-patient-results');
    if (resultsBox) resultsBox.style.display = 'none';
}

function quickBookAppointmentFor(patientId) {
    openModal('modal-appointment');
    const patientSelect = document.getElementById('app-patient');
    if (patientSelect) patientSelect.value = patientId;
}

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();

        document.getElementById('stat-patients').innerText = data.total_patients;
        document.getElementById('stat-doctors').innerText = data.active_doctors;
        document.getElementById('stat-appointments').innerText = data.today_appointments;
        document.getElementById('stat-revenue').innerText = `$${data.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        document.getElementById('stat-occupancy').innerText = `${data.occupancy_rate}%`;
        document.getElementById('stat-rooms-detail').innerText = `${data.occupied_rooms} / ${data.total_rooms} Beds Occupied`;
        document.getElementById('stat-occupancy-bar').style.width = `${data.occupancy_rate}%`;

        // Render Recent Appointments Table
        const tbodyApp = document.getElementById('dash-recent-appointments');
        if (data.recent_appointments.length === 0) {
            tbodyApp.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No appointments today.</td></tr>`;
        } else {
            tbodyApp.innerHTML = data.recent_appointments.map(a => `
                <tr>
                    <td><strong>${escapeHtml(a.patient_name)}</strong></td>
                    <td>${escapeHtml(a.doctor_name)} <br><span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(a.specialization)}</span></td>
                    <td>${a.time_slot}</td>
                    <td>${getStatusBadge(a.status)}</td>
                </tr>
            `).join('');
        }

        // Render Department Breakdown Table
        const tbodyDept = document.getElementById('dash-dept-stats');
        tbodyDept.innerHTML = data.dept_stats.map(d => `
            <tr>
                <td><strong>${escapeHtml(d.dept_name)}</strong></td>
                <td><span class="badge badge-info">${d.doctor_count} Doctors</span></td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

// -------------------------------------------------------------
// PATIENTS CONTROLLER
// -------------------------------------------------------------
async function fetchPatients() {
    const search = document.getElementById('patient-search')?.value || '';
    const url = search ? `/api/patients?search=${encodeURIComponent(search)}` : '/api/patients';
    try {
        const res = await fetch(url);
        cachedPatients = await res.json();
        renderPatientsTable(cachedPatients);
        updatePatientSelects();
    } catch (err) {
        console.error("Error fetching patients:", err);
    }
}

function renderPatientsTable(patients) {
    const tbody = document.getElementById('patients-table-body');
    if (!tbody) return;
    if (patients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No patient records found in SQL database.</td></tr>`;
        return;
    }
    tbody.innerHTML = patients.map(p => `
        <tr>
            <td>#P-${p.patient_id}</td>
            <td><strong>${escapeHtml(p.name)}</strong><br><span style="font-size:0.78rem; color:var(--text-muted);">${p.email || 'No Email'}</span></td>
            <td>${p.dob} <br><span style="font-size:0.78rem; color:var(--text-muted);">${p.gender}</span></td>
            <td><span class="badge badge-danger">${p.blood_group || 'N/A'}</span></td>
            <td>${escapeHtml(p.phone)}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>
                <div style="display:flex; gap: 4px; flex-wrap: wrap;">
                    <button class="btn btn-secondary btn-sm" onclick="viewPatientDetail(${p.patient_id})" title="View Medical Profile">
                        <i class="fa-solid fa-eye" style="color:var(--accent-blue);"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="openEditPatientModal(${p.patient_id})" title="Edit Patient Details">
                        <i class="fa-solid fa-pen-to-square" style="color:var(--accent-amber);"></i> Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="deletePatient(${p.patient_id}, '${escapeHtml(p.name)}')" title="Delete from SQL DB">
                        <i class="fa-solid fa-trash" style="color:var(--accent-rose);"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function viewPatientDetail(id) {
    try {
        const res = await fetch(`/api/patients/${id}`);
        const data = await res.json();
        const p = data.patient;

        const html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; background: rgba(30,41,59,0.5); padding: 1rem; border-radius: var(--radius-md);">
                <div>
                    <h4 style="color:var(--accent-blue); font-size: 1.2rem;">${escapeHtml(p.name)}</h4>
                    <p style="color:var(--text-secondary); font-size: 0.85rem;">Registered: ${p.registered_date}</p>
                    <p><strong>DOB:</strong> ${p.dob} (${p.gender})</p>
                    <p><strong>Blood Group:</strong> <span class="badge badge-danger">${p.blood_group}</span></p>
                    <p><strong>Care Status:</strong> ${getStatusBadge(p.status)}</p>
                </div>
                <div>
                    <p><strong>Phone:</strong> ${escapeHtml(p.phone)}</p>
                    <p><strong>Email:</strong> ${escapeHtml(p.email || 'N/A')}</p>
                    <p><strong>Address:</strong> ${escapeHtml(p.address)}</p>
                    <p><strong>Emergency Contact:</strong> ${escapeHtml(p.emergency_contact)}</p>
                </div>
            </div>

            <h4 style="margin: 1rem 0 0.5rem; font-family:'Outfit';">Appointment History</h4>
            <div class="table-container" style="margin-bottom: 1rem;">
                <table class="data-table">
                    <thead>
                        <tr><th>Date</th><th>Doctor</th><th>Reason</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        ${data.appointments.length === 0 ? '<tr><td colspan="4">No appointments recorded.</td></tr>' :
                            data.appointments.map(a => `
                                <tr>
                                    <td>${a.appointment_date}</td>
                                    <td>${escapeHtml(a.doctor_name)}</td>
                                    <td>${escapeHtml(a.reason)}</td>
                                    <td>${getStatusBadge(a.status)}</td>
                                </tr>
                            `).join('')
                        }
                    </tbody>
                </table>
            </div>

            <h4 style="margin: 1rem 0 0.5rem; font-family:'Outfit';">Medical Diagnoses & Clinical Records</h4>
            <div class="table-container" style="margin-bottom: 1rem;">
                <table class="data-table">
                    <thead>
                        <tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Treatment</th></tr>
                    </thead>
                    <tbody>
                        ${data.medical_records.length === 0 ? '<tr><td colspan="4">No medical records on file.</td></tr>' :
                            data.medical_records.map(r => `
                                <tr>
                                    <td>${r.record_date}</td>
                                    <td>${escapeHtml(r.doctor_name)}</td>
                                    <td><strong>${escapeHtml(r.diagnosis)}</strong></td>
                                    <td>${escapeHtml(r.treatment)}</td>
                                </tr>
                            `).join('')
                        }
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('patient-detail-content').innerHTML = html;
        openModal('modal-patient-detail');
    } catch (err) {
        console.error("Error fetching patient details:", err);
    }
}

async function openEditPatientModal(id) {
    const patient = cachedPatients.find(p => p.patient_id === id);
    if (!patient) return;
    document.getElementById('edit-p-id').value = patient.patient_id;
    document.getElementById('edit-p-name').value = patient.name;
    document.getElementById('edit-p-dob').value = patient.dob;
    document.getElementById('edit-p-gender').value = patient.gender;
    document.getElementById('edit-p-blood').value = patient.blood_group || 'O+';
    document.getElementById('edit-p-phone').value = patient.phone;
    document.getElementById('edit-p-email').value = patient.email || '';
    document.getElementById('edit-p-address').value = patient.address;
    document.getElementById('edit-p-emergency').value = patient.emergency_contact;
    document.getElementById('edit-p-status').value = patient.status || 'Outpatient';
    openModal('modal-edit-patient');
}

async function submitEditPatient(e) {
    e.preventDefault();
    const id = document.getElementById('edit-p-id').value;
    const payload = {
        name: document.getElementById('edit-p-name').value,
        dob: document.getElementById('edit-p-dob').value,
        gender: document.getElementById('edit-p-gender').value,
        blood_group: document.getElementById('edit-p-blood').value,
        phone: document.getElementById('edit-p-phone').value,
        email: document.getElementById('edit-p-email').value,
        address: document.getElementById('edit-p-address').value,
        emergency_contact: document.getElementById('edit-p-emergency').value,
        status: document.getElementById('edit-p-status').value
    };

    try {
        const res = await fetch(`/api/patients/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Patient record updated in SQL Database!");
            closeModal('modal-edit-patient');
            fetchPatients();
            loadDashboardStats();
        } else {
            const errData = await res.json();
            alert("Error: " + errData.detail);
        }
    } catch (err) {
        console.error(err);
    }
}

async function submitPatient(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('p-name').value,
        dob: document.getElementById('p-dob').value,
        gender: document.getElementById('p-gender').value,
        blood_group: document.getElementById('p-blood').value,
        phone: document.getElementById('p-phone').value,
        email: document.getElementById('p-email').value,
        address: document.getElementById('p-address').value,
        emergency_contact: document.getElementById('p-emergency').value
    };

    try {
        const res = await fetch('/api/patients', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Patient registered successfully in SQL Database!");
            closeModal('modal-patient');
            document.getElementById('form-patient').reset();
            fetchPatients();
            loadDashboardStats();
        } else {
            const errData = await res.json();
            alert("Error: " + errData.detail);
        }
    } catch (err) {
        console.error(err);
    }
}

async function deletePatient(id, name) {
    if (!confirm(`Are you sure you want to delete patient "${name}" (#P-${id}) from the SQL database?`)) return;
    try {
        const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Patient "${name}" deleted from SQL Database!`);
            fetchPatients();
            loadDashboardStats();
        } else {
            const errData = await res.json();
            alert("Cannot delete patient: " + errData.detail);
        }
    } catch (err) {
        console.error(err);
    }
}

// -------------------------------------------------------------
// DOCTORS CONTROLLER
// -------------------------------------------------------------
async function fetchDoctors() {
    try {
        const res = await fetch('/api/doctors');
        cachedDoctors = await res.json();
        renderDoctorsGrid(cachedDoctors);
        updateDoctorSelects();
    } catch (err) {
        console.error(err);
    }
}

function renderDoctorsGrid(doctors) {
    const container = document.getElementById('doctors-grid');
    if (!container) return;
    if (doctors.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);">No doctors registered.</p>`;
        return;
    }
    container.innerHTML = doctors.map(d => `
        <div class="card-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h3 style="font-size:1.1rem; color:var(--text-primary); font-family:'Outfit';">${escapeHtml(d.name)}</h3>
                    <div style="font-size:0.82rem; color:var(--accent-blue); font-weight:600;">${escapeHtml(d.specialization)}</div>
                </div>
                ${getStatusBadge(d.status)}
            </div>
            <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">
                <p><i class="fa-solid fa-graduation-cap" style="width:16px;"></i> ${escapeHtml(d.qualification)}</p>
                <p><i class="fa-solid fa-hospital-user" style="width:16px;"></i> ${escapeHtml(d.department_name)} Department</p>
                <p><i class="fa-solid fa-envelope" style="width:16px;"></i> ${escapeHtml(d.email)}</p>
                <p><i class="fa-solid fa-phone" style="width:16px;"></i> ${escapeHtml(d.phone)}</p>
            </div>
            <div style="margin-top:auto; padding-top:0.75rem; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem; color:var(--text-muted);">Consulting Fee:</span>
                <strong style="color:var(--accent-emerald); font-size:1rem;">$${d.consulting_fee.toFixed(2)}</strong>
            </div>
        </div>
    `).join('');
}

async function fetchDepartments() {
    try {
        const res = await fetch('/api/departments');
        cachedDepartments = await res.json();
        const select = document.getElementById('doc-dept');
        if (select) {
            select.innerHTML = cachedDepartments.map(d => `<option value="${d.department_id}">${escapeHtml(d.name)} (${d.code})</option>`).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

async function submitDoctor(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('doc-name').value,
        specialization: document.getElementById('doc-spec').value,
        qualification: document.getElementById('doc-qual').value,
        email: document.getElementById('doc-email').value,
        phone: document.getElementById('doc-phone').value,
        department_id: parseInt(document.getElementById('doc-dept').value),
        consulting_fee: parseFloat(document.getElementById('doc-fee').value)
    };

    try {
        const res = await fetch('/api/doctors', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Doctor profile registered successfully!");
            closeModal('modal-doctor');
            document.getElementById('form-doctor').reset();
            fetchDoctors();
            loadDashboardStats();
        } else {
            const errData = await res.json();
            alert("Error: " + errData.detail);
        }
    } catch (err) {
        console.error(err);
    }
}

// -------------------------------------------------------------
// APPOINTMENTS CONTROLLER
// -------------------------------------------------------------
async function fetchAppointments() {
    try {
        const res = await fetch('/api/appointments');
        const appointments = await res.json();
        renderAppointmentsTable(appointments);
    } catch (err) {
        console.error(err);
    }
}

function renderAppointmentsTable(appointments) {
    const tbody = document.getElementById('appointments-table-body');
    if (!tbody) return;
    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted);">No appointments found.</td></tr>`;
        return;
    }
    tbody.innerHTML = appointments.map(a => `
        <tr>
            <td>#APT-${a.appointment_id}</td>
            <td><strong>${escapeHtml(a.patient_name)}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(a.patient_phone)}</span></td>
            <td><strong>${escapeHtml(a.doctor_name)}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(a.specialization)}</span></td>
            <td>${escapeHtml(a.department_name)}</td>
            <td>${a.appointment_date}<br><span style="font-size:0.75rem; color:var(--text-muted);">${a.time_slot}</span></td>
            <td>${escapeHtml(a.reason)}</td>
            <td>${getStatusBadge(a.status)}</td>
            <td>
                ${a.status === 'Scheduled' ? `
                    <button class="btn btn-secondary btn-sm" onclick="updateAppointmentStatus(${a.appointment_id}, 'Completed')" title="Mark Completed">
                        <i class="fa-solid fa-check" style="color:var(--accent-emerald);"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="updateAppointmentStatus(${a.appointment_id}, 'Cancelled')" title="Cancel Appointment">
                        <i class="fa-solid fa-xmark" style="color:var(--accent-rose);"></i>
                    </button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

async function updateAppointmentStatus(id, status) {
    try {
        const res = await fetch(`/api/appointments/${id}/status?status=${status}`, { method: 'PUT' });
        if (res.ok) {
            showToast(`Appointment status updated to ${status}`);
            fetchAppointments();
            loadDashboardStats();
        }
    } catch (err) {
        console.error(err);
    }
}

async function submitAppointment(e) {
    e.preventDefault();
    const payload = {
        patient_id: parseInt(document.getElementById('app-patient').value),
        doctor_id: parseInt(document.getElementById('app-doctor').value),
        appointment_date: document.getElementById('app-date').value,
        time_slot: document.getElementById('app-slot').value,
        reason: document.getElementById('app-reason').value
    };

    try {
        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Appointment scheduled successfully!");
            closeModal('modal-appointment');
            document.getElementById('form-appointment').reset();
            fetchAppointments();
            loadDashboardStats();
        } else {
            const errData = await res.json();
            alert("Error: " + errData.detail);
        }
    } catch (err) {
        console.error(err);
    }
}

// -------------------------------------------------------------
// MEDICAL RECORDS CONTROLLER
// -------------------------------------------------------------
async function fetchMedicalRecords() {
    try {
        const res = await fetch('/api/medical-records');
        const records = await res.json();
        const tbody = document.getElementById('records-table-body');
        if (!tbody) return;
        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No EHR records logged yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>#REC-${r.record_id}</td>
                <td><strong>${escapeHtml(r.patient_name)}</strong></td>
                <td>${escapeHtml(r.doctor_name)}</td>
                <td>${r.record_date}</td>
                <td>
                    <strong style="color:var(--accent-blue);">${escapeHtml(r.diagnosis)}</strong>
                    <div style="font-size:0.8rem; color:var(--text-secondary); mt-1;">Treatment: ${escapeHtml(r.treatment)}</div>
                </td>
                <td>${r.prescriptions_summary ? `<span class="badge badge-info">${escapeHtml(r.prescriptions_summary)}</span>` : '<span style="color:var(--text-muted);">None</span>'}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function submitMedicalRecord(e) {
    e.preventDefault();
    const payload = {
        patient_id: parseInt(document.getElementById('rec-patient').value),
        doctor_id: parseInt(document.getElementById('rec-doctor').value),
        symptoms: document.getElementById('rec-symptoms').value,
        diagnosis: document.getElementById('rec-diagnosis').value,
        treatment: document.getElementById('rec-treatment').value,
        medicine_name: document.getElementById('rec-med-name').value || null,
        dosage: document.getElementById('rec-dosage').value || null,
        frequency: document.getElementById('rec-freq').value || null,
        duration_days: parseInt(document.getElementById('rec-days').value) || 7
    };

    try {
        const res = await fetch('/api/medical-records', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Clinical Record & Prescription logged successfully!");
            closeModal('modal-record');
            document.getElementById('form-record').reset();
            fetchMedicalRecords();
        } else {
            const errData = await res.json();
            alert("Error: " + errData.detail);
        }
    } catch (err) {
        console.error(err);
    }
}

// -------------------------------------------------------------
// BILLING CONTROLLER
// -------------------------------------------------------------
async function fetchBilling() {
    try {
        const res = await fetch('/api/billing');
        const bills = await res.json();
        const tbody = document.getElementById('billing-table-body');
        if (!tbody) return;
        if (bills.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted);">No invoices generated yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = bills.map(b => `
            <tr>
                <td>#INV-${b.bill_id}</td>
                <td><strong>${escapeHtml(b.patient_name)}</strong></td>
                <td>${b.bill_date}</td>
                <td>$${b.gross_amount.toFixed(2)}</td>
                <td>$${b.discount.toFixed(2)}</td>
                <td><strong style="color:var(--accent-emerald); font-size:1rem;">$${b.net_amount.toFixed(2)}</strong></td>
                <td><span class="badge badge-info">${b.payment_mode}</span></td>
                <td>${getStatusBadge(b.payment_status)}</td>
                <td>
                    ${b.payment_status === 'Pending' ? `
                        <button class="btn btn-secondary btn-sm" onclick="updateBillingStatus(${b.bill_id}, 'Paid')" title="Mark as Paid">
                            <i class="fa-solid fa-dollar-sign" style="color:var(--accent-emerald);"></i> Pay
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function updateBillingStatus(billId, status) {
    try {
        const res = await fetch(`/api/billing/${billId}/status?status=${status}&mode=Credit%20Card`, { method: 'PUT' });
        if (res.ok) {
            showToast("Payment status updated to Paid!");
            fetchBilling();
            loadDashboardStats();
        }
    } catch (err) {
        console.error(err);
    }
}

async function submitBilling(e) {
    e.preventDefault();
    const payload = {
        patient_id: parseInt(document.getElementById('bill-patient').value),
        gross_amount: parseFloat(document.getElementById('bill-gross').value),
        discount: parseFloat(document.getElementById('bill-discount').value) || 0,
        payment_status: document.getElementById('bill-status').value,
        payment_mode: document.getElementById('bill-mode').value
    };

    try {
        const res = await fetch('/api/billing', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Billing Invoice generated!");
            closeModal('modal-billing');
            document.getElementById('form-billing').reset();
            fetchBilling();
            loadDashboardStats();
        } else {
            const errData = await res.json();
            alert("Error: " + errData.detail);
        }
    } catch (err) {
        console.error(err);
    }
}

// -------------------------------------------------------------
// ROOMS CONTROLLER
// -------------------------------------------------------------
async function fetchRooms() {
    try {
        const res = await fetch('/api/rooms');
        const rooms = await res.json();
        const container = document.getElementById('rooms-grid');
        if (!container) return;
        container.innerHTML = rooms.map(r => `
            <div class="card-item">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 style="font-size:1.1rem; color:var(--text-primary); font-family:'Outfit';">Room ${r.room_number}</h3>
                        <div style="font-size:0.82rem; color:var(--accent-blue); font-weight:600;">${r.room_type}</div>
                    </div>
                    ${getStatusBadge(r.status)}
                </div>
                <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">
                    <p><i class="fa-solid fa-hospital-user"></i> Department: ${escapeHtml(r.department_name)}</p>
                    <p><i class="fa-solid fa-tag"></i> Daily Rate: <strong>$${r.daily_rate.toFixed(2)}/day</strong></p>
                </div>
                <div style="margin-top:auto; padding-top:0.75rem; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn btn-secondary btn-sm" onclick="toggleRoomStatus(${r.room_id}, '${r.status === 'Available' ? 'Occupied' : 'Available'}')">
                        ${r.status === 'Available' ? 'Assign Bed' : 'Mark Available'}
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function toggleRoomStatus(roomId, newStatus) {
    try {
        const res = await fetch(`/api/rooms/${roomId}/status?status=${newStatus}`, { method: 'PUT' });
        if (res.ok) {
            showToast(`Room #${roomId} status changed to ${newStatus}`);
            fetchRooms();
            loadDashboardStats();
        }
    } catch (err) {
        console.error(err);
    }
}

// -------------------------------------------------------------
// LIVE SQL CONSOLE CONTROLLER
// -------------------------------------------------------------
async function executeConsoleSQL() {
    const sql = document.getElementById('sql-input').value;
    const msgDiv = document.getElementById('sql-result-message');
    const tableContainer = document.getElementById('sql-table-container');
    const thead = document.getElementById('sql-thead');
    const tbody = document.getElementById('sql-tbody');

    msgDiv.innerText = "Executing SQL query...";
    msgDiv.style.color = "var(--accent-blue)";

    try {
        const res = await fetch('/api/sql-console', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sql })
        });
        const data = await res.json();

        msgDiv.innerText = data.message;
        msgDiv.style.color = data.message.startsWith("Error") ? "var(--accent-rose)" : "var(--accent-emerald)";

        if (data.columns && data.columns.length > 0) {
            tableContainer.style.display = 'block';
            thead.innerHTML = `<tr>${data.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
            tbody.innerHTML = data.rows.map(row => `
                <tr>${row.map(cell => `<td>${escapeHtml(cell !== null ? String(cell) : 'NULL')}</td>`).join('')}</tr>
            `).join('');
        } else {
            tableContainer.style.display = 'none';
        }
    } catch (err) {
        msgDiv.innerText = "Execution failed: " + err.message;
        msgDiv.style.color = "var(--accent-rose)";
    }
}

function setSampleSQL(option) {
    const editor = document.getElementById('sql-input');
    if (option === 1) {
        editor.value = `SELECT p.name AS Patient, p.phone, d.name AS Doctor, d.specialization, a.appointment_date, a.status\nFROM appointments a\nJOIN patients p ON a.patient_id = p.patient_id\nJOIN doctors d ON a.doctor_id = d.doctor_id;`;
    } else if (option === 2) {
        editor.value = `SELECT payment_status, COUNT(*) as Total_Invoices, SUM(gross_amount) as Gross, SUM(net_amount) as Net_Realized\nFROM billing\nGROUP BY payment_status;`;
    } else if (option === 3) {
        editor.value = `SELECT name, sql FROM sqlite_master WHERE type='table';`;
    }
}

// -------------------------------------------------------------
// HELPER FUNCTIONS & MODAL CONTROLLERS
// -------------------------------------------------------------
function updatePatientSelects() {
    const selects = ['app-patient', 'rec-patient', 'bill-patient'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = cachedPatients.map(p => `<option value="${p.patient_id}">${escapeHtml(p.name)} (#P-${p.patient_id})</option>`).join('');
        }
    });
}

function updateDoctorSelects() {
    const selects = ['app-doctor', 'rec-doctor'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = cachedDoctors.map(d => `<option value="${d.doctor_id}">${escapeHtml(d.name)} (${escapeHtml(d.specialization)})</option>`).join('');
        }
    });
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

function getStatusBadge(status) {
    const maps = {
        'Active': 'badge-success',
        'Available': 'badge-success',
        'Paid': 'badge-success',
        'Completed': 'badge-success',
        'Outpatient': 'badge-info',
        'Scheduled': 'badge-info',
        'Inpatient': 'badge-warning',
        'Pending': 'badge-warning',
        'On Leave': 'badge-warning',
        'Occupied': 'badge-warning',
        'Partially Paid': 'badge-warning',
        'Cancelled': 'badge-danger',
        'Discharged': 'badge-danger',
        'Inactive': 'badge-danger'
    };
    const cls = maps[status] || 'badge-info';
    return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--accent-emerald);"></i> <span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
