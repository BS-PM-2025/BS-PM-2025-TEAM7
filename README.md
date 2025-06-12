# CI/CD Learning Platform

## Project Overview

The **CI/CD Learning Platform** is an interactive educational tool designed to bridge the gap between theoretical knowledge and practical application of Continuous Integration/Continuous Deployment (CI/CD) methodologies. This platform provides software engineering students with hands-on experience in DevOps environments, simulating real-world workflows using tools like **GitHub** and **Jenkins**.

---

## ✨ Key Features

- **Interactive Learning Modules**: Includes hands-on exercises, quizzes, and video tutorials.  
- **Real-Time Feedback**: Instant feedback on code submissions and quizzes.  
- **Progress Tracking**: Dashboards for students and instructors.  
- **GitHub Sandbox**: Safe environment to practice GitHub workflows.  
- **Certification**: Certificates awarded upon course completion.  
- **Chat Option**: Built-in chat feature for real-time communication between students, lecturers, and admins.

---

## 🎯 Target Audience

- **Students**: Gain practical DevOps skills through guided exercises.  
- **Lecturers**: Monitor student progress and provide feedback.  
- **Admins**: Manage platform content and user roles.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, HTML, CSS  
- **Backend**: Node.js with Express.js  
- **Database**: MongoDB  
- **Version Control**: Git with GitHub  
- **CI/CD Pipeline**: Jenkins, GitHub Actions  
- **Project Management**: Jira

---

## 🚀 Installation and Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/ci-cd-learning-platform.git
   cd ci-cd-learning-platform
Install backend dependencies:
   ```bash
npm insatll node 
npm install express mongoose
npm install crypto
npm install nodemailer
npm insatll openai
```

Set up frontend (React):
npx create-react-app ci-cd-learning-platform
cd ci-cd-learning-platform
Configure MongoDB connection in server.js:

javascript
 ```bash
const mongoose = require(\'mongoose\');
mongoose.connect(\'mongodb://localhost:27017/ci_cd_db\', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log(\'MongoDB connected\'))
  .catch(err => console.log(err));
```
🧰 Development Tools
IDE: Visual Studio Code
Recommended Extensions: ESLint, Prettier, React Developer Tools

Version Control: Git and GitHub


setup the settengs (add .env file to the main folder )  that contain :
 ```bash
GITHUB_CLIENT_ID=Ov23liqmVRU1aVroq3Wj
GITHUB_CLIENT_SECRET=56e0e91efff8f06d572e3beb6767c973c89b0d9b
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/auth/github/callback
EMAIL_USER=bookshopping112@gmail.com
EMAIL_PASS=imsj zdds imys yqea
```


📈 Project Workflow
Agile Methodology: Weekly sprints with daily stand-ups.

Task Tracking: Jira for managing user stories and tasks.

Code Reviews: Pull requests on GitHub with peer reviews.

👥 Team Members:

Mohammed – Product Owner / Developer

Ali Heib– Developer

Mosaab – Developer

Hasan – Developer / Scrum Master

📄 Documentation
For detailed documentation, refer to the SPMP Document.



