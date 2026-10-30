# 📧 Email to SMS Converter (Offline Notifier)

An intelligent email monitoring and notification system that automatically identifies important emails and sends SMS alerts or automated voice calls to notify users about critical messages.

## 🎯 Project Abstract

The **Email to SMS Converter (Offline Notifier)** is a web-based notification system designed to help users avoid missing important emails. The application monitors incoming emails, identifies important messages using keyword-based filtering, and automatically sends notifications to a registered mobile phone.

The system uses Gmail IMAP to retrieve incoming emails and analyzes their subject and content to determine their priority. When an important email is detected, the application sends an SMS containing the email subject, sender information, and a short message preview through an Android phone acting as an SMS gateway. For urgent emails, the system can also initiate an automated voice call using Twilio, provided that the voice-call integration is configured.

The application provides a modern web dashboard built with React and Vite, while Node.js and Express.js manage email processing, notification services, REST APIs, and application settings. Users can view received emails, monitor notification delivery statuses, configure filtering keywords, and review notification logs.

The primary objective is to reduce manual email checking, improve response time, and help users stay informed about assignments, deadlines, interview invitations, system alerts, and other time-sensitive communications.

## ✨ Key Features

- 📩 **Automatic Email Monitoring** – Retrieve incoming emails through Gmail IMAP.
- 🎯 **Priority-Based Filtering** – Identify important emails using configurable keywords.
- 📱 **Automated SMS Notifications** – Send important email alerts through an Android SMS gateway.
- 📞 **Voice Call Alerts** – Trigger automated voice calls for urgent emails using Twilio.
- 📊 **Interactive Dashboard** – View email information, priorities, notification activities, and delivery statuses.
- 📝 **Notification Logs** – Track successful and failed SMS or voice-call attempts.
- ⚙️ **Configurable Settings** – Manage email monitoring, filtering keywords, and notification settings.
- 🔄 **Error Handling** – Record failures and support reconnection attempts where implemented.
- 📱 **Responsive Interface** – Access the dashboard on desktop and mobile browsers.

> Note: Features such as AI-based classification, WhatsApp notifications, and desktop alerts are future enhancements unless separately implemented and configured.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite, HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Email Integration | Gmail IMAP |
| Email Parsing | `imap`, `mailparser` |
| SMS Integration | Android SMS Gateway API |
| Voice Calls | Twilio |
| HTTP Requests | Axios |
| Local Storage | `node-persist` (if used in the current implementation) |
| Development Tools | Visual Studio Code, npm, Git, GitHub |

## ⚙️ System Workflow

1. The backend connects to the Gmail account using IMAP.
2. The application retrieves new incoming emails.
3. The email subject and content are analyzed against configured keywords.
4. The system determines whether the email matches the notification rules.
5. For important emails, the backend sends an SMS request to the Android SMS gateway.
6. For urgent emails, the system can trigger both an SMS and a voice call through Twilio.
7. The dashboard displays email details and notification statuses.
8. Notification attempts and their results are recorded in the logs.

## 🚀 Installation and Setup

### 1. Prerequisites

Install or prepare the following:

- Node.js and npm
- A Gmail account with IMAP access enabled
- A Google App Password, if using Gmail with app-password authentication
- An Android phone with a compatible SMS Gateway application
- SMS Gateway API credentials
- Twilio account credentials, if voice-call functionality is required
- Visual Studio Code or another code editor

### 2. Clone the Repository

```bash
git clone https://github.com/Santhosh636944/Email-to-SMS.git
cd Email-to-SMS
```

### 3. Backend Setup

Open a terminal in the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file using `.env.example` as a reference, if that example file exists.

Configure the environment variables supported by your backend implementation. For example:

