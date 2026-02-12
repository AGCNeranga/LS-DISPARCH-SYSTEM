// A G C N Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDxE1d9nCYUTjmipUJ3zPSvtaFwypkk0bI",
  authDomain: "dispatchwebapp-66959.firebaseapp.com",
  databaseURL: "https://dispatchwebapp-66959-default-rtdb.firebaseio.com/",
  projectId: "dispatchwebapp-66959",
  storageBucket: "dispatchwebapp-66959.appspot.com",
  messagingSenderId: "984217204226",
  appId: "1:984217204226:web:ab6efa24a54345fc57d91b",
  measurementId: "G-4N950SN8V9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const users = {
  "admin": { password: "admin123", role: "admin" },
  "raja": { password: "raja123", role: "Assistant Manager" },
  "akila": { password: "akila123", role: "Akila" },
  "uchitha": { password: "uchitha123", role: "Manager" },
  "rohitha": { password: "rohitha123", role: "Rohitha" },
  "charith": { password: "charith123", role: "Editor" }
};

const deadlines = {
  "SPORTS": {
    "1st Section": { ctp: "07:00", dispatch: "02:30", departure: "03:15" },
    "2nd Section": { ctp: "00:00", dispatch: "02:30", departure: "03:15" }
  },
  "Racing UK": {
    "1st Section UK": { ctp: "22:30", dispatch: "01:15", departure: "03:15" },
    "2nd Section UK": { ctp: "23:30", dispatch: "02:00", departure: "03:15" },
    "1st Section RST UK": { ctp: "01:50", dispatch: "02:40", departure: "03:15" },
    "2nd Section RST UK": { ctp: "01:50", dispatch: "02:55", departure: "03:15" }
  },
  "Racing AUS": {
    "AUS Publication": { ctp: "22:30", dispatch: "11:00", departure: "03:15" },
    "AUS RST": { ctp: "21:30", dispatch: "11:00", departure: "03:15" }
  }
};

let currentUser = null;
let records = [];
let filteredRecords = [];

// A G C N Load records from Firebase
db.ref("dispatchRecords").on("value", snapshot => {
  const data = snapshot.val();
  records = data ? Object.keys(data).map(key => ({ ...data[key], key })) : [];
  renderTable();
});

// ---------- A G C N LOGIN ----------
document.getElementById("loginForm").addEventListener("submit", function(e){
  e.preventDefault();
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  if(users[u] && users[u].password === p){
    currentUser = { username: u, role: users[u].role };
    document.getElementById("loginForm").style.display="none";
    document.getElementById("app").style.display="block";
    document.getElementById("currentUser").textContent = u;
    document.getElementById("role").textContent = currentUser.role;
    document.getElementById("adminControls").style.display = currentUser.role === "admin" ? "block" : "none";
    document.getElementById("filters").style.display = currentUser.role === "admin" ? "flex" : "none";
    renderTable();
  } else {
    alert("Invalid credentials");
  }
});

