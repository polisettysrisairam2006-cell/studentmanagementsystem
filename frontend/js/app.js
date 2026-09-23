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
    yearChart: null,
    spGpaChart: null,
    spAttendanceChart: null
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
    renderRoleSidebar();
    applyRolePermissions();
    
    // Automatically display matching dashboard for logged-in role
    const role = state.user.role;
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    if (role === 'admin') {
      const el = document.getElementById('admin-dashboard-tab');
      if (el) el.classList.add('active');
      document.getElementById('page-title').textContent = 'Admin Dashboard';
      loadAdminDashboard();
    } else if (role === 'faculty' || role === 'staff') {
      const el = document.getElementById('faculty-dashboard-tab');
      if (el) el.classList.add('active');
      document.getElementById('page-title').textContent = 'Faculty Dashboard';
      loadFacultyDashboard();
    } else if (role === 'student') {
      const el = document.getElementById('student-dashboard-tab');
      if (el) el.classList.add('active');
      document.getElementById('page-title').textContent = 'Student Dashboard';
      loadStudentDashboard();
    }
  }
}

function renderRoleSidebar() {
  const navMenu = document.getElementById('sidebar-nav-menu');
  if (!navMenu || !state.user) return;

  const role = state.user.role;
  let items = [];

  if (role === 'admin') {
    items = [
      { id: 'nav-admin-dashboard', tab: 'admin-dashboard-tab', icon: 'fa-chart-pie', text: 'Dashboard', active: true },
      { id: 'nav-students', tab: 'students-tab', icon: 'fa-user-graduate', text: 'Students' },
      { id: 'nav-academics', tab: 'academics-tab', icon: 'fa-book-open-reader', text: 'Academics & Marks' },
      { id: 'nav-attendance', tab: 'attendance-tab', icon: 'fa-calendar-check', text: 'Attendance' },
      { id: 'nav-departments', tab: 'departments-tab', icon: 'fa-building-columns', text: 'Departments & Subjects' },
      { id: 'nav-reports', tab: 'reports-tab', icon: 'fa-file-pdf', text: 'PDF Reports' }
    ];
  } else if (role === 'faculty' || role === 'staff') {
    items = [
      { id: 'nav-faculty-dashboard', tab: 'faculty-dashboard-tab', icon: 'fa-chart-pie', text: 'Dashboard', active: true },
      { id: 'nav-students', tab: 'students-tab', icon: 'fa-user-graduate', text: 'Students' },
      { id: 'nav-academics', tab: 'academics-tab', icon: 'fa-book-open-reader', text: 'Marks' },
      { id: 'nav-attendance', tab: 'attendance-tab', icon: 'fa-calendar-check', text: 'Attendance' },
      { id: 'nav-departments', tab: 'departments-tab', icon: 'fa-building-columns', text: 'Academic Information' },
      { id: 'nav-reports', tab: 'reports-tab', icon: 'fa-file-pdf', text: 'Reports' }
    ];
  } else if (role === 'student') {
    items = [
      { id: 'nav-student-dashboard', tab: 'student-dashboard-tab', icon: 'fa-chart-pie', text: 'Dashboard', active: true },
      { id: 'nav-student-profile', tab: 'student-dashboard-tab', section: 'sp-profile-card', icon: 'fa-id-card', text: 'My Profile' },
      { id: 'nav-student-marks', tab: 'student-dashboard-tab', section: 'sp-marks-card', icon: 'fa-graduation-cap', text: 'My Marks' },
      { id: 'nav-student-attendance', tab: 'student-dashboard-tab', section: 'sp-attendance-card', icon: 'fa-calendar-check', text: 'My Attendance' },
      { id: 'nav-student-transcript', tab: 'student-dashboard-tab', action: 'download-transcript', icon: 'fa-file-pdf', text: 'My Transcript' }
    ];
  }

  navMenu.innerHTML = items.map(item => `
    <a class="nav-item ${item.active ? 'active' : ''}" data-tab="${item.tab}" ${item.section ? `data-section="${item.section}"` : ''} ${item.action ? `data-action="${item.action}"` : ''} id="${item.id}">
      <i class="fa-solid ${item.icon}"></i>
      <span>${item.text}</span>
    </a>
  `).join('');

  initNavigation();
}

