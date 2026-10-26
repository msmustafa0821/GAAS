
# GAAS — Grid-Based Anonymous Attendance System

> A privacy-preserving, real-time classroom attendance system that uses a seating-grid approach instead of biometric identification.

## 📌 Overview

GAAS (Grid-Based Anonymous Attendance System) is a web-based attendance management system designed to make classroom attendance faster, more transparent, and privacy-friendly.

Instead of relying on facial recognition, fingerprints, or other biometric technologies, students claim their assigned position on a classroom seating grid. Teachers can monitor attendance in real time through an interactive classroom dashboard.

The system is designed to reduce manual attendance work while providing teachers with a centralized way to manage live and previous attendance sessions.

---

## 🎯 Problem Statement

Traditional classroom attendance systems can be:

- Time-consuming for teachers
- Dependent on manual record keeping
- Difficult to manage for large classrooms
- Vulnerable to attendance duplication or confusion
- Dependent on privacy-sensitive biometric technologies

GAAS addresses these issues by providing a real-time digital attendance system based on classroom seating positions.

---

## 💡 Proposed Solution

GAAS creates a digital representation of the classroom using rows and benches.

### Student

Students join an active attendance session and claim their assigned grid position, such as:

- `A1`
- `A2`
- `B3`
- `C5`

The claimed position is reflected on the teacher's dashboard in real time.

### Teacher

The teacher can:

- Start an attendance session
- Configure classroom rows and benches
- View the live seating grid
- Monitor present students
- Detect duplicate/collision claims
- Manually manage attendance
- End the current session
- View previous classes and attendance records

---

## ✨ Features

### 👨‍🏫 Teacher Dashboard

- Create and start attendance sessions
- Enter Course ID
- Configure classroom rows and benches
- Generate a unique session
- Monitor attendance in real time
- View total, present, and absent students
- View classroom seating grid
- Handle duplicate seat claims
- Manually mark students as present/absent
- End attendance sessions
- View previous classes

### 👨‍🎓 Student Interface

- Join an active attendance session
- Enter Session ID
- Select/claim a classroom grid position
- Receive attendance status
- Prevent duplicate seat claims through collision detection

### ⚡ Real-Time Updates

The system uses Firebase Firestore to synchronize attendance data between the teacher and student interfaces.

When a student claims a seat, the teacher dashboard can reflect the change without requiring a manual page refresh.

### 🔐 Privacy-Focused Design

GAAS does not depend on:

- Facial recognition
- Fingerprint scanning
- Voice biometrics
- Other biometric identification methods

The system focuses on classroom position-based attendance.

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │       Teacher       │
                    │      Dashboard      │
                    └──────────┬──────────┘
                               │
                               │
                         Firebase
                         Firestore
                               │
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
             ┌─────────────┐       ┌─────────────┐
             │   Student   │       │   Student   │
             │   Browser   │       │   Browser   │
             └─────────────┘       └─────────────┘
````

---

## 🛠️ Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend / Cloud

* Firebase
* Firebase Authentication
* Cloud Firestore

### Development Tools

* Git
* GitHub
* Visual Studio Code

---

## 📂 Project Structure

```text
GAAS/
│
├── .github/
│   └── workflows/
│       └── synexus-enforcer.yml
│
├── .synexus/
│   └── telemetry.json
│
├── scripts/
│   ├── functions/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── package-lock.json
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── serviceAccountKey.json
│   └── setrole.js
│
├── web/
│   ├── firebaseClient.js
│   ├── index.html
│   ├── qr.js
│   ├── student.html
│   ├── style.css
│   ├── teacher.html
│   └── ui.js
│
├── firebase.json
├── firestore.rules
├── package.json
├── package-lock.json
├── Gaas.js
├── Provisionstudent.js
├── Scheduledprudge.js
├── TECH_STACK.md
└── .gitignore
```

> **Security Note:** `serviceAccountKey.json` contains sensitive Firebase credentials and should never be committed to GitHub. It is included in `.gitignore` and should remain local.

---

## 🔄 How GAAS Works

### Step 1 — Teacher Starts a Session

The teacher opens the dashboard and creates a new attendance session.

The teacher provides:

```text
Course ID
Rows
Benches
```

Example:

```text
Course ID: CSE301
Rows: 5
Benches: 6
```

---

### Step 2 — Classroom Grid Is Created

GAAS generates a digital seating arrangement.

Example:

```text
       Bench 1  Bench 2  Bench 3  Bench 4  Bench 5  Bench 6

Row A    A1       A2       A3       A4       A5       A6
Row B    B1       B2       B3       B4       B5       B6
Row C    C1       C2       C3       C4       C5       C6
Row D    D1       D2       D3       D4       D5       D6
Row E    E1       E2       E3       E4       E5       E6
```

---

### Step 3 — Students Join

Students access the student interface and enter the active session information.

They then claim their assigned grid position.

Example:

```text
Student → Session: CSE301-XYZ
Student → Seat: B4
```

