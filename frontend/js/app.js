/* ==========================================================================
   STUDENT MANAGEMENT SYSTEM - FRONTEND APP JAVASCRIPT
   ========================================================================== */

const API_BASE_URL = '/api/v1';

// App Global State
const state = {
  token: localStorage.getItem('jwt_token') || null,
  user: JSON.parse(localStorage.getItem('jwt_user')) || null,
  departments: [],
  subjects: [],
  students: [],
  charts: {
    deptChart: null,
    yearChart: null
  }
};

// ==========================================
// 1. API HELPER WRAPPER
// ==========================================
async function apiCall(endpoint, method = 'GET', data = null, isBlob = false) {
  const headers = {};
  
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = { method, headers };

  if (data && !(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (response.status === 401) {
      // Unauthorized or Token Expired
      logout();
      showAuthModal();
      throw new Error('Authentication required. Please log in.');
    }

    if (isBlob) {
      if (!response.ok) throw new Error('Failed to download file report');
      return await response.blob();
    }

    const json = await response.json();

    if (!response.ok) {
      const errorMsg = json.detail || 'API request failed';
      throw new Error(errorMsg);
    }

    return json;
  } catch (err) {
    console.error(`API Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
}

// ==========================================
// 2. TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
  const iconColor = type === 'success' ? 'var(--teal-accent)' : 'var(--rose-accent)';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}" style="color: ${iconColor}; font-size: 1.2rem;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// 3. AUTHENTICATION & LOGIN
// ==========================================
function checkAuth() {
  if (!state.token || !state.user) {
    showAuthModal();
  } else {
    hideAuthModal();
    updateUserBadge();
    initDashboard();
  }
}

function showAuthModal() {
  document.getElementById('auth-modal').classList.add('active');
}

function hideAuthModal() {
  document.getElementById('auth-modal').classList.remove('active');
}

function updateUserBadge() {
  if (state.user) {
    document.getElementById('user-display-name').textContent = state.user.full_name || 'Admin User';
    document.getElementById('user-display-role').textContent = state.user.role.toUpperCase();
    document.getElementById('user-avatar').textContent = (state.user.full_name || 'A').charAt(0).toUpperCase();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    state.token = res.access_token;
    state.user = res.user;

    localStorage.setItem('jwt_token', res.access_token);
    localStorage.setItem('jwt_user', JSON.stringify(res.user));

    showToast('Login successful! Welcome to College Portal.');
    hideAuthModal();
    updateUserBadge();
    initDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('jwt_user');
  showAuthModal();
  showToast('Logged out successfully.');
}

// ==========================================
// 4. TAB NAVIGATION
// ==========================================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.getElementById(targetTab).classList.add('active');

      // Update Page Title
      const titleMap = {
        'dashboard-tab': 'Dashboard Overview',
        'students-tab': 'Student Records & Management',
        'academics-tab': 'Academic Performance & Marks',
        'attendance-tab': 'Student Attendance Tracking',
        'departments-tab': 'College Departments & Subjects',
        'reports-tab': 'Transcript & PDF Report Generation'
      };
      document.getElementById('page-title').textContent = titleMap[targetTab] || 'Dashboard';

      // Load specific tab data
      if (targetTab === 'dashboard-tab') loadDashboardStats();
      if (targetTab === 'students-tab') loadStudents();
      if (targetTab === 'academics-tab') prepareAcademicsTab();
      if (targetTab === 'attendance-tab') prepareAttendanceTab();
      if (targetTab === 'departments-tab') loadDepartmentsAndSubjects();
      if (targetTab === 'reports-tab') prepareReportsTab();
    });
  });
}

// ==========================================
// 5. DASHBOARD & CHARTS
// ==========================================
async function initDashboard() {
  await loadDepartmentsAndSubjects(false);
  await loadDashboardStats();
}

async function loadDashboardStats() {
  try {
    const stats = await apiCall('/dashboard/stats');

    document.getElementById('dash-total-students').textContent = stats.total_students;
    document.getElementById('dash-avg-cgpa').textContent = stats.average_college_cgpa.toFixed(2);
    document.getElementById('dash-att-rate').textContent = `${stats.overall_attendance_rate}%`;
    document.getElementById('dash-total-depts').textContent = stats.total_departments;

    // Render Charts
    renderDeptChart(stats.department_distribution);
    renderYearChart(stats.year_distribution);

    // Render Top Performers Table
    renderTopPerformers(stats.top_performers);

    // Render Low Attendance Table
    renderLowAttendanceAlerts(stats.low_attendance_alerts);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderDeptChart(data) {
  const ctx = document.getElementById('deptChart').getContext('2d');
  if (state.charts.deptChart) state.charts.deptChart.destroy();

  const labels = data.map(d => d.department_code);
  const values = data.map(d => d.student_count);

  state.charts.deptChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8' } }
      }
    }
  });
}

function renderYearChart(data) {
  const ctx = document.getElementById('yearChart').getContext('2d');
  if (state.charts.yearChart) state.charts.yearChart.destroy();

  const labels = data.map(d => `Year ${d.year}`);
  const values = data.map(d => d.student_count);

  state.charts.yearChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Students Count',
        data: values,
        backgroundColor: 'rgba(99, 102, 241, 0.65)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderTopPerformers(performers) {
  const tbody = document.querySelector('#top-performers-table tbody');
  tbody.innerHTML = '';

  if (performers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">No academic marks recorded yet.</td></tr>`;
    return;
  }

  performers.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${p.roll_number}</code></td>
      <td style="font-weight:600;">${p.name}</td>
      <td><span class="badge badge-primary">${p.department_code}</span></td>
      <td><span class="badge badge-success">${p.cgpa} / 10.0</span></td>
      <td>${p.percentage}%</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLowAttendanceAlerts(alerts) {
  const tbody = document.querySelector('#low-attendance-table tbody');
  tbody.innerHTML = '';

  if (alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--teal-accent)"><i class="fa-solid fa-circle-check"></i> All students have satisfactory attendance (&ge;75%).</td></tr>`;
    return;
  }

  alerts.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${a.roll_number}</code></td>
      <td style="font-weight:600;">${a.name}</td>
      <td><span class="badge badge-primary">${a.department_code}</span></td>
      <td><span class="badge badge-danger">${a.attendance_percentage}%</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewStudentAttendance(${a.id})">
          View Log
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 6. STUDENTS MANAGEMENT
// ==========================================
async function loadStudents() {
  const deptId = document.getElementById('filter-student-dept').value;
  const year = document.getElementById('filter-student-year').value;
  const section = document.getElementById('filter-student-section').value;
  const search = document.getElementById('global-search-input').value;

  let queryParams = [];
  if (deptId) queryParams.push(`department_id=${deptId}`);
  if (year) queryParams.push(`year=${year}`);
  if (section) queryParams.push(`section=${section}`);
  if (search) queryParams.push(`search=${encodeURIComponent(search)}`);

  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

  try {
    state.students = await apiCall(`/students${queryString}`);
    renderStudentsTable(state.students);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderStudentsTable(students) {
  const tbody = document.querySelector('#students-data-table tbody');
  tbody.innerHTML = '';

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">No matching student records found.</td></tr>`;
    return;
  }

  students.forEach(st => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${st.roll_number}</code></td>
      <td style="font-weight:600;">${st.name}</td>
      <td><span class="badge badge-primary">${st.department.code}</span></td>
      <td>${st.course} - Year ${st.year} (${st.section})</td>
      <td>${st.email}</td>
      <td>${st.gender}</td>
      <td><span class="badge badge-success">${st.status}</span></td>
      <td>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn btn-sm btn-secondary" onclick="editStudentModal(${st.id})" title="Edit Student">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-sm btn-secondary" onclick="downloadStudentPDF(${st.id})" title="Download PDF Transcript">
            <i class="fa-solid fa-file-pdf" style="color:var(--rose-accent)"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteStudent(${st.id})" title="Delete Student">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddStudentModal() {
  document.getElementById('student-modal-title').textContent = 'Add New Student';
  document.getElementById('student-form').reset();
  document.getElementById('student-id-input').value = '';
  document.getElementById('student-modal').classList.add('active');
}

function editStudentModal(id) {
  const student = state.students.find(s => s.id === id);
  if (!student) return;

  document.getElementById('student-modal-title').textContent = 'Edit Student Details';
  document.getElementById('student-id-input').value = student.id;
  document.getElementById('st-roll').value = student.roll_number;
  document.getElementById('st-name').value = student.name;
  document.getElementById('st-dob').value = student.dob;
  document.getElementById('st-gender').value = student.gender;
  document.getElementById('st-email').value = student.email;
  document.getElementById('st-phone').value = student.phone;
  document.getElementById('st-department').value = student.department_id;
  document.getElementById('st-course').value = student.course;
  document.getElementById('st-year').value = student.year;
  document.getElementById('st-section').value = student.section;
  document.getElementById('st-address').value = student.address || '';

  document.getElementById('student-modal').classList.add('active');
}

async function handleSaveStudent(e) {
  e.preventDefault();
  const id = document.getElementById('student-id-input').value;
  const payload = {
    roll_number: document.getElementById('st-roll').value,
    name: document.getElementById('st-name').value,
    dob: document.getElementById('st-dob').value,
    gender: document.getElementById('st-gender').value,
    email: document.getElementById('st-email').value,
    phone: document.getElementById('st-phone').value,
    department_id: parseInt(document.getElementById('st-department').value),
    course: document.getElementById('st-course').value,
    year: parseInt(document.getElementById('st-year').value),
    section: document.getElementById('st-section').value,
    address: document.getElementById('st-address').value
  };

  try {
    if (id) {
      await apiCall(`/students/${id}`, 'PUT', payload);
      showToast('Student information updated successfully!');
    } else {
      await apiCall('/students', 'POST', payload);
      showToast('New student registered successfully!');
    }
    document.getElementById('student-modal').classList.remove('active');
    loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteStudent(id) {
  if (!confirm('Are you sure you want to delete this student record? This action cannot be undone.')) return;

  try {
    await apiCall(`/students/${id}`, 'DELETE');
    showToast('Student deleted successfully.');
    loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 7. ACADEMICS & MARKS MANAGEMENT
// ==========================================
async function prepareAcademicsTab() {
  if (state.students.length === 0) await loadStudents();
  populateStudentDropdowns();
  populateSubjectDropdowns();
}

function populateStudentDropdowns() {
  const selects = ['academic-student-select', 'att-student-select', 'mk-student', 'att-student', 'report-student-select'];
  selects.forEach(selectId => {
    const el = document.getElementById(selectId);
    if (!el) return;
    const currentVal = el.value;
    el.innerHTML = '<option value="">Select Student...</option>';
    state.students.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st.id;
      opt.textContent = `${st.roll_number} - ${st.name} (${st.department.code})`;
      el.appendChild(opt);
    });
    if (currentVal) el.value = currentVal;
  });
}

function populateSubjectDropdowns() {
  const selects = ['mk-subject', 'att-subject'];
  selects.forEach(selectId => {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = '<option value="">Select Subject...</option>';
    state.subjects.forEach(sb => {
      const opt = document.createElement('option');
      opt.value = sb.id;
      opt.textContent = `${sb.code} - ${sb.name} (Sem ${sb.semester})`;
      el.appendChild(opt);
    });
  });
}

async function loadStudentMarks(studentId) {
  if (!studentId) {
    document.getElementById('transcript-container').style.display = 'none';
    return;
  }

  try {
    const marks = await apiCall(`/marks/students/${studentId}`);
    const summary = await apiCall(`/marks/students/${studentId}/summary`);
    const student = state.students.find(s => s.id === parseInt(studentId));

    document.getElementById('transcript-container').style.display = 'block';
    document.getElementById('transcript-title').textContent = `Academic Transcript: ${student ? student.name : ''} (${student ? student.roll_number : ''})`;

    // Summary header cards
    const summaryBox = document.getElementById('transcript-summary-box');
    summaryBox.innerHTML = `
      <div class="stat-card">
        <div><div class="stat-label">Total Obtained</div><div class="stat-val">${summary.total_marks} / ${summary.max_marks}</div></div>
      </div>
      <div class="stat-card">
        <div><div class="stat-label">Percentage</div><div class="stat-val">${summary.percentage}%</div></div>
      </div>
      <div class="stat-card">
        <div><div class="stat-label">Cumulative GPA</div><div class="stat-val">${summary.cgpa} / 10.0</div></div>
      </div>
      <div class="stat-card">
        <div><div class="stat-label">Status</div><div class="stat-val"><span class="badge ${summary.status === 'Passed' ? 'badge-success' : 'badge-danger'}">${summary.status}</span></div></div>
      </div>
    `;

    // Marks table
    const tbody = document.querySelector('#transcript-marks-table tbody');
    tbody.innerHTML = '';
    if (marks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No marks recorded for this student yet.</td></tr>`;
      return;
    }

    marks.forEach(m => {
      const tr = document.createElement('tr');
      const gradeBadge = m.grade === 'F' ? 'badge-danger' : 'badge-success';
      tr.innerHTML = `
        <td><code>${m.subject.code}</code></td>
        <td style="font-weight:600;">${m.subject.name}</td>
        <td>Sem ${m.semester}</td>
        <td>${m.internal_marks}</td>
        <td>${m.external_marks}</td>
        <td style="font-weight:700; color:var(--primary);">${m.total_marks}</td>
        <td><span class="badge ${gradeBadge}">${m.grade}</span></td>
        <td>${m.grade_point}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSaveMark(e) {
  e.preventDefault();
  const payload = {
    student_id: parseInt(document.getElementById('mk-student').value),
    subject_id: parseInt(document.getElementById('mk-subject').value),
    semester: parseInt(document.getElementById('mk-semester').value),
    internal_marks: parseFloat(document.getElementById('mk-internal').value),
    external_marks: parseFloat(document.getElementById('mk-external').value)
  };

  try {
    await apiCall('/marks', 'POST', payload);
    showToast('Marks recorded and GPA auto-calculated successfully!');
    document.getElementById('mark-modal').classList.remove('active');
    
    // Refresh transcript if viewing current student
    const activeStudentId = document.getElementById('academic-student-select').value;
    if (activeStudentId == payload.student_id) {
      loadStudentMarks(activeStudentId);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 8. ATTENDANCE MANAGEMENT
// ==========================================
async function prepareAttendanceTab() {
  if (state.students.length === 0) await loadStudents();
  populateStudentDropdowns();
  populateSubjectDropdowns();
  document.getElementById('att-date').valueAsDate = new Date();
}

async function loadStudentAttendance(studentId) {
  if (!studentId) {
    document.getElementById('att-summary-container').style.display = 'none';
    return;
  }

  try {
    const summary = await apiCall(`/attendance/students/${studentId}`);
    
    document.getElementById('att-summary-container').style.display = 'block';
    document.getElementById('att-student-title').textContent = `Attendance Summary: ${summary.student_name} (${summary.roll_number}) - Overall: ${summary.overall_percentage}%`;

    const tbody = document.querySelector('#att-summary-table tbody');
    tbody.innerHTML = '';

    if (summary.subjects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No attendance records logged yet.</td></tr>`;
      return;
    }

    summary.subjects.forEach(s => {
      const isShortage = s.percentage < 75.0;
      const badgeClass = isShortage ? 'badge-danger' : 'badge-success';
      const statusText = isShortage ? 'Shortage (<75%)' : 'Satisfactory';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${s.subject_code}</code></td>
        <td style="font-weight:600;">${s.subject_name}</td>
        <td>${s.total_classes}</td>
        <td>${s.attended}</td>
        <td style="font-weight:700;">${s.percentage}%</td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSaveAttendance(e) {
  e.preventDefault();
  const payload = {
    student_id: parseInt(document.getElementById('att-student').value),
    subject_id: parseInt(document.getElementById('att-subject').value),
    date: document.getElementById('att-date').value,
    status: document.getElementById('att-status').value,
    remarks: 'Regular Class'
  };

  try {
    await apiCall('/attendance', 'POST', payload);
    showToast('Attendance logged successfully!');
    document.getElementById('attendance-modal').classList.remove('active');
    
    const activeStudentId = document.getElementById('att-student-select').value;
    if (activeStudentId == payload.student_id) {
      loadStudentAttendance(activeStudentId);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function viewStudentAttendance(studentId) {
  document.getElementById('nav-attendance').click();
  setTimeout(() => {
    document.getElementById('att-student-select').value = studentId;
    loadStudentAttendance(studentId);
  }, 100);
}

// ==========================================
// 9. DEPARTMENTS & SUBJECTS
// ==========================================
async function loadDepartmentsAndSubjects(renderTables = true) {
  try {
    state.departments = await apiCall('/departments');
    state.subjects = await apiCall('/subjects');

    // Populate department selects in forms
    const deptSelects = ['st-department', 'filter-student-dept', 'subj-dept'];
    deptSelects.forEach(selectId => {
      const el = document.getElementById(selectId);
      if (!el) return;
      const currentVal = el.value;
      el.innerHTML = selectId.startsWith('filter') ? '<option value="">All Departments</option>' : '<option value="">Select Department...</option>';
      state.departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.code} - ${d.name}`;
        el.appendChild(opt);
      });
      if (currentVal) el.value = currentVal;
    });

    if (renderTables) {
      renderDepartmentsTable(state.departments);
      renderSubjectsTable(state.subjects);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderDepartmentsTable(depts) {
  const tbody = document.querySelector('#depts-table tbody');
  tbody.innerHTML = '';
  depts.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge badge-primary">${d.code}</span></td>
      <td style="font-weight:600;">${d.name}</td>
      <td>${d.description || 'N/A'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${d.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSubjectsTable(subjs) {
  const tbody = document.querySelector('#subjects-table tbody');
  tbody.innerHTML = '';
  subjs.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${s.code}</code></td>
      <td style="font-weight:600;">${s.name}</td>
      <td><span class="badge badge-primary">${s.department.code}</span></td>
      <td>Semester ${s.semester}</td>
      <td>${s.credits} Credits</td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleSaveDepartment(e) {
  e.preventDefault();
  const payload = {
    code: document.getElementById('dept-code').value,
    name: document.getElementById('dept-name').value,
    description: document.getElementById('dept-desc').value
  };

  try {
    await apiCall('/departments', 'POST', payload);
    showToast('Department created successfully!');
    document.getElementById('dept-modal').classList.remove('active');
    loadDepartmentsAndSubjects(true);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteDepartment(id) {
  if (!confirm('Are you sure you want to delete this department? All associated subjects and students will be removed.')) return;
  try {
    await apiCall(`/departments/${id}`, 'DELETE');
    showToast('Department deleted.');
    loadDepartmentsAndSubjects(true);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSaveSubject(e) {
  e.preventDefault();
  const payload = {
    code: document.getElementById('subj-code').value,
    name: document.getElementById('subj-name').value,
    department_id: parseInt(document.getElementById('subj-dept').value),
    semester: parseInt(document.getElementById('subj-sem').value),
    credits: parseInt(document.getElementById('subj-credits').value)
  };

  try {
    await apiCall('/subjects', 'POST', payload);
    showToast('Subject created successfully!');
    document.getElementById('subject-modal').classList.remove('active');
    loadDepartmentsAndSubjects(true);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 10. PDF REPORT CARD DOWNLOAD
// ==========================================
async function prepareReportsTab() {
  if (state.students.length === 0) await loadStudents();
  populateStudentDropdowns();
}

async function downloadStudentPDF(studentId) {
  if (!studentId) return;

  try {
    showToast('Generating official PDF transcript report...');
    const blob = await apiCall(`/reports/students/${studentId}/pdf`, 'GET', null, true);
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Student_Transcript_${studentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    showToast('PDF Transcript downloaded successfully!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 11. EVENT LISTENERS INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  checkAuth();

  // Auth & Login
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('fill-demo-login-btn').addEventListener('click', () => {
    document.getElementById('login-email').value = 'admin@college.edu';
    document.getElementById('login-password').value = 'admin123';
  });

  // Modal Closers
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  // Top Action Buttons & Global Search
  document.getElementById('top-add-student-btn').addEventListener('click', openAddStudentModal);
  
  let searchTimeout;
  document.getElementById('global-search-input').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (document.getElementById('students-tab').classList.contains('active')) {
        loadStudents();
      } else {
        document.getElementById('nav-students').click();
      }
    }, 400);
  });

  // Student Filter Handlers
  ['filter-student-dept', 'filter-student-year', 'filter-student-section'].forEach(id => {
    document.getElementById(id).addEventListener('change', loadStudents);
  });

  document.getElementById('reset-student-filters-btn').addEventListener('click', () => {
    document.getElementById('filter-student-dept').value = '';
    document.getElementById('filter-student-year').value = '';
    document.getElementById('filter-student-section').value = '';
    document.getElementById('global-search-input').value = '';
    loadStudents();
  });

  // Forms Submit
  document.getElementById('student-form').addEventListener('submit', handleSaveStudent);
  document.getElementById('mark-form').addEventListener('submit', handleSaveMark);
  document.getElementById('attendance-form').addEventListener('submit', handleSaveAttendance);
  document.getElementById('dept-form').addEventListener('submit', handleSaveDepartment);
  document.getElementById('subject-form').addEventListener('submit', handleSaveSubject);

  // Academics Tab Selector
  document.getElementById('academic-student-select').addEventListener('change', (e) => {
    loadStudentMarks(e.target.value);
  });
  document.getElementById('open-add-mark-modal-btn').addEventListener('click', () => {
    document.getElementById('mark-modal').classList.add('active');
  });
  document.getElementById('download-transcript-pdf-btn').addEventListener('click', () => {
    const studentId = document.getElementById('academic-student-select').value;
    if (studentId) downloadStudentPDF(studentId);
  });

  // Attendance Tab Selector
  document.getElementById('att-student-select').addEventListener('change', (e) => {
    loadStudentAttendance(e.target.value);
  });
  document.getElementById('open-record-attendance-modal-btn').addEventListener('click', () => {
    document.getElementById('attendance-modal').classList.add('active');
  });

  // Department / Subject Triggers
  document.getElementById('open-add-dept-modal-btn').addEventListener('click', () => {
    document.getElementById('dept-modal').classList.add('active');
  });
  document.getElementById('open-add-subject-modal-btn').addEventListener('click', () => {
    document.getElementById('subject-modal').classList.add('active');
  });

  // PDF Report Download Trigger
  document.getElementById('generate-pdf-btn').addEventListener('click', () => {
    const studentId = document.getElementById('report-student-select').value;
    if (!studentId) {
      showToast('Please select a student from the dropdown list', 'error');
      return;
    }
    downloadStudentPDF(studentId);
  });
});