function showAuthModal() {
  const appCont = document.getElementById('app-container');
  if (appCont) appCont.style.display = 'none';
  document.getElementById('auth-modal').classList.add('active');
}

function hideAuthModal() {
  const appCont = document.getElementById('app-container');
  if (appCont) appCont.style.display = 'flex';
  document.getElementById('auth-modal').classList.remove('active');
}

function updateUserBadge() {
  if (state.user) {
    document.getElementById('user-display-name').textContent = state.user.full_name || 'User';
    document.getElementById('user-display-role').textContent = state.user.role.toUpperCase();
    document.getElementById('user-avatar').textContent = (state.user.full_name || 'U').charAt(0).toUpperCase();
  }
}

function applyRolePermissions() {
  if (!state.user) return;
  const role = state.user.role;

  const topAddBtn = document.getElementById('top-add-student-btn');
  const globalSearchBox = document.querySelector('.search-box');
  const openAddMarkBtn = document.getElementById('open-add-mark-modal-btn');
  const openRecordAttBtn = document.getElementById('open-record-attendance-modal-btn');
  const openAddDeptBtn = document.getElementById('open-add-dept-modal-btn');
  const openAddSubjBtn = document.getElementById('open-add-subject-modal-btn');

  if (role === 'student') {
    if (topAddBtn) topAddBtn.style.display = 'none';
    if (globalSearchBox) globalSearchBox.style.display = 'none';
  } else if (role === 'faculty' || role === 'staff') {
    if (topAddBtn) topAddBtn.style.display = 'none';
    if (globalSearchBox) globalSearchBox.style.display = 'flex';
    if (openAddDeptBtn) openAddDeptBtn.style.display = 'none';
    if (openAddSubjBtn) openAddSubjBtn.style.display = 'none';
    if (openAddMarkBtn) openAddMarkBtn.style.display = 'inline-flex';
    if (openRecordAttBtn) openRecordAttBtn.style.display = 'inline-flex';
  } else {
    // Admin
    if (topAddBtn) topAddBtn.style.display = 'inline-flex';
    if (globalSearchBox) globalSearchBox.style.display = 'flex';
    if (openAddDeptBtn) openAddDeptBtn.style.display = 'inline-flex';
    if (openAddSubjBtn) openAddSubjBtn.style.display = 'inline-flex';
    if (openAddMarkBtn) openAddMarkBtn.style.display = 'inline-flex';
    if (openRecordAttBtn) openRecordAttBtn.style.display = 'inline-flex';
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
    renderRoleSidebar();
    applyRolePermissions();
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const full_name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;

  try {
    await apiCall('/auth/register', 'POST', { full_name, email, password, role });
    showToast('Account registered successfully! Signing in...');

    const res = await apiCall('/auth/login', 'POST', { email, password });
    state.token = res.access_token;
    state.user = res.user;

    localStorage.setItem('jwt_token', res.access_token);
    localStorage.setItem('jwt_user', JSON.stringify(res.user));

    hideAuthModal();
    updateUserBadge();
    renderRoleSidebar();
    applyRolePermissions();
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initAuthTabs() {
  const loginTabBtn = document.getElementById('tab-login-btn');
  const registerTabBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const modalTitle = document.getElementById('auth-modal-title');

  if (loginTabBtn && registerTabBtn) {
    loginTabBtn.addEventListener('click', () => {
      loginTabBtn.classList.add('active');
      registerTabBtn.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      if (modalTitle) modalTitle.textContent = 'Portal Authentication';
    });

    registerTabBtn.addEventListener('click', () => {
      registerTabBtn.classList.add('active');
      loginTabBtn.classList.remove('active');
      registerForm.style.display = 'block';
      loginForm.style.display = 'none';
      if (modalTitle) modalTitle.textContent = 'Register New Account';
    });
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
// 4. TAB NAVIGATION & ROLE DASHBOARDS
// ==========================================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.onclick = (e) => {
      const targetTab = item.getAttribute('data-tab');
      const action = item.getAttribute('data-action');
      const sectionId = item.getAttribute('data-section');

      if (action === 'download-transcript') {
        downloadMyTranscriptPDF();
        return;
      }

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      const targetElement = document.getElementById(targetTab);
      if (targetElement) targetElement.classList.add('active');

      // Update Page Title
      const titleMap = {
        'admin-dashboard-tab': 'Admin Dashboard',
        'faculty-dashboard-tab': 'Faculty Dashboard',
        'student-dashboard-tab': 'Student Dashboard',
        'students-tab': 'Student Records & Management',
        'academics-tab': 'Academic Performance & Marks',
        'attendance-tab': 'Student Attendance Tracking',
        'departments-tab': 'College Departments & Subjects',
        'reports-tab': 'Transcript & PDF Report Generation'
      };
      document.getElementById('page-title').textContent = titleMap[targetTab] || 'Dashboard';

      // Load specific tab data
      if (targetTab === 'admin-dashboard-tab') loadAdminDashboard();
      if (targetTab === 'faculty-dashboard-tab') loadFacultyDashboard();
      if (targetTab === 'student-dashboard-tab') loadStudentDashboard();
      if (targetTab === 'students-tab') loadStudents();
      if (targetTab === 'academics-tab') prepareAcademicsTab();
      if (targetTab === 'attendance-tab') prepareAttendanceTab();
      if (targetTab === 'departments-tab') loadDepartmentsAndSubjects();
      if (targetTab === 'reports-tab') prepareReportsTab();

      // Section scroll if requested
      if (sectionId) {
        const targetSec = document.getElementById(sectionId);
        if (targetSec) {
          setTimeout(() => {
            targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    };
  });
}

// ==========================================
// 5. ADMIN DASHBOARD
// ==========================================
async function loadAdminDashboard() {
  try {
    const stats = await apiCall('/dashboard/stats');

    const totalStudentsEl = document.getElementById('admin-dash-total-students');
    if (totalStudentsEl) totalStudentsEl.textContent = stats.total_students;

    const avgCgpaEl = document.getElementById('admin-dash-avg-cgpa');
    if (avgCgpaEl) avgCgpaEl.textContent = stats.average_college_cgpa.toFixed(2);

    const attRateEl = document.getElementById('admin-dash-att-rate');
    if (attRateEl) attRateEl.textContent = `${stats.overall_attendance_rate}%`;

    const totalDeptsEl = document.getElementById('admin-dash-total-depts');
    if (totalDeptsEl) totalDeptsEl.textContent = stats.total_departments;

    const totalSubjEl = document.getElementById('admin-dash-total-subjects');
    if (totalSubjEl) totalSubjEl.textContent = stats.total_subjects;

    renderAdminDeptChart(stats.department_distribution);
    renderAdminYearChart(stats.year_distribution);
    renderAdminTopPerformers(stats.top_performers);
    renderAdminLowAttendanceAlerts(stats.low_attendance_alerts);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAdminDeptChart(data) {
  const canvas = document.getElementById('adminDeptChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
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

function renderAdminYearChart(data) {
  const canvas = document.getElementById('adminYearChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
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

function renderAdminTopPerformers(performers) {
  const tbody = document.querySelector('#admin-top-performers-table tbody');
  if (!tbody) return;
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

function renderAdminLowAttendanceAlerts(alerts) {
  const tbody = document.querySelector('#admin-low-attendance-table tbody');
  if (!tbody) return;
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
        <button class="btn btn-sm btn-secondary" onclick="viewStudentAttendanceFromFaculty(${a.id})">
          View Log
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 6. FACULTY DASHBOARD
// ==========================================
async function loadFacultyDashboard() {
  try {
    const stats = await apiCall('/dashboard/stats');

    const totalStudentsEl = document.getElementById('faculty-dash-total-students');
    if (totalStudentsEl) totalStudentsEl.textContent = stats.total_students;

    const avgCgpaEl = document.getElementById('faculty-dash-avg-cgpa');
    if (avgCgpaEl) avgCgpaEl.textContent = stats.average_college_cgpa.toFixed(2);

    const attRateEl = document.getElementById('faculty-dash-att-rate');
    if (attRateEl) attRateEl.textContent = `${stats.overall_attendance_rate}%`;

    const lowAttCountEl = document.getElementById('faculty-dash-low-att-count');
    if (lowAttCountEl) lowAttCountEl.textContent = stats.low_attendance_alerts.length;

    renderFacultyLowAttendance(stats.low_attendance_alerts);
    renderFacultyTopPerformers(stats.top_performers);
    
    // Load subject academic info
    const subjects = await apiCall('/subjects');
    renderFacultySubjectsSummary(subjects);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderFacultyLowAttendance(alerts) {
  const tbody = document.querySelector('#faculty-low-attendance-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--teal-accent)"><i class="fa-solid fa-circle-check"></i> All accessible students have satisfactory attendance (&ge;75%).</td></tr>`;
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
        <button class="btn btn-sm btn-secondary" onclick="viewStudentAttendanceFromFaculty(${a.id})">
          View Log
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFacultyTopPerformers(performers) {
  const tbody = document.querySelector('#faculty-top-performers-table tbody');
  if (!tbody) return;
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

function renderFacultySubjectsSummary(subjects) {
  const tbody = document.querySelector('#faculty-subjects-summary-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (subjects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">No subjects registered.</td></tr>`;
    return;
  }

  subjects.forEach(s => {
    const tr = document.createElement('tr');
    const deptCode = s.department ? s.department.code : 'N/A';
    tr.innerHTML = `
      <td><code>${s.code}</code></td>
      <td style="font-weight:600;">${s.name}</td>
      <td><span class="badge badge-primary">${deptCode}</span></td>
      <td>Semester ${s.semester}</td>
      <td>${s.credits} Credits</td>
    `;
    tbody.appendChild(tr);
  });
}

function viewStudentAttendanceFromFaculty(studentId) {
  const navAtt = document.getElementById('nav-attendance');
  if (navAtt) {
    navAtt.click();
    setTimeout(() => {
      const attSelect = document.getElementById('att-student-select');
      if (attSelect) {
        attSelect.value = studentId;
        attSelect.dispatchEvent(new Event('change'));
      }
    }, 200);
  }
}

// ==========================================
// 7. STUDENT DASHBOARD
// ==========================================
async function loadStudentDashboard() {
  try {
    const data = await apiCall('/students/me/profile');

    document.getElementById('sp-student-name').textContent = data.name;
    document.getElementById('sp-avatar').textContent = (data.name || 'S').charAt(0).toUpperCase();
    const deptCode = data.department ? data.department.code : 'N/A';
    document.getElementById('sp-student-subtext').textContent = `Roll No: ${data.roll_number} | Dept: ${deptCode} | Year ${data.year} (Sec ${data.section})`;

    const summary = data.academic_summary || {};
    const attStats = data.attendance_stats || {};

    document.getElementById('sp-cgpa').textContent = `${(summary.cgpa || 0).toFixed(2)} / 10.0`;
    document.getElementById('sp-percentage').textContent = `${summary.percentage || 0}%`;
    document.getElementById('sp-att-rate').textContent = `${attStats.overall_percentage || 0}%`;
    document.getElementById('sp-status').textContent = summary.status || 'N/A';

    const alertBox = document.getElementById('sp-low-attendance-alert');
    if (alertBox) {
      alertBox.style.display = attStats.is_low_attendance ? 'block' : 'none';
    }

    const pdfBtn = document.getElementById('sp-download-pdf-btn');
    if (pdfBtn) {
      pdfBtn.onclick = () => downloadMyTranscriptPDF();
    }

    const marks = await apiCall(`/marks/students/${data.id}`);
    const attSummary = await apiCall(`/attendance/students/${data.id}`);

    renderStudentPortalMarks(marks);
    renderStudentPortalAttendance(attSummary.subjects || []);

    renderSpGpaChart(summary.semester_performance || {});
    renderSpAttendanceChart(attSummary.subjects || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function downloadMyTranscriptPDF() {
  try {
    showToast('Generating official PDF transcript report...');
    const blob = await apiCall('/reports/me/pdf', 'GET', null, true);

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `My_Transcript_${state.user ? state.user.full_name.replace(/ /g, '_') : 'Report'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    showToast('Transcript downloaded successfully!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 8. STUDENTS MANAGEMENT
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
  if (!tbody) return;
  tbody.innerHTML = '';

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">No matching student records found.</td></tr>`;
    return;
  }

  const isAdmin = state.user && state.user.role === 'admin';

  students.forEach(st => {
    const tr = document.createElement('tr');

    const actionsHtml = isAdmin ? `
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
    ` : `
      <div style="display:flex; gap:0.4rem;">
        <button class="btn btn-sm btn-secondary" onclick="downloadStudentPDF(${st.id})" title="Download PDF Transcript">
          <i class="fa-solid fa-file-pdf" style="color:var(--rose-accent)"></i> Transcript
        </button>
      </div>
    `;

    tr.innerHTML = `
      <td><code>${st.roll_number}</code></td>
      <td style="font-weight:600;">${st.name}</td>
      <td><span class="badge badge-primary">${st.department.code}</span></td>
      <td>${st.course} - Year ${st.year} (${st.section})</td>
      <td>${st.email}</td>
      <td>${st.gender}</td>
      <td><span class="badge badge-success">${st.status}</span></td>
      <td>${actionsHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function openAddStudentModal() {
  if (!state.departments || state.departments.length === 0) {
    await loadDepartmentsAndSubjects(false);
  }
  document.getElementById('student-modal-title').textContent = 'Add New Student';
  document.getElementById('student-form').reset();
  document.getElementById('student-id-input').value = '';
  document.getElementById('student-modal').classList.add('active');
}

async function editStudentModal(id) {
  if (!state.departments || state.departments.length === 0) {
    await loadDepartmentsAndSubjects(false);
  }

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
  document.getElementById('st-department').value = String(student.department_id);
  document.getElementById('st-course').value = student.course;
  document.getElementById('st-year').value = String(student.year);
  document.getElementById('st-section').value = student.section;
  document.getElementById('st-address').value = student.address || '';

  document.getElementById('student-modal').classList.add('active');
}

async function handleSaveStudent(e) {
  e.preventDefault();
  const id = document.getElementById('student-id-input').value;
  const deptVal = document.getElementById('st-department').value;
  if (!deptVal) {
    showToast('Please select a valid department', 'error');
    return;
  }

  const payload = {
    roll_number: document.getElementById('st-roll').value,
    name: document.getElementById('st-name').value,
    dob: document.getElementById('st-dob').value,
    gender: document.getElementById('st-gender').value,
    email: document.getElementById('st-email').value,
    phone: document.getElementById('st-phone').value,
    department_id: parseInt(deptVal),
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
    await loadStudents();
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
// 10. STUDENT PORTAL DASHBOARD
// ==========================================
async function loadStudentPortal() {
  try {
    const data = await apiCall('/students/me/profile');
    
    // Banner info
    document.getElementById('sp-student-name').textContent = data.name;
    document.getElementById('sp-avatar').textContent = (data.name || 'S').charAt(0).toUpperCase();
    const deptCode = data.department ? data.department.code : 'N/A';
    document.getElementById('sp-student-subtext').textContent = `Roll No: ${data.roll_number} | Dept: ${deptCode} | Year ${data.year} (Sec ${data.section})`;
    
    const summary = data.academic_summary || {};
    const attStats = data.attendance_stats || {};

    // Stat Cards
    document.getElementById('sp-cgpa').textContent = `${(summary.cgpa || 0).toFixed(2)} / 10.0`;
    document.getElementById('sp-percentage').textContent = `${summary.percentage || 0}%`;
    document.getElementById('sp-att-rate').textContent = `${attStats.overall_percentage || 0}%`;
    document.getElementById('sp-status').textContent = summary.status || 'N/A';

    // 75% Attendance Warning Alert
    const alertBox = document.getElementById('sp-low-attendance-alert');
    if (attStats.is_low_attendance) {
      alertBox.style.display = 'block';
    } else {
      alertBox.style.display = 'none';
    }

    // PDF Download Button
    const pdfBtn = document.getElementById('sp-download-pdf-btn');
    if (pdfBtn) {
      pdfBtn.onclick = () => downloadStudentPDF(data.id);
    }

    // Fetch student marks & attendance details
    const marks = await apiCall(`/marks/students/${data.id}`);
    const attSummary = await apiCall(`/attendance/students/${data.id}`);

    renderStudentPortalMarks(marks);
    renderStudentPortalAttendance(attSummary.subjects || []);

    // Render Student Analytics Charts
    renderSpGpaChart(summary.semester_performance || {});
    renderSpAttendanceChart(attSummary.subjects || []);

  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderStudentPortalMarks(marks) {
  const tbody = document.querySelector('#sp-marks-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!marks || marks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No marks recorded yet</td></tr>';
    return;
  }
  marks.forEach(m => {
    const tr = document.createElement('tr');
    const code = m.subject ? m.subject.code : `SUBJ-${m.subject_id}`;
    const name = m.subject ? m.subject.name : 'N/A';
    tr.innerHTML = `
      <td><strong>${code}</strong></td>
      <td>${name}</td>
      <td>${m.semester}</td>
      <td>${m.internal_marks} / 30</td>
      <td>${m.external_marks} / 70</td>
      <td><strong>${m.total_marks} / 100</strong></td>
      <td><span class="badge ${m.grade === 'F' ? 'badge-rose' : 'badge-teal'}">${m.grade}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStudentPortalAttendance(subjects) {
  const tbody = document.querySelector('#sp-attendance-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!subjects || subjects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No attendance records found</td></tr>';
    return;
  }
  subjects.forEach(s => {
    const tr = document.createElement('tr');
    const isShortage = s.percentage < 75.0;
    tr.innerHTML = `
      <td><strong>${s.subject_code}</strong></td>
      <td>${s.subject_name}</td>
      <td>${s.total_classes}</td>
      <td>${s.attended}</td>
      <td><strong>${s.percentage}%</strong></td>
      <td><span class="badge ${isShortage ? 'badge-rose' : 'badge-teal'}">${isShortage ? 'Shortage (<75%)' : 'Satisfactory'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSpGpaChart(semPerf) {
  const canvas = document.getElementById('spGpaChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (state.charts.spGpaChart) state.charts.spGpaChart.destroy();

  const labels = Object.keys(semPerf).map(s => `Sem ${s}`);
  const values = Object.values(semPerf).map(d => d.gpa);

  state.charts.spGpaChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['Sem 1'],
      datasets: [{
        label: 'GPA',
        data: values.length > 0 ? values : [0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 10, ticks: { color: '#94a3b8' } },
        x: { ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function renderSpAttendanceChart(subjects) {
  const canvas = document.getElementById('spAttendanceChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (state.charts.spAttendanceChart) state.charts.spAttendanceChart.destroy();

  const labels = subjects.map(s => s.subject_code);
  const values = subjects.map(s => s.percentage);
  const colors = values.map(v => v < 75.0 ? '#f43f5e' : '#10b981');

  state.charts.spAttendanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['No Subjects'],
      datasets: [{
        label: 'Attendance %',
        data: values.length > 0 ? values : [0],
        backgroundColor: colors.length > 0 ? colors : ['#10b981'],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100, ticks: { color: '#94a3b8' } },
        x: { ticks: { color: '#94a3b8' } }
      }
    }
  });
}

// ==========================================
// 11. PDF REPORT CARD DOWNLOAD
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
// 12. EVENT LISTENERS INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  checkAuth();

  // Auth & Login/Register
  initAuthTabs();
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('btn-logout').addEventListener('click', logout);
  
  const fillAdminBtn = document.getElementById('fill-demo-login-btn');
  if (fillAdminBtn) {
    fillAdminBtn.addEventListener('click', () => {
      document.getElementById('login-email').value = 'admin@college.edu';
      document.getElementById('login-password').value = 'admin123';
    });
  }

  const fillFacultyBtn = document.getElementById('fill-demo-faculty-btn');
  if (fillFacultyBtn) {
    fillFacultyBtn.addEventListener('click', () => {
      document.getElementById('login-email').value = 'faculty@college.edu';
      document.getElementById('login-password').value = 'faculty123';
    });
  }

  const fillStudentBtn = document.getElementById('fill-demo-student-btn');
  if (fillStudentBtn) {
    fillStudentBtn.addEventListener('click', () => {
      document.getElementById('login-email').value = 'aarav.sharma@college.edu';
      document.getElementById('login-password').value = 'student123';
    });
  }

  // Modal Closers
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  // Top Action Buttons & Global Search
  const topAddBtn = document.getElementById('top-add-student-btn');
  if (topAddBtn) topAddBtn.addEventListener('click', openAddStudentModal);
  
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
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', loadStudents);
  });

  const resetBtn = document.getElementById('reset-student-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.getElementById('filter-student-dept').value = '';
      document.getElementById('filter-student-year').value = '';
      document.getElementById('filter-student-section').value = '';
      document.getElementById('global-search-input').value = '';
      loadStudents();
    });
  }

  // Forms Submit
  document.getElementById('student-form').addEventListener('submit', handleSaveStudent);
  document.getElementById('mark-form').addEventListener('submit', handleSaveMark);
  document.getElementById('attendance-form').addEventListener('submit', handleSaveAttendance);
  document.getElementById('dept-form').addEventListener('submit', handleSaveDepartment);
  document.getElementById('subject-form').addEventListener('submit', handleSaveSubject);

  // Academics Tab Selector
  const acSelect = document.getElementById('academic-student-select');
  if (acSelect) {
    acSelect.addEventListener('change', (e) => {
      loadStudentMarks(e.target.value);
    });
  }
  const openMarkBtn = document.getElementById('open-add-mark-modal-btn');
  if (openMarkBtn) {
    openMarkBtn.addEventListener('click', () => {
      document.getElementById('mark-modal').classList.add('active');
    });
  }
  const downloadTransBtn = document.getElementById('download-transcript-pdf-btn');
  if (downloadTransBtn) {
    downloadTransBtn.addEventListener('click', () => {
      const studentId = document.getElementById('academic-student-select').value;
      if (studentId) downloadStudentPDF(studentId);
    });
  }

  // Attendance Tab Selector
  const attSelect = document.getElementById('att-student-select');
  if (attSelect) {
    attSelect.addEventListener('change', (e) => {
      loadStudentAttendance(e.target.value);
    });
  }
  const openAttBtn = document.getElementById('open-record-attendance-modal-btn');
  if (openAttBtn) {
    openAttBtn.addEventListener('click', () => {
      document.getElementById('attendance-modal').classList.add('active');
    });
  }

  // Department / Subject Triggers
  const openDeptBtn = document.getElementById('open-add-dept-modal-btn');
  if (openDeptBtn) {
    openDeptBtn.addEventListener('click', () => {
      document.getElementById('dept-modal').classList.add('active');
    });
  }
  const openSubjBtn = document.getElementById('open-add-subject-modal-btn');
  if (openSubjBtn) {
    openSubjBtn.addEventListener('click', () => {
      document.getElementById('subject-modal').classList.add('active');
    });
  }

  // PDF Report Download Trigger
  const genPdfBtn = document.getElementById('generate-pdf-btn');
  if (genPdfBtn) {
    genPdfBtn.addEventListener('click', () => {
      const studentId = document.getElementById('report-student-select').value;
      if (!studentId) {
        showToast('Please select a student from the dropdown list', 'error');
        return;
      }
      downloadStudentPDF(studentId);
    });
  }
});