---

### Step 4 — Attendance Is Updated

The student's attendance information is stored in Firebase Firestore.

The teacher dashboard listens for changes and updates the classroom grid.

```text
Student
   │
   ▼
Claim Seat
   │
   ▼
Firebase Firestore
   │
   ▼
Teacher Dashboard
   │
   ▼
Real-Time Grid Update
```

---

### Step 5 — Collision Detection

If two students attempt to claim the same grid position, GAAS identifies the collision.

Example:

```text
Student A → A5
Student B → A5
```

The teacher can review the collision and decide whether the student should remain present or be marked absent.

---

### Step 6 — Session Ends

The teacher can end the active session.

The attendance record is then retained as a previous class/session for later reference.

---

## 🔐 Security Considerations

GAAS is designed with privacy and security in mind.

### No Biometrics

The system does not require:

```text
❌ Facial Recognition
❌ Fingerprints
❌ Voice Biometrics
❌ Face Scanning
```

### Firebase Security Rules

Firestore security rules are used to control access to stored attendance data.

### Service Account Protection

Firebase service-account credentials must never be uploaded to GitHub.

The following file should remain private:

```text
scripts/serviceAccountKey.json
```

It is excluded using `.gitignore`.

---

## 🧪 Current Implementation

The current prototype includes:

* Teacher dashboard
* Student interface
* Firebase integration
* Firestore database
* Real-time attendance updates
* Classroom seating grid
* Session management
* Seat collision handling
* Manual attendance management
* Previous class/session handling
* QR-related frontend functionality
* GitHub repository and project structure

---

## 🚧 Future Scope

GAAS can be further improved with additional technologies and automation.

### 📱 NFC-Based Attendance

NFC can be introduced as a future authentication mechanism.

Students could tap their devices at designated classroom points to securely associate themselves with their assigned seating position.

```text
Student Device
      │
      ▼
    NFC
      │
      ▼
Classroom Position
      │
      ▼
Firebase
      │
      ▼
Attendance
```

---

### 📷 QR-Based Session Joining

A QR code can be used to make joining an active session faster.

Instead of manually entering a Session ID:

```text
Scan QR
   ↓
Open Student Interface
   ↓
Join Active Session
```

---

### 📊 Attendance Analytics

Future versions can provide:

* Attendance percentage
* Student attendance history
* Course-wise statistics
* Monthly attendance reports
* Attendance trends
* Exportable reports

---

### 🔔 Automated Notifications

The system could notify students about:

* Low attendance
* Missed classes
* Session availability
* Attendance confirmation

---

### 📱 Progressive Web App

GAAS can be converted into a Progressive Web App (PWA), allowing students and teachers to install it on their devices.

---

## ⚠️ Limitations

The current prototype is primarily designed as a demonstration and proof of concept.

Some advanced physical authentication mechanisms, such as NFC-based verification, are planned for future development.

The current grid-based approach also requires proper classroom seating information and appropriate session management to maintain attendance accuracy.

---

## 🧑‍💻 Development Team

**Project:** Grid-Based Anonymous Attendance System (GAAS)

**Domain:**

* Web Development
* Cloud Computing
* Firebase
* Real-Time Systems
* Privacy-Preserving Technology

---

## 📚 Learning Outcomes

Through this project, we explored:

* Frontend web development
* Firebase integration
* Firestore database design
* Real-time data synchronization
* Authentication
* Git and GitHub
* Git branching and repositories
* Firestore security rules
* JavaScript-based UI development
* Classroom attendance system design
* Privacy-focused system architecture

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/msmustafa0821/GAAS.git
```

### 2. Navigate to the Project

```bash
cd GAAS
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Firebase

Create/configure your Firebase project and connect the web application using the Firebase configuration.

Make sure sensitive credentials are stored locally and are not committed to GitHub.

### 5. Run the Project

Open the web application through your preferred local development server.

For example, using VS Code:

```text
Open the project in Visual Studio Code
→ Open web/index.html
→ Run using a local development server
```

---

## 📌 Project Status

```text
🟢 Prototype / Working Demonstration
```

GAAS currently demonstrates the core concept of a real-time, grid-based classroom attendance system.

Future versions will focus on stronger authentication, improved automation, analytics, and physical classroom integration.

---

## ⭐ Why GAAS?

GAAS aims to make classroom attendance:

```text
Faster
   +
Real-Time
   +
Privacy-Focused
   +
Easy to Manage
   +
Scalable
```

Instead of treating attendance as a simple "present/absent" process, GAAS connects attendance with the classroom's physical seating structure to create a more interactive and manageable system.

---

## 📄 License

This project is developed for educational and hackathon purposes.

You may modify and extend the project for learning and experimentation.

---

## 🙌 Acknowledgements

Built as an engineering/hackathon project with the goal of exploring real-time web applications, Firebase, privacy-preserving attendance, and practical classroom technology.

```
```
