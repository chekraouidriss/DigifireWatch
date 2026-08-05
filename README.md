# DigiFireWatch 🛡️🔥

> **Industrial IoT Fire Watch Tele-Surveillance & Security Supervision Platform**

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)
![IoT Security](https://img.shields.io/badge/IoT%20Security-Hardened-red.svg)
![MQTT](https://img.shields.io/badge/Protocol-MQTTS%2FTLS1.3-orange.svg)

**DigiFireWatch** is an Industrial IoT (IIoT) telemetry platform for monitoring, ingesting, and processing real-time fire safety system events (ECS/SSI) across remote facilities. Built with a **security-first approach**, it secures telemetry streams from serial edge gateways all the way to live monitoring dashboards over untrusted networks.

---

## 📐 System Architecture

```
[ ECS / Fire Panel (SSI) ]
        │  RS232 Serial Data
        ▼
[ Teltonika TRB142 Gateway ]
        │  IPsec VPN Tunnel / FortiGate Firewall
        ▼
[ Mosquitto MQTT Broker ]  — hardened ACLs, non-root
        │  MQTTS (Port 8883) / TLS 1.3
        ▼
[ Node.js / Express REST API & Ingestion Engine ]
        │
        ├──► [ SQLite / PostgreSQL Database ]  — prepared statements
        │
        └──► [ WSS / WebSockets Stream ] ──► [ Real-Time Dashboard ]
```

---

## 🔒 Security & Hardening Features

DigiFireWatch implements multi-layered security across the network, transport, application, and identity boundaries:

### 1. Network & Edge Isolation
- **Site-to-Site IPsec VPN Tunnels** — all cellular IoT gateway traffic is encapsulated and routed via encrypted IPsec tunnels.
- **FortiGate Firewall Policies** — strict network segmentation isolates edge telemetry traffic from general network segments.

### 2. IoT Protocol & Transport Hardening
- **Mosquitto MQTT Broker Hardening**
  - Anonymous authentication explicitly disabled.
  - Fine-grained Access Control Lists (ACLs) per client ID / topic.
  - Runs under an isolated, unprivileged system user (non-root).
- **MQTTS Transport Security** — encrypted telemetry transit over port 8883, enforcing TLS 1.3.
- **Secure WebSockets (WSS)** — encrypted real-time event streaming to the web dashboard.

### 3. Identity, Access Management (IAM) & AppSec
- **Authentication & Authorization** — JWT (JSON Web Tokens) paired with Role-Based Access Control (RBAC): Client / Admin / Technicien.
- **Credential Protection** — Bcrypt hashing with a tuned cost factor for password storage.
- **Vulnerability Mitigation** — parameterized queries/prepared statements against SQL Injection, input sanitization against XSS, and CSRF protections.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Backend / Engine | Node.js, Express.js |
| IoT Protocols | MQTT / MQTTS (Mosquitto), RS232 Serial |
| Databases | SQLite / PostgreSQL (automated migrations & seeding) |
| Real-Time Streaming | WebSockets (WSS) |
| Hardware Gateways | Teltonika TRB142 Cellular IoT Gateways |
| Network & Security | IPsec VPN, FortiGate Firewall, TLS 1.3, Bcrypt, JWT |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js v18 or higher
- Mosquitto MQTT Broker (configured with TLS certificates)
- Git

### 2. Installation

```bash
git clone https://github.com/chekraouidriss/DigiFireWatch.git
cd DigiFireWatch
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
PORT=3000
DB_PATH=./data/digifirewatch.db
JWT_SECRET=your_super_secret_jwt_key
MQTT_BROKER_URL=mqtts://127.0.0.1:8883
```

### 4. Database Setup & Seeding

```bash
node scripts/seed.js
```

### 5. Running the Application

```bash
npm start
```

---

---

## 👤 Author

**Driss Chekraoui**
Cybersecurity Engineering Student @ ENSA Agadir

- 🐙 GitHub: [@chekraouidriss](https://github.com/chekraouidriss)
- 💼 LinkedIn: [Driss Chekraoui](https://www.linkedin.com/in/driss-chekraoui-02701025b/)

---