function logout(){
  currentUser = null;
  document.getElementById("app").style.display="none";
  document.getElementById("loginForm").style.display="flex";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

function parseTimeToDate(timeStr, baseDate){
  if(!timeStr) return null;
  let [h,m] = timeStr.split(":");
  let d = new Date(baseDate);
  d.setHours(+h, +m, 0, 0);
  if(+h < 6) d.setDate(d.getDate() + 1);
  return d;
}

function isDelayed(timeStr, deadlineStr, baseDate){
  if(!timeStr || !deadlineStr) return "No";
  const t = parseTimeToDate(timeStr, baseDate);
  const dl = parseTimeToDate(deadlineStr, baseDate);
  return (t > dl) ? "Yes" : "No";
}

// ---------- ADD / UPDATE RECORD ----------
document.getElementById("dispatchForm").addEventListener("submit", function(e){
  e.preventDefault();
  const date = document.getElementById("date").value;
  const dept = document.getElementById("department").value;
  const sec = document.getElementById("section").value;
  const ctp = document.getElementById("pageCTP").value;
  const dispatch = document.getElementById("dispatchReceived").value;
  const departure = document.getElementById("departure").value;
  const departureAll = document.getElementById("departureAll").checked;
  const dl = deadlines[dept] && deadlines[dept][sec] ? deadlines[dept][sec] : {};

  if (departureAll && departure) {
    records.forEach(r => {
      if (r.date === date) {
        if (currentUser.role === "admin" || !r.departure) {
          r.departure = departure;
          r.departureBy = currentUser.username;
          const dlDept = deadlines[r.department] && deadlines[r.department][r.section] ? deadlines[r.department][r.section] : {};
          r.deadlineDeparture = dlDept.departure || "";
          r.delayDeparture = isDelayed(r.departure, r.deadlineDeparture, r.date);
          db.ref("dispatchRecords/" + r.key).set(r);
        }
      }
    });
  } else {
    let existing = records.find(r => r.date === date && r.department === dept && r.section === sec);

    if (existing) {
      if (ctp && (currentUser.role === "admin" || !existing.pageCTP)) {
        existing.pageCTP = ctp;
        existing.ctpBy = currentUser.username;
      }
      if (dispatch && (currentUser.role === "admin" || !existing.dispatchReceived)) {
        existing.dispatchReceived = dispatch;
        existing.dispatchBy = currentUser.username;
      }
      if (departure && (currentUser.role === "admin" || !existing.departure)) {
        existing.departure = departure;
        existing.departureBy = currentUser.username;
      }

      if (document.getElementById("notes").value) existing.notes = document.getElementById("notes").value;

      existing.deadlineCTP = dl.ctp || "";
      existing.deadlineDispatch = dl.dispatch || "";
      existing.deadlineDeparture = dl.departure || "";
      existing.delayCTP = isDelayed(existing.pageCTP, dl.ctp, date);
      existing.delayDispatch = isDelayed(existing.dispatchReceived, dl.dispatch, date);
      existing.delayDeparture = isDelayed(existing.departure, dl.departure, date);

      db.ref("dispatchRecords/" + existing.key).set(existing);

    } else {
      const newRecord = {
        date: date,
        department: dept,
        section: sec,
        pageCTP: ctp || "",
        dispatchReceived: dispatch || "",
        departure: departure || "",
        notes: document.getElementById("notes").value,
        deadlineCTP: dl.ctp || "",
        deadlineDispatch: dl.dispatch || "",
        deadlineDeparture: dl.departure || "",
        delayCTP: isDelayed(ctp, dl.ctp, date),
        delayDispatch: isDelayed(dispatch, dl.dispatch, date),
        delayDeparture: isDelayed(departure, dl.departure, date),
        ctpBy: ctp ? currentUser.username : "",
        dispatchBy: dispatch ? currentUser.username : "",
        departureBy: departure ? currentUser.username : ""
      };
      const newKey = db.ref("dispatchRecords").push().key;
      newRecord.key = newKey;
      db.ref("dispatchRecords/" + newKey).set(newRecord);
    }
  }
  this.reset();
});

// ---------- A G C N TABLE ----------
function renderTable(){
  const tbody = document.querySelector("#dispatchTable tbody");
  tbody.innerHTML = "";
  const data = filteredRecords.length ? filteredRecords : records;
  data.forEach((rec, idx) => {
    const tr = document.createElement("tr");

    // Time normal color for users, blue name for admins
    const pageCTPDisplay = rec.pageCTP 
      ? (currentUser.role === "admin" 
          ? `${rec.pageCTP} <span style="color:blue">(${rec.ctpBy || ""})</span>` 
          : rec.pageCTP)
      : "";

    const dispatchDisplay = rec.dispatchReceived 
      ? (currentUser.role === "admin" 
          ? `${rec.dispatchReceived} <span style="color:blue">(${rec.dispatchBy || ""})</span>` 
          : rec.dispatchReceived)
      : "";

    const departureDisplay = rec.departure 
      ? (currentUser.role === "admin" 
          ? `${rec.departure} <span style="color:blue">(${rec.departureBy || ""})</span>` 
          : rec.departure)
      : "";

    tr.innerHTML = `
      <td>${rec.date}</td>
      <td>${rec.department}</td>
      <td>${rec.section}</td>
      <td>${pageCTPDisplay}</td>
      <td>${dispatchDisplay}</td>
      <td>${departureDisplay}</td>
      <td>${rec.notes}</td>
      <td>${rec.deadlineCTP}</td>
      <td>${rec.deadlineDispatch}</td>
      <td>${rec.deadlineDeparture}</td>
      <td class="${rec.delayCTP==='Yes'?'delayed':''}">${rec.delayCTP}</td>
      <td class="${rec.delayDispatch==='Yes'?'delayed':''}">${rec.delayDispatch}</td>
      <td class="${rec.delayDeparture==='Yes'?'delayed':''}">${rec.delayDeparture}</td>
      <td>${currentUser.role === "admin" ? 
        `CTP: ${rec.ctpBy || ""} | Dispatch: ${rec.dispatchBy || ""} | Departure: ${rec.departureBy || ""}` 
        : ""}</td>
      <td></td>
    `;

    const actionsCell = tr.querySelector("td:last-child");
    if(currentUser.role === "admin"){
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "actionBtn";
      editBtn.onclick = () => editRecord(idx);
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "actionBtn delete";
      delBtn.onclick = () => deleteRecord(idx);
      actionsCell.appendChild(editBtn);
      actionsCell.appendChild(delBtn);
    }

    tbody.appendChild(tr);
  });
}

function editRecord(index){
  const rec = records[index];
  document.getElementById("date").value = rec.date;
  document.getElementById("department").value = rec.department;
  document.getElementById("section").value = rec.section;
  document.getElementById("pageCTP").value = rec.pageCTP;
  document.getElementById("dispatchReceived").value = rec.dispatchReceived;
  document.getElementById("departure").value = rec.departure;
  document.getElementById("notes").value = rec.notes;
}

function deleteRecord(index){
  if(confirm("Delete this record?")){
    const rec = records[index];
    db.ref("dispatchRecords/" + rec.key).remove();
  }
}

function clearAllData(){
  if(confirm("Are you sure you want to clear ALL records?")){
    db.ref("dispatchRecords").remove();
  }
}

document.getElementById("exportExcel").addEventListener("click", function(){
  // Grab the HTML table
  const table = document.getElementById("dispatchTable");
  // Convert table to a worksheet
  const ws = XLSX.utils.table_to_sheet(table, {raw: true});
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dispatch");
  XLSX.writeFile(wb, "dispatch.xlsx");
});

function togglePassword() {
  const pwd = document.getElementById("password");
  if(pwd.type === "password") pwd.type = "text";
  else pwd.type = "password";
}

function applyFilter(){
  const dept = document.getElementById("filterDept").value;
  const sec = document.getElementById("filterSection").value;
  filteredRecords = records.filter(r => {
    return (dept === "" || r.department === dept) &&
           (sec === "" || r.section === sec);
  });
  renderTable();
}

function clearFilter(){
  document.getElementById("filterDept").value = "";
  document.getElementById("filterSection").value = "";
  filteredRecords = [];
  renderTable();
}

