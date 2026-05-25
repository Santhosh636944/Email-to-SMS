# Email to SMS Converter (Offline Notifier)

## 🎯 Project Abstract
The **Email to SMS Converter** is an automated notification system designed to bridge the gap between email communication and mobile alerts. Many times, critical emails (like urgent assignments, system alerts, or important notices) go unnoticed because users are away from their computers or do not have active internet access on their mobile devices. This project solves this problem by continuously monitoring an email inbox (via IMAP) and sending SMS alerts to a designated mobile phone when an email matching specific criteria arrives. The system uses a modern web dashboard built with React and a robust Node.js backend to manage settings, view logs, and configure intelligent filters. A mobile phone running an SMS Gateway application is used to dispatch the offline SMS texts asynchronously.

## 🚀 Setup Instructions

### 1. Prerequisites
- Node.js (v16 or higher)
- Gmail account (with App Passwords enabled)
- An Android phone with an SMS Gateway app (e.g., httpSMS) installed to act as the sender.

### 2. Backend Setup
1. Open the `/backend` folder in your terminal.
2. Run `npm install` to install dependencies.
3. Rename the `.env.example` file to `.env` and fill in your details:
   - `EMAIL_USER`: Your Gmail address.
   - `EMAIL_PASSWORD`: Your 16-character Google App Password.
   - `SMS_API_KEY`: Your API key from the SMS Gateway (e.g. httpsms.com).
   - `SMS_FROM_NUMBER`: Your Android phone's number (+123...).
4. Start the server using: `npm start` (or `npm run dev` for auto-restarts).

### 3. Frontend Setup
1. Open the `/frontend` folder in a new terminal window.
2. Run `npm install` to install the UI dependencies.
3. Start the Vite development server using: `npm run dev`.
4. Open the displayed URL (usually `http://localhost:5173`) in your browser to access the dashboard.

---

## 🎤 Viva Explanation (Q&A)

**Q1: What is the main objective of this project?**
**A1:** The objective is to monitor an email inbox for specific high-priority emails and instantly forward an alert via offline SMS to a user's mobile phone, ensuring they do not miss critical updates simply because they lack internet access at the moment.

**Q2: How does the backend receive emails?**
**A2:** The backend uses the `imap` and `mailparser` libraries in Node.js to connect directly to the Gmail server via the IMAP protocol. Instead of polling aggressively, it listens for incoming email events in real-time and fetches only new, unseen messages.

**Q3: Why not just use Firebase or a database like MongoDB?**
**A3:** To keep the system lightweight and beginner-friendly, we opted for local JSON storage using `node-persist`. It seamlessly handles storing settings, email cache, and SMS logs directly on the file system without the overhead of maintaining a separate database daemon.

**Q4: How does the smart filtering work?**
**A4:** The user can configure specific 'keywords' (e.g., URGENT, ASSIGNMENT, ERROR) via the Settings UI. When a new email arrives, the backend scans the subject and text body. It only triggers the SMS gateway API if a match with one of the predefined keywords is found.

**Q5: How is the SMS actually sent to the phone?**
**A5:** Instead of using expensive commercial providers like Twilio, this system interacts via an HTTP API (using `axios`) with a Gateway service (like httpSMS). The Gateway pushes the message instruction to an app installed on a dedicated Android phone, which then uses the local carrier network to send the actual SMS text.

**Q6: What happens if the internet connection drops on the server?**
**A6:** The backend is designed with auto-reconnection logic. If the IMAP connection drops due to a network error, it will log the failure, wait for a short duration, and attempt to reconnect to the mail server automatically.

**Q7: How did you design the user interface?**
**A7:** The frontend is a Single Page Application built utilizing React and Vite. It heavily relies on dark-themed, modern CSS logic with CSS variables for responsive styling and consistent component design. We utilized Axios to perform asynchronous data-fetching from our Node.js API to populate the dashboards securely.