```env
PORT=5000

EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_google_app_password

SMS_API_KEY=your_sms_gateway_api_key
SMS_FROM_NUMBER=your_sender_number

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

**Important:**
- Use a Google App Password rather than your regular Gmail password when app-password authentication is configured.
- The SMS and Twilio variable names must match those expected by your source code.
- Configure only the integrations implemented in your application.
- Never upload your `.env` file or API credentials to GitHub.

Start the backend:

```bash
npm start
```

If the project defines a development script, you can alternatively run:

```bash
npm run dev
```

### 4. Frontend Setup

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually:

```text
http://localhost:5173
```

Ensure the backend is running and that the frontend API configuration points to the correct backend address.

### 5. Configuration Checklist

Before testing the complete application, verify that:

- Gmail IMAP access and authentication work.
- The backend starts without errors.
- The SMS Gateway API credentials are valid.
- The Android phone and its SMS gateway application are configured correctly.
- Twilio credentials and calling permissions are configured if voice alerts are enabled.
- The frontend can communicate with the backend.
- Notification logs correctly record the results of each attempt.

## 📡 Backend API Endpoints

The following endpoints are planned or used by the application; confirm the actual routes in the backend source code.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/emails` | Retrieve stored emails |
| POST | `/emails/check` | Check or process emails |
| POST | `/emails/mock` | Create a test email |
| POST | `/send-sms` | Trigger an SMS notification |
| GET | `/logs` | Retrieve notification logs |
| GET | `/settings` | Retrieve application settings |

The frontend may also use additional routes under `/api`, depending on its configuration.

## 🎤 Viva Explanation — Questions and Answers

### Q1. What is the main objective of this project?

**Answer:** The main objective is to monitor incoming emails, identify important messages, and notify users through SMS or automated voice calls. This helps users respond quickly to critical emails without constantly checking their inbox.

### Q2. How does the backend receive emails?

**Answer:** The backend uses the IMAP protocol to access the Gmail inbox. Node.js libraries such as `imap` and `mailparser` can retrieve and parse email information, including the sender, subject, and message body.

### Q3. Why did you choose React and Node.js?

**Answer:** React is used to build the interactive dashboard, while Node.js and Express.js handle backend operations, REST APIs, email processing, and notification requests.

### Q4. How does email filtering work?

**Answer:** The application checks the email subject and body against predefined keywords, such as URGENT, ASSIGNMENT, ALERT, and DEADLINE. When an email matches the configured rules, the system determines whether a notification should be sent.

### Q5. How is an SMS sent?

**Answer:** The backend sends an HTTP request to an SMS Gateway API. The gateway communicates with an Android phone, which uses its mobile network to send the SMS, provided that the phone, application, and gateway service are configured correctly.

### Q6. Why is an Android phone used as an SMS gateway?

**Answer:** An Android phone can send SMS messages using a SIM card and mobile network. This approach can reduce dependence on commercial SMS providers, although gateway services, mobile plans, and API access may involve costs.

### Q7. How are urgent emails handled?

**Answer:** When an email matches the urgent notification rules, the system can send an SMS and initiate an automated voice call through Twilio. Both integrations must be configured and working for this workflow to operate.

### Q8. What happens if the email connection fails?

**Answer:** The application should record the connection error and attempt to reconnect if reconnection logic is implemented. This helps restore email monitoring after temporary network or server problems.

### Q9. What is the purpose of the dashboard?

**Answer:** The dashboard provides a centralized view of incoming emails, priority classifications, notification logs, and delivery statuses. It helps users monitor the application's activities.

### Q10. Why are notification logs important?

**Answer:** Notification logs help identify whether SMS or voice-call attempts succeeded or failed. They also make troubleshooting easier by providing a record of notification activities.

### Q11. What are the limitations of the current system?

**Answer:** Keyword-based filtering may not understand the complete meaning of an email. The system also depends on email connectivity, valid gateway credentials, and a properly configured Android phone or voice-call provider.

### Q12. What are the future enhancements?

**Answer:** Future enhancements include AI-based email classification, WhatsApp notifications, desktop alerts, persistent database integration, configurable notification rules, and automated report generation.

## 🔮 Future Enhancements

- AI-powered email classification and priority prediction
- WhatsApp and desktop notifications
- MongoDB integration for persistent data storage
- Advanced filtering based on sender, category, and deadline
- Notification scheduling and retry mechanisms
- Exportable notification reports
- Enhanced analytics and email-priority statistics

## 👨‍💻 Project Information

**Project:** Email to SMS Converter (Offline Notifier)  
**Frontend:** React.js and Vite  
**Backend:** Node.js and Express.js  
**Email Service:** Gmail IMAP  
**SMS Service:** Android SMS Gateway API  
**Voice Notifications:** Twilio  

**GitHub Repository:**  
https://github.com/Santhosh636944/Email-to-SMS

---

*This project demonstrates email automation, REST API development, web dashboard design, and mobile notification integration.*
